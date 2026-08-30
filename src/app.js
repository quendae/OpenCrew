import { assignTask, communicate, communicationOptions, createGame, legalCards, playCard } from './game.js';
import { CAMPAIGNS, missionFor, ruleNotes, taskLabel } from './missions.js';
import { chooseBotCard, chooseBotCommunication, chooseBotTask } from './bot.js';
import { Multiplayer } from './multiplayer.js';

const app=document.querySelector('#app');
let campaign='orbital', missionNo=1, playerCount=4, game=null, multiplayer=null, lobbyState=null;
let bots=new Set([1,2,3]);
let recordedWin=null;

function el(tag,attrs={},children=[]){const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(v==null)continue;if(k==='class')n.className=v;else if(k==='html')n.innerHTML=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2).toLowerCase(),v);else if(k==='selected')n.selected=!!v;else if(k==='disabled')n.disabled=!!v;else n.setAttribute(k,v)};for(const c of [].concat(children))n.append(c?.nodeType?c:document.createTextNode(c??''));return n;}
const cap=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';
function localSeat(){return multiplayer?.role==='guest'?multiplayer.localSeat:0;}
function seatName(seat){if(game?.relaySeat===seat)return 'Relay Drone';return multiplayer?.names?.[seat]||lobbyState?.names?.[seat]||(seat===localSeat()?'You':`Crew ${seat+1}`);}
function progressFor(id){return Number(localStorage.getItem(`opencrew.progress.${id}`)||0);}
function recordProgress(){if(!game||game.status!=='won'||recordedWin===game.mission.id)return;recordedWin=game.mission.id;const key=`opencrew.progress.${game.mode}`;localStorage.setItem(key,String(Math.max(Number(localStorage.getItem(key)||0),game.mission.number)));}

function execute(seat,action,payload={}){
  if(!game)return false;
  let result={ok:false};
  if(action==='play-card')result=playCard(game,seat,payload.cardId);
  if(action==='assign-task')result=assignTask(game,seat,payload.taskId);
  if(action==='communicate')result=communicate(game,seat,payload.cardId,payload.position);
  if(!result?.ok)return false;
  recordProgress();renderGame();
  if(multiplayer?.role==='host')multiplayer.sync();
  setTimeout(runBots,260);
  return true;
}

function campaignScreen(){
  app.innerHTML='';
  const cards=Object.values(CAMPAIGNS).map(c=>{
    const progress=progressFor(c.id);
    return el('button',{class:`campaign-card ${c.id}`,onclick:()=>{campaign=c.id;missionNo=Math.min(Math.max(1,progress+1),c.missionCount);setupScreen();}},[
      el('span',{class:'eyebrow'},c.subtitle),el('strong',{},c.name),el('p',{},c.flavor),el('small',{},c.philosophy),
      el('div',{class:'campaign-progress'},progress?`${progress}/${c.missionCount} cleared`:`${c.missionCount} original operations`)
    ]);
  });
  app.append(el('main',{class:'menu-shell'},[
    el('header',{class:'brand'},[el('span',{class:'eyebrow'},'COOPERATIVE TRICK-TAKING'),el('h1',{},'OPENCREW'),el('p',{},'Three original expeditions built around shared trick-taking, constrained signals and mission objectives.')]),
    el('section',{class:'campaign-grid'},cards)
  ]));
}

function setupScreen(){
  const c=CAMPAIGNS[campaign];app.innerHTML='';
  app.append(el('main',{class:`setup ${campaign}`},[
    el('button',{class:'back',onclick:campaignScreen},'← Expeditions'),
    el('div',{class:'setup-card'},[
      el('span',{class:'eyebrow'},c.subtitle),el('h1',{},c.name),el('p',{},c.flavor),el('p',{class:'setup-philosophy'},c.philosophy),
      el('label',{},['Operation ',el('input',{type:'number',min:'1',max:String(c.missionCount),value:String(missionNo),onchange:e=>missionNo=Math.max(1,Math.min(c.missionCount,+e.target.value||1))})]),
      el('label',{},['Crew slots ',el('select',{onchange:e=>{playerCount=+e.target.value;bots=new Set(Array.from({length:Math.max(2,playerCount)-1},(_,i)=>i+1))}},[2,3,4,5].map(n=>el('option',{value:n,selected:n===playerCount},n===2?'2 + Relay Drone':String(n))))]),
      playerCount===2?el('div',{class:'relay-note'},'Two-slot mode adds a public Relay Drone as a third active trick-taking seat. The host AI controls it; both humans can see its hand.'):null,
      el('button',{class:'primary',onclick:startLocal},'Start with bots'),
      el('button',{class:'secondary',onclick:multiplayerScreen},'Private multiplayer')
    ])
  ]));
}

