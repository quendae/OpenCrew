import { stateForSeat } from './game.js';

const DEFAULT_SIGNAL = localStorage.getItem('opencrew.signal') || 'http://localhost:8787';

export class Multiplayer {
  constructor({onState,onLobby,onError}={}) {
    this.role=null; this.room=''; this.localSeat=0; this.localName='Player'; this.peers=new Map(); this.names=[]; this.botSeats={}; this.revision=0;
    this.onState=onState||(()=>{}); this.onLobby=onLobby||(()=>{}); this.onError=onError||console.error;
    this.signalUrl=DEFAULT_SIGNAL; this.pollTimer=null; this.game=null; this.execute=null;
  }
  async request(path, body) {
    const res=await fetch(`${this.signalUrl}${path}`,{method:body?'POST':'GET',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
    if(!res.ok) throw new Error(`Signaling ${res.status}`); return res.json();
  }
  async createRoom(name='Host') {
    this.localName=name; const r=await this.request('/room/create',{name}); this.role='host'; this.room=r.code; this.localSeat=0; this.names[0]=name; this.startPolling('host'); this.emitLobby(); return r.code;
  }
  async joinRoom(code,name='Guest') {
    this.role='guest'; this.room=code.toUpperCase(); this.localName=name;
    const pc=this.makePeer('host'); const dc=pc.createDataChannel('game',{ordered:true}); this.bindChannel('host',dc);
    const offer=await pc.createOffer(); await pc.setLocalDescription(offer);
    await this.request(`/room/${this.room}/signal`,{from:name,type:'offer',sdp:offer.sdp}); this.startPolling(name); return code;
  }
  makePeer(key) {
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    this.peers.set(key,{pc,dc:null,seat:null});
    pc.onicecandidate=e=>{if(e.candidate)this.request(`/room/${this.room}/signal`,{from:this.localName,type:'ice',to:key,candidate:e.candidate}).catch(this.onError)};
    pc.ondatachannel=e=>this.bindChannel(key,e.channel);
    return pc;
  }
  bindChannel(key,dc){const p=this.peers.get(key)||{pc:null};p.dc=dc;this.peers.set(key,p);dc.onopen=()=>{if(this.role==='guest')this.send(key,{type:'hello',name:this.localName});this.emitLobby()};dc.onmessage=e=>this.handle(key,JSON.parse(e.data));dc.onclose=()=>this.emitLobby();}
  send(key,msg){const dc=this.peers.get(key)?.dc;if(dc?.readyState==='open')dc.send(JSON.stringify(msg));}
  broadcast(msg){for(const k of this.peers.keys())this.send(k,msg);}
  startPolling(identity){clearInterval(this.pollTimer);let cursor=0;this.pollTimer=setInterval(async()=>{try{const r=await this.request(`/room/${this.room}/signals?after=${cursor}`);cursor=r.cursor||cursor;for(const m of r.messages||[])await this.handleSignal(m,identity);}catch(e){this.onError(e)}},900)}
  async handleSignal(m,identity){
    if(this.role==='host'&&m.type==='offer'){
      const key=m.from||crypto.randomUUID(); if(this.peers.has(key))return; const pc=this.makePeer(key); const peer=this.peers.get(key); peer.seat=this.nextSeat(); if(peer.seat===null)return;
      await pc.setRemoteDescription({type:'offer',sdp:m.sdp}); const ans=await pc.createAnswer();await pc.setLocalDescription(ans);await this.request(`/room/${this.room}/signal`,{from:'host',to:key,type:'answer',sdp:ans.sdp});
    } else if(this.role==='guest'&&m.type==='answer'&&(!m.to||m.to===identity)){await this.peers.get('host')?.pc?.setRemoteDescription({type:'answer',sdp:m.sdp});}
    else if(m.type==='ice'&&m.candidate){const target=this.role==='guest'?this.peers.get('host'):this.peers.get(m.from);try{await target?.pc?.addIceCandidate(m.candidate)}catch{}}
  }
  nextSeat(){for(let i=1;i<5;i++)if(![...this.peers.values()].some(p=>p.seat===i)&&!this.botSeats[i])return i;return null;}
  emitLobby(){this.onLobby({role:this.role,room:this.room,names:[...this.names],botSeats:{...this.botSeats},localSeat:this.localSeat,connected:[...this.peers.values()].filter(p=>p.dc?.readyState==='open').length});}
  setBot(seat,difficulty='normal'){if(this.role!=='host')return; if(difficulty)this.botSeats[seat]=difficulty; else delete this.botSeats[seat]; this.emitLobby();this.broadcast({type:'lobby',names:this.names,botSeats:this.botSeats});}
  attachGame(game,execute){this.game=game;this.execute=execute;this.revision=0;}
  sync(){if(this.role!=='host'||!this.game)return;for(const [key,p] of this.peers){if(Number.isInteger(p.seat))this.send(key,{type:'state',revision:++this.revision,state:stateForSeat(this.game,p.seat)});}}
  action(action,payload={}){if(this.role==='host')return this.execute?.(this.localSeat,action,payload);this.send('host',{type:'action',action,payload});return true;}
  handle(key,msg){
    if(msg.type==='welcome'){this.localSeat=msg.seat;this.names=msg.names||[];this.botSeats=msg.botSeats||{};this.emitLobby();}
    if(msg.type==='lobby'){this.names=msg.names||this.names;this.botSeats=msg.botSeats||{};this.emitLobby();}
    if(msg.type==='state'&&this.role==='guest'){this.onState(msg.state);}
    if(msg.type==='action'&&this.role==='host'){const p=this.peers.get(key);if(!Number.isInteger(p?.seat))return;const ok=this.execute?.(p.seat,msg.action,msg.payload);if(ok!==false)this.sync();}
    if(msg.type==='hello'&&this.role==='host'){const p=this.peers.get(key);this.names[p.seat]=msg.name||`Player ${p.seat+1}`;this.send(key,{type:'welcome',seat:p.seat,names:this.names,botSeats:this.botSeats});this.broadcast({type:'lobby',names:this.names,botSeats:this.botSeats});this.emitLobby();}
  }
}
