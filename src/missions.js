const COLORS=['blue','yellow','green','pink'];
const COLOR_NAMES={blue:'azure',yellow:'amber',green:'verdant',pink:'magenta'};

function card(suit,value){return `${suit}-${value}`;}
function seeded(seed){let x=seed|0;return()=>((x=Math.imul(1664525,x)+1013904223|0)>>>0)/4294967296;}
function pick(rng,arr){return arr[Math.floor(rng()*arr.length)];}
function int(rng,min,max){return min+Math.floor(rng()*(max-min+1));}
function cardText(id){const [suit,value]=id.split('-');return `${COLOR_NAMES[suit]||suit} ${value}`;}

export const CAMPAIGNS = {
  orbital: {
    id:'orbital',
    name:'Helios Reach',
    subtitle:'Outer-system survey',
    missionCount:45,
    flavor:'Thread a survey vessel through unstable orbits and silent relay gates.',
    accent:'#39C6F0',
    philosophy:'Structured objectives, priority chains and increasingly strict timing.'
  },
  abyss: {
    id:'abyss',
    name:'Abyssal Signal',
    subtitle:'Hadal research expedition',
    missionCount:36,
    flavor:'Follow impossible sonar returns beneath the last mapped contour.',
    accent:'#24D9B1',
    philosophy:'Variable objective packages assembled from a difficulty budget.'
  },
  ember: {
    id:'ember',
    name:'Emberline',
    subtitle:'Storm-rescue airships',
    missionCount:42,
    flavor:'Coordinate rescue flights through a continent-sized electrical supercell.',
    accent:'#F28B38',
    philosophy:'Timing windows, linked rescues and volatile trick targets.'
  }
};

function uniqueCard(rng,used){
  let id;
  do{id=card(pick(rng,COLORS),int(rng,1,9));}while(used.has(id));
  used.add(id);
  return id;
}

function makeTask(id,type,extra={}){return {id:`t${id}`,type,...extra};}

function orbitalTasks(rng,number,playerCount){
  const used=new Set();
  const count=Math.min(playerCount+1,1+Math.floor((number-1)/7));
  const tasks=[];
  for(let i=0;i<count;i++) tasks.push(makeTask(i,'capture-card',{cardId:uniqueCard(rng,used)}));
  if(number>=8 && number%4===0 && tasks.length>1){
    const ordered=Math.min(tasks.length,2+(number>=25?1:0));
    for(let i=0;i<ordered;i++) tasks[i].priority=i+1;
  }
  if(number>=12 && number%6===0){
    tasks[tasks.length-1]=makeTask(tasks.length-1,'win-specific-trick',{trickNo:int(rng,2,Math.min(6,3+Math.floor(number/10)))});
  }
  if(number>=18 && number%9===0){
    tasks[0]=makeTask(0,'avoid-card',{cardId:uniqueCard(rng,used)});
  }
  if(number>=28 && number%11===0){
    tasks.push(makeTask(tasks.length,'win-final-trick'));
  }
  return tasks;
}

const ABYSS_TYPES=[
  {type:'capture-card',cost:1},
  {type:'avoid-card',cost:1},
  {type:'win-tricks',cost:2},
  {type:'exact-tricks',cost:3},
  {type:'capture-suit-count',cost:2},
  {type:'pair-capture',cost:3},
  {type:'win-specific-trick',cost:2}
];

function abyssTasks(rng,number,playerCount){
  const used=new Set();
  let budget=Math.min(11,2+Math.floor((number-1)/4));
  const tasks=[];
  while(budget>0 && tasks.length<Math.min(5,playerCount+2)){
    const allowed=ABYSS_TYPES.filter(x=>x.cost<=budget && (number>6 || x.cost===1));
    const spec=pick(rng,allowed);
    const i=tasks.length;
    let task;
    if(spec.type==='capture-card'||spec.type==='avoid-card') task=makeTask(i,spec.type,{cardId:uniqueCard(rng,used)});
    if(spec.type==='win-tricks') task=makeTask(i,spec.type,{count:int(rng,1,Math.min(3,1+Math.floor(number/12)))});
    if(spec.type==='exact-tricks') task=makeTask(i,spec.type,{count:int(rng,1,2)});
    if(spec.type==='capture-suit-count') task=makeTask(i,spec.type,{suit:pick(rng,COLORS),count:int(rng,2,4)});
    if(spec.type==='pair-capture') task=makeTask(i,spec.type,{cardIds:[uniqueCard(rng,used),uniqueCard(rng,used)]});
    if(spec.type==='win-specific-trick') task=makeTask(i,spec.type,{trickNo:int(rng,2,6)});
    tasks.push(task);
    budget-=spec.cost;
  }
  return tasks;
}