function startLocal(){
  multiplayer=null;recordedWin=null;
  game=createGame({playerCount,mode:campaign,mission:missionFor(campaign,missionNo,playerCount)});
  bots=new Set(Array.from({length:game.playerCount-1},(_,i)=>i+1));
  renderGame();setTimeout(runBots,260);
}

function initMP(){
  multiplayer=new Multiplayer({onState:s=>{game=s;campaign=s.mode;missionNo=s.mission?.number||missionNo;recordProgress();renderGame()},onLobby:s=>{lobbyState=s;renderLobby()},onError:e=>console.warn(e)});
  multiplayer.configureSeatCount?.(playerCount);
}

function multiplayerScreen(){
  initMP();lobbyState=null;app.innerHTML='';
  const name=el('input',{placeholder:'Your name',value:localStorage.getItem('opencrew.name')||'Player'});
  const code=el('input',{placeholder:'ROOM CODE',maxlength:'6'});
  const signal=el('input',{placeholder:'Signaling URL',value:localStorage.getItem('opencrew.signal')||'http://localhost:8787'});
  app.append(el('main',{class:`setup ${campaign}`},[
    el('button',{class:'back',onclick:setupScreen},'← Back'),
    el('div',{class:'setup-card'},[
      el('span',{class:'eyebrow'},'PRIVATE WEBRTC CREW'),el('h1',{},'Multiplayer'),
      el('p',{},'The host owns the simulation. Guests send actions only; private hands and the deterministic shuffle seed never leave the host.'),
      el('label',{},['Name ',name]),el('label',{},['Signal ',signal]),
      el('button',{class:'primary',onclick:async()=>{localStorage.setItem('opencrew.name',name.value);localStorage.setItem('opencrew.signal',signal.value);multiplayer.signalUrl=signal.value;multiplayer.configureSeatCount?.(playerCount);await multiplayer.createRoom(name.value||'Host');}},'Create room'),
      el('label',{},['Code ',code]),
      el('button',{class:'secondary',onclick:async()=>{localStorage.setItem('opencrew.name',name.value);localStorage.setItem('opencrew.signal',signal.value);multiplayer.signalUrl=signal.value;await multiplayer.joinRoom(code.value,name.value||'Guest');}},'Join room')
    ])
  ]));
}

function renderLobby(){
  if(!lobbyState)return;const s=lobbyState;app.innerHTML='';const seats=[];
  const connected=new Set(s.connectedSeats||[]);
  for(let i=0;i<playerCount;i++){
    const isHost=i===0&&s.role==='host';
    const human=isHost?s.names[0]:(connected.has(i)?s.names[i]:null);
    const bot=s.botSeats[i];
    const controls=[];
    if(s.role==='host'&&i>0&&!human){
      if(bot){
        controls.push(el('select',{class:'bot-level',onchange:e=>multiplayer.setBot(i,e.target.value)},['easy','normal','hard','expert'].map(d=>el('option',{value:d,selected:d===bot},cap(d)))));
        controls.push(el('button',{class:'ghost mini',onclick:()=>multiplayer.setBot(i,null)},'Remove'));
      } else controls.push(el('button',{class:'ghost mini',onclick:()=>multiplayer.setBot(i,'hard')},'Add bot'));
    }
    seats.push(el('div',{class:'lobby-seat'},[
      el('span',{class:`seat-dot ${human?'online':bot?'bot':''}`},human?'●':bot?'◆':'○'),
      el('div',{},[el('strong',{},human|| (bot?`Bot · ${cap(bot)}`:`Seat ${i+1}`)),el('small',{},human?'Connected':bot?'Host-side AI':'Waiting')]),
      ...controls
    ]));
  }
  const ready=Array.from({length:playerCount-1},(_,i)=>i+1).every(i=>connected.has(i)||!!s.botSeats[i]);
  app.append(el('main',{class:`setup ${campaign}`},[
    el('div',{class:'setup-card lobby-card'},[
      el('span',{class:'eyebrow'},s.role==='host'?'HOST LOBBY':'GUEST LOBBY'),el('h1',{class:'room-code'},s.room||'Connecting…'),
      el('p',{},`${s.connected||0} peer connection(s) · ${playerCount} crew slot${playerCount===1?'':'s'}`),
      ...seats,
      playerCount===2?el('div',{class:'relay-note'},'Relay Drone joins automatically after launch as a public third trick-taking seat.'):null,
      s.role==='host'?el('button',{class:'primary',disabled:!ready,onclick:startMultiplayerGame},ready?'Launch operation':'Fill every crew slot'):el('p',{class:'waiting'},'Waiting for the host to launch…')
    ])
  ]));
}

