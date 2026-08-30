import { stateForSeat } from './game.js';

const DEFAULT_SIGNAL = localStorage.getItem('opencrew.signal') || 'http://localhost:8787';

export class Multiplayer {
  constructor({onState,onLobby,onError}={}) {
    this.role=null; this.room=''; this.localSeat=0; this.localName='Player'; this.clientId=crypto.randomUUID();
    this.peers=new Map(); this.names=[]; this.botSeats={}; this.seatCount=4; this.revision=0; this.lastRevision=0;
    this.onState=onState||(()=>{}); this.onLobby=onLobby||(()=>{}); this.onError=onError||console.error;
    this.signalUrl=DEFAULT_SIGNAL; this.pollTimer=null; this.game=null; this.execute=null;
  }
  configureSeatCount(count){this.seatCount=Math.max(2,Math.min(5,Number(count)||4));if(this.role==='host'){this.emitLobby();this.broadcastLobby();}}
  async request(path, body) {
    const res=await fetch(`${this.signalUrl}${path}`,{method:body?'POST':'GET',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
    if(!res.ok) throw new Error(`Signaling ${res.status}`); return res.json();
  }
  async createRoom(name='Host') {
    this.localName=name; const r=await this.request('/room/create',{name}); this.role='host'; this.room=r.code; this.localSeat=0; this.names[0]=name; this.startPolling(); this.emitLobby(); return r.code;
  }
  async joinRoom(code,name='Guest') {
    this.role='guest'; this.room=code.toUpperCase(); this.localName=name;
    const pc=this.makePeer('host'); const dc=pc.createDataChannel('game',{ordered:true}); this.bindChannel('host',dc);
    const offer=await pc.createOffer(); await pc.setLocalDescription(offer);
    await this.request(`/room/${this.room}/signal`,{from:this.clientId,name,type:'offer',sdp:offer.sdp}); this.startPolling(); return code;
  }
  makePeer(key) {
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    this.peers.set(key,{pc,dc:null,seat:null,name:null});
    pc.onicecandidate=e=>{if(e.candidate)this.request(`/room/${this.room}/signal`,{from:this.clientId,type:'ice',to:key,candidate:e.candidate}).catch(this.onError)};
    pc.ondatachannel=e=>this.bindChannel(key,e.channel);
    return pc;
  }
  bindChannel(key,dc){
    const p=this.peers.get(key)||{pc:null,seat:null,name:null};p.dc=dc;this.peers.set(key,p);
    dc.onopen=()=>{if(this.role==='guest')this.send(key,{type:'hello',name:this.localName});this.emitLobby();if(this.role==='host')this.broadcastLobby();};
    dc.onmessage=e=>{try{this.handle(key,JSON.parse(e.data));}catch(err){this.onError(err)}};
    dc.onclose=()=>{this.emitLobby();if(this.role==='host')this.broadcastLobby();};
  }
  send(key,msg){const dc=this.peers.get(key)?.dc;if(dc?.readyState==='open')dc.send(JSON.stringify(msg));}
  broadcast(msg){for(const k of this.peers.keys())this.send(k,msg);}
  startPolling(){clearInterval(this.pollTimer);let cursor=0;this.pollTimer=setInterval(async()=>{try{const r=await this.request(`/room/${this.room}/signals?after=${cursor}`);cursor=r.cursor||cursor;for(const m of r.messages||[])await this.handleSignal(m);}catch(e){this.onError(e)}},800)}
  async handleSignal(m){
    if(m.from===this.clientId)return;
    if(this.role==='host'&&m.type==='offer'){
      const key=m.from||crypto.randomUUID(); if(this.peers.has(key))return;
      const seat=this.nextSeat();if(seat===null)return;
      const pc=this.makePeer(key); const peer=this.peers.get(key); peer.seat=seat;peer.name=m.name||`Player ${seat+1}`;
      await pc.setRemoteDescription({type:'offer',sdp:m.sdp}); const ans=await pc.createAnswer();await pc.setLocalDescription(ans);
      await this.request(`/room/${this.room}/signal`,{from:this.clientId,to:key,type:'answer',sdp:ans.sdp});
    } else if(this.role==='guest'&&m.type==='answer'&&(!m.to||m.to===this.clientId)){
      await this.peers.get('host')?.pc?.setRemoteDescription({type:'answer',sdp:m.sdp});
    } else if(m.type==='ice'&&m.candidate){
      if(this.role==='guest'){
        if(m.to&&m.to!==this.clientId)return;
        try{await this.peers.get('host')?.pc?.addIceCandidate(m.candidate)}catch{}
      } else {
        if(m.to&&m.to!=='host'&&m.to!==this.clientId)return;
        try{await this.peers.get(m.from)?.pc?.addIceCandidate(m.candidate)}catch{}
      }
    }
  }
  nextSeat(){for(let i=1;i<this.seatCount;i++)if(![...this.peers.values()].some(p=>p.seat===i&&p.dc?.readyState!=='closed')&&!this.botSeats[i])return i;return null;}
  connectedSeats(){return [...this.peers.values()].filter(p=>Number.isInteger(p.seat)&&p.dc?.readyState==='open').map(p=>p.seat);}
  lobbyPayload(){return {type:'lobby',names:[...this.names],botSeats:{...this.botSeats},seatCount:this.seatCount,connectedSeats:this.connectedSeats()};}
  emitLobby(){this.onLobby({role:this.role,room:this.room,names:[...this.names],botSeats:{...this.botSeats},localSeat:this.localSeat,seatCount:this.seatCount,connected:this.connectedSeats().length,connectedSeats:this.connectedSeats()});}
  broadcastLobby(){if(this.role==='host')this.broadcast(this.lobbyPayload());}
  setBot(seat,difficulty='normal'){
    if(this.role!=='host'||seat<=0||seat>=this.seatCount)return false;
    if(this.connectedSeats().includes(seat))return false;
    if(difficulty)this.botSeats[seat]=difficulty; else delete this.botSeats[seat];
    this.emitLobby();this.broadcastLobby();return true;
  }
  attachGame(game,execute){this.game=game;this.execute=execute;this.revision=0;this.lastRevision=0;}
  sync(){
    if(this.role!=='host'||!this.game)return;
    const revision=++this.revision;
    for(const [key,p] of this.peers)if(Number.isInteger(p.seat))this.send(key,{type:'state',revision,state:stateForSeat(this.game,p.seat)});
  }
  action(action,payload={}){if(this.role==='host')return this.execute?.(this.localSeat,action,payload);this.send('host',{type:'action',action,payload});return true;}
  handle(key,msg){
    if(msg.type==='welcome'){
      this.localSeat=msg.seat;this.names=msg.names||[];this.botSeats=msg.botSeats||{};this.seatCount=msg.seatCount||this.seatCount;this.emitLobby();
    }
    if(msg.type==='lobby'){
      this.names=msg.names||this.names;this.botSeats=msg.botSeats||{};this.seatCount=msg.seatCount||this.seatCount;
      this.onLobby({role:this.role,room:this.room,names:[...this.names],botSeats:{...this.botSeats},localSeat:this.localSeat,seatCount:this.seatCount,connected:(msg.connectedSeats||[]).length,connectedSeats:msg.connectedSeats||[]});
    }
    if(msg.type==='state'&&this.role==='guest'){
      if((msg.revision||0)<=this.lastRevision)return;this.lastRevision=msg.revision||this.lastRevision+1;this.onState(msg.state);
    }
    if(msg.type==='action'&&this.role==='host'){
      const p=this.peers.get(key);if(!Number.isInteger(p?.seat))return;this.execute?.(p.seat,msg.action,msg.payload);
    }
    if(msg.type==='hello'&&this.role==='host'){
      const p=this.peers.get(key);if(!p||!Number.isInteger(p.seat))return;p.name=msg.name||p.name||`Player ${p.seat+1}`;this.names[p.seat]=p.name;
      this.send(key,{type:'welcome',seat:p.seat,names:this.names,botSeats:this.botSeats,seatCount:this.seatCount});this.broadcastLobby();this.emitLobby();
    }
  }
}