function emberTasks(rng,number,playerCount){
  const used=new Set();
  const count=Math.min(playerCount+1,1+Math.floor((number-1)/6));
  const tasks=[];
  for(let i=0;i<count;i++){
    const roll=rng();
    if(number>8 && roll<.20) tasks.push(makeTask(i,'win-specific-trick',{trickNo:int(rng,2,6)}));
    else if(number>14 && roll<.34) tasks.push(makeTask(i,'pair-capture',{cardIds:[uniqueCard(rng,used),uniqueCard(rng,used)]}));
    else if(number>20 && roll<.46) tasks.push(makeTask(i,'no-tricks'));
    else {
      const task=makeTask(i,'capture-card',{cardId:uniqueCard(rng,used)});
      if(number>6 && i===0) task.deadline=Math.min(7,3+Math.floor(number/10));
      if(number>16 && i===count-1) task.notBefore=Math.min(6,2+Math.floor(number/14));
      tasks.push(task);
    }
  }
  if(number>=24 && number%8===0) tasks.push(makeTask(tasks.length,'win-final-trick'));
  return tasks;
}

function rulesFor(campaign,number){
  const rules={};
  if(campaign==='orbital'){
    if(number>=15 && number%10===5) rules.commsLockUntil=3;
    if(number>=22 && number%11===0) rules.commsFog=true;
  }
  if(campaign==='abyss'){
    if(number>=8 && number%6===0) rules.commsFog=true;
    if(number>=18 && number%9===0) rules.commsLockUntil=4;
    if(number>=30 && number%10===0) rules.commDisabled=true;
  }
  if(campaign==='ember'){
    if(number>=10 && number%7===0) rules.commsLockUntil=3;
    if(number>=18 && number%9===0) rules.commsFog=true;
  }
  return rules;
}

const TITLES={
  orbital:['Lagrange Trace','Cold Arc','Perihelion Gate','Far Beacon','Glass Orbit','Silent Vector'],
  abyss:['Thermocline','Black Smoker','Hadal Rift','Cold Seep','Midnight Shelf','Pressure Choir'],
  ember:['Squall Line','Static Crown','Ash Corridor','Crosswind','Lightning Shelf','Rescue Window']
};

export function taskLabel(task){
  let text='Objective';
  if(task.type==='capture-card') text=`Recover ${cardText(task.cardId)}`;
  if(task.type==='avoid-card') text=`Do not take ${cardText(task.cardId)}`;
  if(task.type==='win-tricks') text=`Win at least ${task.count} trick${task.count===1?'':'s'}`;
  if(task.type==='exact-tricks') text=`Win exactly ${task.count} trick${task.count===1?'':'s'}`;
  if(task.type==='no-tricks') text='Win no tricks';
  if(task.type==='capture-suit-count') text=`Recover ${task.count} ${COLOR_NAMES[task.suit]} cards`;
  if(task.type==='pair-capture') text=`Take ${task.cardIds.map(cardText).join(' + ')} in one trick`;
  if(task.type==='win-specific-trick') text=`Win trick ${task.trickNo}`;
  if(task.type==='win-final-trick') text='Win the final full trick';
  const tags=[];
  if(task.priority) tags.push(`priority ${task.priority}`);
  if(task.deadline) tags.push(`by trick ${task.deadline}`);
  if(task.notBefore) tags.push(`from trick ${task.notBefore}`);
  return tags.length?`${text} · ${tags.join(' · ')}`:text;
}

export function ruleNotes(mission){
  const notes=[];
  const r=mission?.rules||{};
  if(r.commDisabled) notes.push('BLACKOUT — no crew signals this operation.');
  else if(r.commsLockUntil) notes.push(`DELAYED LINK — signals unlock before trick ${r.commsLockUntil}.`);
  if(r.commsFog) notes.push('SIGNAL FOG — allies see the signaled card, but not whether it is high, low or alone.');
  if(mission?.campaign==='abyss') notes.push(`PRESSURE LOAD ${mission.difficulty} — objective mix is generated from a difficulty budget.`);
  if(mission?.campaign==='ember') notes.push('WEATHER CLOCK — timing windows are hard mission constraints.');
  return notes;
}

export function missionFor(campaign='orbital',number=1,playerCount=4){
  const meta=CAMPAIGNS[campaign]||CAMPAIGNS.orbital;
  const safeNumber=Math.max(1,Math.min(meta.missionCount,number));
  const rng=seeded(safeNumber*7919+playerCount*97+campaign.length*31);
  const difficulty=Math.min(6,1+Math.floor((safeNumber-1)/(meta.missionCount/6)));
  let tasks;
  if(campaign==='abyss') tasks=abyssTasks(rng,safeNumber,playerCount);
  else if(campaign==='ember') tasks=emberTasks(rng,safeNumber,playerCount);
  else tasks=orbitalTasks(rng,safeNumber,playerCount);
  return {
    id:`${campaign}-${safeNumber}`,
    campaign,
    number:safeNumber,
    difficulty,
    title:`${pick(rng,TITLES[campaign]||TITLES.orbital)} ${String(safeNumber).padStart(2,'0')}`,
    tasks,
    rules:rulesFor(campaign,safeNumber)
  };
}