function startMultiplayerGame(){
  recordedWin=null;
  game=createGame({playerCount,mode:campaign,mission:missionFor(campaign,missionNo,playerCount)});
  bots=new Set(Object.keys(multiplayer.botSeats).map(Number));
  if(Number.isInteger(game.relaySeat))bots.add(game.relaySeat);
  multiplayer.attachGame(game,execute);multiplayer.sync();renderGame();setTimeout(runBots,260);
}

function runBots(){
  if(!game||game.status!=='playing'||multiplayer?.role==='guest')return;
  const seat=game.currentPlayer;
  if(!bots.has(seat))return;
  const difficulty=seat===game.relaySeat?'expert':(multiplayer?.botSeats?.[seat]||'hard');
  if(game.phase==='assigning'){
    const task=chooseBotTask(game,seat);if(!task)return;
    assignTask(game,seat,task.id);renderGame();if(multiplayer?.role==='host')multiplayer.sync();setTimeout(runBots,250);return;
  }
  if(game.phase==='playing'&&!game.trick.length){
    const signal=chooseBotCommunication(game,seat,difficulty);
    if(signal){communicate(game,seat,signal.card.id,signal.position);renderGame();if(multiplayer?.role==='host')multiplayer.sync();setTimeout(runBots,180);return;}
  }
  const card=chooseBotCard(game,seat,difficulty);
  if(card){playCard(game,seat,card.id);recordProgress();renderGame();if(multiplayer?.role==='host')multiplayer.sync();setTimeout(runBots,310);}
}

function cardGlyph(card){return card.suit==='rocket'?'▲':card.suit[0].toUpperCase();}
function cardNode(card,playable=false,compact=false){
  if(card.hidden)return el('div',{class:`card back-card ${compact?'compact':''}`},'');
  return el('button',{class:`card ${card.suit} ${playable?'playable':''} ${compact?'compact':''}`,onclick:playable?()=>{if(multiplayer)multiplayer.action('play-card',{cardId:card.id});else execute(0,'play-card',{cardId:card.id})}:()=>{}},[el('b',{},String(card.value)),el('span',{},cardGlyph(card))]);
}

function taskNode(task,me){
  const open=!Number.isInteger(task.seat);const canPick=game.phase==='assigning'&&game.currentPlayer===me&&open;
  const owner=open?'Unassigned':seatName(task.seat);
  const node=el(canPick?'button':'div',{class:`task ${task.complete?'done':''} ${task.failed?'failed':''} ${canPick?'pickable':''}`,onclick:canPick?()=>{if(multiplayer)multiplayer.action('assign-task',{taskId:task.id});else execute(me,'assign-task',{taskId:task.id})}:null},[
    el('span',{class:'task-state'},task.complete?'✓':task.failed?'×':open?'◇':'○'),
    el('div',{},[el('p',{},taskLabel(task)),el('small',{},owner)])
  ]);
  return node;
}

function commPanel(me){
  const rows=[];
  for(let seat=0;seat<game.playerCount;seat++){
    if(seat===game.relaySeat)continue;
    const comm=game.communication[seat];
    rows.push(el('div',{class:`comm-row ${comm.used?'used':''}`},[
      el('span',{},seatName(seat)),
      el('strong',{},comm.cardId?`${comm.cardId.replace('-',' ')} · ${comm.position==='fogged'?'UNCLEAR':String(comm.position).toUpperCase()}`:comm.used?'Spent':'Ready')
    ]));
  }
  const options=communicationOptions(game,me);
  if(options.length){
    rows.push(el('div',{class:'signal-options'},[
      el('small',{},'Send one constrained signal'),
      ...options.slice(0,10).map(o=>el('button',{class:`signal-chip ${o.card.suit}`,onclick:()=>{if(multiplayer)multiplayer.action('communicate',{cardId:o.card.id,position:o.position});else execute(me,'communicate',{cardId:o.card.id,position:o.position})}},`${o.card.value}${cardGlyph(o.card)} · ${o.position.toUpperCase()}`))
    ]));
  }
  return el('section',{class:'comms'},[el('div',{class:'section-title'},'CREW SIGNALS'),...rows]);
}

