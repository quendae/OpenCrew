import { communicationOptions, legalCards, trickWinner } from './game.js';

function strength(hand){
  return hand.reduce((sum,c)=>sum+c.value+(c.suit==='rocket'?12:0),0)/(hand.length||1);
}

function scoreTask(state,seat,task){
  const hand=state.hands[seat]||[];
  const power=strength(hand);
  if(task.type==='capture-card'){
    const [suit,valueText]=task.cardId.split('-');
    const value=+valueText;
    const suitCards=hand.filter(c=>c.suit===suit);
    const owns=hand.some(c=>c.id===task.cardId);
    const higher=suitCards.filter(c=>c.value>value).length;
    return (owns?6:10)+higher*3+hand.filter(c=>c.suit==='rocket').length*2;
  }
  if(task.type==='avoid-card') return hand.some(c=>c.id===task.cardId)?-6:8;
  if(task.type==='win-tricks') return power+task.count*2;
  if(task.type==='exact-tricks') return 18-Math.abs(power-(7+task.count*3));
  if(task.type==='no-tricks') return 18-power;
  if(task.type==='capture-suit-count') return hand.filter(c=>c.suit===task.suit).reduce((n,c)=>n+c.value,0)/5;
  if(task.type==='pair-capture') return 4+hand.filter(c=>task.cardIds.includes(c.id)).length*3;
  if(task.type==='win-specific-trick'||task.type==='win-final-trick') return power;
  return 0;
}

export function chooseBotTask(state,seat){
  const open=state.taskState.filter(t=>!Number.isInteger(t.seat));
  if(!open.length)return null;
  return [...open].sort((a,b)=>scoreTask(state,seat,b)-scoreTask(state,seat,a))[0];
}

function provisionalWinner(state,seat,card){
  return trickWinner([...state.trick,{seat,card}]);
}

function scoreCard(state,seat,card){
  let score=-card.value-(card.suit==='rocket'?8:0);
  const winner=provisionalWinner(state,seat,card);
  const active=state.taskState.filter(t=>!t.complete&&!t.failed&&Number.isInteger(t.seat));
  for(const t of active){
    if(t.cardId===card.id){
      if(t.seat===seat) score += winner===seat?35:-28;
      else score += winner===t.seat?42:-48;
    }
    if(t.cardIds?.includes(card.id)) score-=22;
    if(t.seat===seat&&(t.type==='win-tricks'||t.type==='win-specific-trick'||t.type==='win-final-trick')) score+=winner===seat?18:-5;
    if(t.seat===seat&&t.type==='no-tricks') score+=winner===seat?-35:8;
  }
  return score;
}

export function chooseBotCard(state, seat, difficulty='normal') {
  const legal = legalCards(state.hands[seat], state.trick);
  if (!legal.length) return null;
  if (difficulty === 'easy') return legal[Math.floor(Math.random()*legal.length)];
  const sorted=[...legal].sort((a,b)=>scoreCard(state,seat,b)-scoreCard(state,seat,a));
  if(difficulty==='normal') return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.3))];
  if(difficulty==='hard') return sorted[0];
  const critical=new Set(state.taskState.filter(t=>!t.complete&&!t.failed).flatMap(t=>[t.cardId,...(t.cardIds||[])]).filter(Boolean));
  return sorted.find(c=>!critical.has(c.id))||sorted[0];
}

export function chooseBotCommunication(state,seat,difficulty='hard'){
  if(difficulty==='easy'||difficulty==='normal')return null;
  const options=communicationOptions(state,seat);
  if(!options.length)return null;
  const important=new Set(state.taskState.filter(t=>!t.complete&&!t.failed).flatMap(t=>[t.cardId,...(t.cardIds||[])]).filter(Boolean));
  return options.find(o=>important.has(o.card.id)) || (difficulty==='expert'?options.find(o=>o.position==='only')||null:null);
}
