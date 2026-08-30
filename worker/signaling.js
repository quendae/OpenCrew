const rooms = new Map();
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code(){let s='';for(let i=0;i<6;i++)s+=alphabet[Math.floor(Math.random()*alphabet.length)];return s;}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'}})}
export default {
 async fetch(req){
  if(req.method==='OPTIONS')return json({ok:true});
  const url=new URL(req.url); const p=url.pathname.split('/').filter(Boolean);
  if(req.method==='POST'&&url.pathname==='/room/create'){
    let c;do{c=code()}while(rooms.has(c));rooms.set(c,{created:Date.now(),messages:[],seq:0});return json({code:c});
  }
  if(p[0]==='room'&&p[2]==='signal'&&req.method==='POST'){
    const room=rooms.get(p[1]);if(!room)return json({error:'ROOM_NOT_FOUND'},404);const m=await req.json();room.messages.push({...m,id:++room.seq,at:Date.now()});if(room.messages.length>200)room.messages.splice(0,100);return json({ok:true,cursor:room.seq});
  }
  if(p[0]==='room'&&p[2]==='signals'&&req.method==='GET'){
    const room=rooms.get(p[1]);if(!room)return json({error:'ROOM_NOT_FOUND'},404);const after=Number(url.searchParams.get('after')||0);return json({cursor:room.seq,messages:room.messages.filter(m=>m.id>after)});
  }
  return json({name:'OpenCrew signaling',status:'ok'});
 }
};