function resultActions(){
  if(game.status==='playing')return null;
  const isHost=!multiplayer||multiplayer.role==='host';if(!isHost)return el('p',{class:'waiting'},'Waiting for host…');
  const replay=()=>multiplayer?startMultiplayerGame():startLocal();
  const next=()=>{missionNo=Math.min(CAMPAIGNS[campaign].missionCount,missionNo+1);multiplayer?startMultiplayerGame():startLocal();};
  return el('div',{class:'result-actions'},[
    game.status==='won'&&missionNo<CAMPAIGNS[campaign].missionCount?el('button',{class:'primary',onclick:next},'Next operation'):null,
    el('button',{class:'secondary',onclick:replay},'Retry operation')
  ]);
}

function renderGame(){
  if(!game)return;recordProgress();app.innerHTML='';
  const me=localSeat();const myHand=game.hands[me]||[];
  const legalIds=new Set(game.phase==='playing'&&game.currentPlayer===me?legalCards(myHand,game.trick).filter(c=>!c.hidden).map(c=>c.id):[]);
  const rivals=[];
  for(let s=0;s<game.playerCount;s++){
    if(s===me)continue;
    rivals.push(el('div',{class:`seat seat-${(s%4)+1} ${s===game.relaySeat?'relay-seat':''}`},[
      el('strong',{},seatName(s)),el('span',{},s===game.relaySeat?'PUBLIC SUPPORT AI':`${game.hands[s].length} cards`),s===game.captain?el('small',{class:'captain-tag'},'MISSION LEAD'):null
    ]));
  }
  const trick=game.trick.map(x=>el('div',{class:'trick-card'},[cardNode(x.card,false,true),el('small',{},seatName(x.seat))]));
  const tasks=game.taskState.map(t=>taskNode(t,me));
  const notes=ruleNotes(game.mission).map(n=>el('div',{class:'rule-note'},n));
  const relayStrip=Number.isInteger(game.relaySeat)&&game.relaySeat!==me?el('div',{class:'relay-hand'},[
    el('small',{},'RELAY DRONE · PUBLIC HAND'),el('div',{class:'relay-cards'},game.hands[game.relaySeat].map(c=>cardNode(c,false,true)))
  ]):null;
  const status=game.status==='won'?'OPERATION COMPLETE':game.status==='failed'?'OPERATION FAILED':game.phase==='assigning'?`${seatName(game.currentPlayer)} choosing objective`:`${seatName(game.currentPlayer)} to play`;
  app.append(el('main',{class:`game ${campaign}`},[
    el('header',{class:'hud'},[
      el('div',{},[el('span',{class:'eyebrow'},CAMPAIGNS[campaign].subtitle),el('strong',{},CAMPAIGNS[campaign].name)]),
      el('div',{class:'hud-stat'},`Operation ${game.mission.number}`),el('div',{class:'hud-stat'},game.phase==='assigning'?'Briefing':`Trick ${Math.min(game.trickNo,game.maxTricks)}/${game.maxTricks}`),
      el('button',{class:'ghost',onclick:setupScreen},'Menu')
    ]),
    el('aside',{class:'mission-rail'},[
      el('span',{class:'eyebrow'},game.mission.title),el('h2',{},'Mission board'),...notes,
      el('div',{class:'section-title'},game.phase==='assigning'?'SELECT OBJECTIVES':'OBJECTIVES'),...tasks,
      commPanel(me),resultActions()
    ]),
    el('section',{class:'table'},[
      ...rivals,relayStrip,
      el('div',{class:'table-mark'},campaign==='orbital'?'HELIOS NAV ARRAY':campaign==='abyss'?'HADAL SONAR ARRAY':'EMBER WEATHER GRID'),
      el('div',{class:'trick'},trick),el('div',{class:`status ${game.status}`},status),
      me===game.captain?el('div',{class:'local-role'},'MISSION LEAD'):null,
      el('div',{class:'hand'},myHand.map(c=>cardNode(c,game.phase==='playing'&&game.currentPlayer===me&&legalIds.has(c.id))))
    ])
  ]));
}

campaignScreen();
