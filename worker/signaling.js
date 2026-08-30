const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code(){let s='';for(let i=0;i<6;i++)s+=alphabet[Math.floor(Math.random()*alphabet.length)];return s;}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'}})}

export class Room {
  constructor(state){this.state=state;}
  async fetch(req){
    const url=new URL(req.url); const initialized=await this.state.storage.get('initialized');
    if(req.method==='POST'&&url.pathname==='/create'){
      await this.state.storage.put({initialized:true,created:Date.now(),seq:0,messages:[]});return json({ok:true});
    }
    if(!initialized)return json({error:'ROOM_NOT_FOUND'},404);
    if(req.method==='POST'&&url.pathname==='/signal'){
      const message=await req.json();let seq=(await this.state.storage.get('seq'))||0;let messages=(await this.state.storage.get('messages'))||[];
      seq++;messages.push({...message,id:seq,at:Date.now()});if(messages.length>200)messages=messages.slice(-100);
      await this.state.storage.put({seq,messages});return json({ok:true,cursor:seq});
    }
    if(req.method==='GET'&&url.pathname==='/signals'){
      const after=Number(url.searchParams.get('after')||0);const seq=(await this.state.storage.get('seq'))||0;const messages=(await this.state.storage.get('messages'))||[];
      return json({cursor:seq,messages:messages.filter(m=>m.id>after)});
    }
    return json({error:'NOT_FOUND'},404);
  }
}

export default {
 async fetch(req,env){
  if(req.method==='OPTIONS')return json({ok:true});
  const url=new URL(req.url);const p=url.pathname.split('/').filter(Boolean);
  if(req.method==='POST'&&url.pathname==='/room/create'){
    const c=code();const stub=env.ROOMS.get(env.ROOMS.idFromName(c));await stub.fetch('https://room/create',{method:'POST'});return json({code:c});
  }
  if(p[0]==='room'&&p[1]&&p[2]){
    const stub=env.ROOMS.get(env.ROOMS.idFromName(p[1].toUpperCase()));const target=new URL(req.url);target.pathname=`/${p[2]}`;
    const forwarded=new Request(target.toString(),req);const res=await stub.fetch(forwarded);const out=new Response(res.body,res);out.headers.set('access-control-allow-origin','*');out.headers.set('access-control-allow-headers','content-type');out.headers.set('access-control-allow-methods','GET,POST,OPTIONS');return out;
  }
  return json({name:'OpenCrew signaling',status:'ok'});
 }
};
