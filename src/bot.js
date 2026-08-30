import { legalCards } from './game.js';

function scoreCard(state, seat, card) {
  let score = card.value;
  const assigned = state.taskState.filter(t => !t.complete && !t.failed && t.seat === seat);
  for (const t of assigned) {
    if (t.cardId === card.id) score -= 20;
    if (t.type === 'win-tricks') score += card.value * .6;
  }
  const othersNeed = state.taskState.filter(t => !t.complete && !t.failed && t.seat !== seat && t.cardId === card.id);
  if (othersNeed.length) score -= 30;
  if (card.suit === 'rocket') score += 8;
  return score;
}

export function chooseBotCard(state, seat, difficulty='normal') {
  const legal = legalCards(state.hands[seat], state.trick);
  if (!legal.length) return null;
  if (difficulty === 'easy') return legal[Math.floor(Math.random()*legal.length)];
  const sorted = [...legal].sort((a,b)=>scoreCard(state,seat,a)-scoreCard(state,seat,b));
  if (difficulty === 'normal') return sorted[Math.min(sorted.length-1, Math.floor(sorted.length*.35))];
  if (difficulty === 'hard') return sorted[0];
  const taskCards = state.taskState.filter(t=>!t.complete&&!t.failed).map(t=>t.cardId).filter(Boolean);
  const protect = sorted.filter(c=>!taskCards.includes(c.id));
  return protect[0] || sorted[0];
}
