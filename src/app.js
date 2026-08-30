import { createGame, playCard } from './game.js';
import { CAMPAIGNS, missionFor } from './missions.js';
import { chooseBotCard } from './bot.js';

const app=document.querySelector('#app');
let campaign='orbital', missionNo=1, playerCount=4, game=null;
let bots=new Set([1,2,3]);

function el(tag,attrs={},children=[]){const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else if(k==='html')n.innerHTML=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2).toLowerCase(),v);else n.setAttribute(k,v)};for(const c of [].concat(children))n.append(c?.nodeType?c:document.createTextNode(c??''));return n;}

function campaignScreen(){app.innerHTML='';const cards=Object.values(CAMPAIGNS).map(c=>el('button',{class:`campaign-card ${c.id}`,onclick:()=>{campaign=c.id;missionNo=1;setupScreen();}},[
  el('span',{class:'eyebrow'},c.subtitle),el('strong',{},c.name),el('p',{},c.flavor),el('small',{},`${c.missionCount} mission templates`)
]));app.append(el('main',{class:'menu-shell'},[el('header',{class:'brand'},[el('span',{class:'eyebrow'},'COOPERATIVE TRICK-TAKING'),el('h1',{},'OPENCREW'),el('p',{},'Choose an expedition. Play solo with bots or create a private crew.')]),el('section',{class:'campaign-grid'},cards)]));}

function setupScreen(){const c=CAMPAIGNS[campaign];app.innerHTML='';app.append(el('main',{class:`setup ${campaign}`},[
 el('button',{class:'back',onclick:campaignScreen},'← Expeditions'),el('div',{class:'setup-card'},[
 el('span',{class:'eyebrow'},c.subtitle),el('h1',{},c.name),el('p',{},c.flavor),
 el('label',{},['Mission ',el('input',{type:'number',min:'1',max:String(c.missionCount),value:String(missionNo),onchange:e=>missionNo=Math.max(1,Math.min(c.missionCount,+e.target.value||1))})]),
 el('label',{},['Crew size ',el('select',{onchange:e=>{playerCount=+e.target.value;bots=new Set(Array.from({length:playerCount-1},(_,i)=>i+1))}},[2,3,4,5].map(n=>el('option',{value:n,selected:n===playerCount?'selected':null},String(n))))]),
 el('button',{class:'primary',onclick:startLocal},'Start with bots'),el('button',{class:'secondary',onclick:()=>alert('Multiplayer module is included; configure signaling URL in localStorage key opencrew.signal and wire lobby UI in next iteration.')},'Private multiplayer')
 ])]));}

function startLocal(){game=createGame({playerCount,mode:campaign,mission:missionFor(campaign,missionNo,playerCount)});renderGame();setTimeout(runBots,350);}

function runBots(){if(!game||game.status!=='playing'||!bots.has(game.currentPlayer))return;const seat=game.currentPlayer;const card=chooseBotCard(game,seat,'hard');if(card){playCard(game,seat,card.id);renderGame();setTimeout(runBots,380)}}
function cardNode(card,playable=false){if(card.hidden)return el('div',{class:'card back-card'},'');return el('button',{class:`card ${card.suit} ${playable?'playable':''}`,onclick:playable?()=>{playCard(game,0,card.id);renderGame();setTimeout(runBots,350)}:()=>{}},[el('b',{},String(card.value)),el('span',{},card.suit==='rocket'?'▲':card.suit[0].toUpperCase())]);}

function renderGame(){app.innerHTML='';const mission=game.mission;const legalIds=new Set(game.currentPlayer===0?game.hands[0].map(c=>c.id):[]);const rivals=[];for(let s=1;s<game.playerCount;s++)rivals.push(el('div',{class:`seat seat-${s}`},[el('strong',{},`CREW ${s+1}`),el('span',{},`${game.hands[s].length} cards`)]));const trick=game.trick.map(x=>el('div',{class:'trick-card'},[cardNode(x.card),el('small',{},`Crew ${x.seat+1}`)]));const tasks=mission.tasks.map((t,i)=>el('div',{class:`task ${game.taskState[i]?.complete?'done':''} ${game.taskState[i]?.failed?'failed':''}`},[el('span',{},game.taskState[i]?.complete?'✓':game.taskState[i]?.failed?'×':'○'),el('p',{},t.label)]));app.append(el('main',{class:`game ${campaign}`},[
 el('header',{class:'hud'},[el('div',{},[el('span',{class:'eyebrow'},CAMPAIGNS[campaign].subtitle),el('strong',{},CAMPAIGNS[campaign].name)]),el('div',{class:'hud-stat'},`Mission ${missionNo}`),el('div',{class:'hud-stat'},`Trick ${game.trickNo}`),el('button',{class:'ghost',onclick:setupScreen},'Menu')]),
 el('aside',{class:'mission-rail'},[el('span',{class:'eyebrow'},mission.title),el('h2',{},'Objectives'),...tasks]),
 el('section',{class:'table'},[...rivals,el('div',{class:'table-mark'},campaign==='orbital'?'ORBITAL RELAY':campaign==='abyss'?'SONAR ARRAY':'STORM GRID'),el('div',{class:'trick'},trick),el('div',{class:'status'},game.status==='playing'?`Crew ${game.currentPlayer+1} to play`:game.status==='won'?'MISSION COMPLETE':'MISSION FAILED'),el('div',{class:'hand'},game.hands[0].map(c=>cardNode(c,game.currentPlayer===0&&legalIds.has(c.id))))])
]));}

campaignScreen();
