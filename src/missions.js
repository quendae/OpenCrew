const COLORS=['blue','yellow','green','pink'];

function card(suit,value){return `${suit}-${value}`;}
function seeded(seed){let x=seed|0;return()=>((x=Math.imul(1664525,x)+1013904223|0)>>>0)/4294967296;}
function pick(rng,arr){return arr[Math.floor(rng()*arr.length)];}

export const CAMPAIGNS = {
  orbital: {
    id:'orbital',
    name:'Orbital Nine',
    subtitle:'Planetary expedition',
    missionCount:50,
    flavor:'Chart a silent route through the outer system.',
    accent:'#39C6F0'
  },
  abyss: {
    id:'abyss',
    name:'Abyssal Signal',
    subtitle:'Deep-sea expedition',
    missionCount:32,
    flavor:'Follow impossible sonar returns into the hadal dark.',
    accent:'#24D9B1'
  },
  ember: {
    id:'ember',
    name:'Emberline',
    subtitle:'Storm-rescue airships',
    missionCount:40,
    flavor:'Coordinate rescue flights through an electrical supercell.',
    accent:'#F28B38'
  }
};

export function missionFor(campaign='orbital',number=1,playerCount=4){
  const rng=seeded(number*7919+playerCount*97+campaign.length*31);
  const difficulty = Math.max(1, Math.ceil(number/6));
  const taskCount = Math.min(playerCount+1, 1 + Math.floor((number-1)/8));
  const tasks=[];
  const used=new Set();
  for(let i=0;i<taskCount;i++){
    let id;
    do{id=card(pick(rng,COLORS),1+Math.floor(rng()*9));}while(used.has(id));
    used.add(id);
    const seat=Math.floor(rng()*playerCount);
    if(campaign==='abyss' && number>8 && i===taskCount-1 && number%3===0){
      tasks.push({id:`t${i}`,type:'win-tricks',seat,count:1+Math.floor(rng()*2),label:`Seat ${seat+1} must win ${1+Math.floor(rng()*2)} trick(s)`});
    } else if(campaign==='ember' && number>10 && i===0 && number%4===0){
      const trickNo=2+Math.floor(rng()*4);
      tasks.push({id:`t${i}`,type:'win-specific-trick',seat,trickNo,label:`Seat ${seat+1} must win trick ${trickNo}`});
    } else {
      tasks.push({id:`t${i}`,type:'capture-card',seat,cardId:id,label:`Seat ${seat+1} must capture ${id.replace('-', ' ')}`});
    }
  }
  return {
    id:`${campaign}-${number}`,
    campaign,
    number,
    difficulty,
    title: campaign==='orbital'?`Trajectory ${String(number).padStart(2,'0')}`:campaign==='abyss'?`Dive ${String(number).padStart(2,'0')}`:`Front ${String(number).padStart(2,'0')}`,
    tasks,
    modifier: number%10===0?'distress-available':number%7===0?'silent-comms':null
  };
}
