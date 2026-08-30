export const SUITS = ['blue','yellow','green','pink'];
export const ROCKET = 'rocket';

export function makeDeck() {
  const cards = [];
  for (const suit of SUITS) for (let value = 1; value <= 9; value++) cards.push({ id: `${suit}-${value}`, suit, value });
  for (let value = 1; value <= 4; value++) cards.push({ id: `rocket-${value}`, suit: ROCKET, value });
  return cards;
}

export function mulberry32(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng = Math.random) {
  const out = deck.map(c => ({...c}));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function deal(playerCount, seed = Date.now()) {
  if (playerCount < 2 || playerCount > 5) throw new Error('OpenCrew supports 2-5 seats');
  const deck = shuffle(makeDeck(), mulberry32(seed));
  const hands = Array.from({length: playerCount}, () => []);
  deck.forEach((card, i) => hands[i % playerCount].push(card));
  hands.forEach(hand => hand.sort((a,b) => (a.suit.localeCompare(b.suit) || a.value-b.value)));
  return hands;
}

export function legalCards(hand, trick) {
  if (!trick.length) return hand;
  const leadSuit = trick[0].card.suit;
  const following = hand.filter(c => c.suit === leadSuit);
  return following.length ? following : hand;
}

export function trickWinner(trick) {
  if (!trick.length) return null;
  const rockets = trick.filter(p => p.card.suit === ROCKET);
  if (rockets.length) return rockets.reduce((a,b) => b.card.value > a.card.value ? b : a).seat;
  const lead = trick[0].card.suit;
  return trick.filter(p => p.card.suit === lead).reduce((a,b) => b.card.value > a.card.value ? b : a).seat;
}

export function createGame({playerCount=4, seed=Date.now(), mode='orbital', mission=null}={}) {
  const hands = deal(playerCount, seed);
  const captain = hands.findIndex(h => h.some(c => c.id === 'rocket-4'));
  return {
    version: 1,
    mode,
    seed,
    playerCount,
    hands,
    captain,
    leader: captain,
    currentPlayer: captain,
    trick: [],
    trickNo: 1,
    captured: Array.from({length:playerCount}, () => []),
    communication: Array.from({length:playerCount}, () => ({used:false, cardId:null, position:null})),
    mission,
    taskState: (mission?.tasks || []).map(t => ({...t, complete:false, failed:false})),
    status: 'playing',
    history: []
  };
}

export function communicate(state, seat, cardId, position) {
  if (state.status !== 'playing') return false;
  const comm = state.communication[seat];
  const card = state.hands[seat].find(c => c.id === cardId);
  if (!card || card.suit === ROCKET || comm.used) return false;
  const suitCards = state.hands[seat].filter(c => c.suit === card.suit);
  const max = Math.max(...suitCards.map(c=>c.value));
  const min = Math.min(...suitCards.map(c=>c.value));
  const allowed = (position === 'only' && suitCards.length === 1) || (position === 'high' && card.value === max) || (position === 'low' && card.value === min);
  if (!allowed) return false;
  state.communication[seat] = {used:true, cardId, position};
  state.history.push({type:'communicate',seat,cardId,position});
  return true;
}

function updateTasks(state, winner, trick) {
  for (const task of state.taskState) {
    if (task.complete || task.failed) continue;
    if (task.type === 'capture-card') {
      const hit = trick.some(p => p.card.id === task.cardId);
      if (hit) (winner === task.seat ? task.complete = true : task.failed = true);
    }
    if (task.type === 'avoid-card') {
      const hit = trick.some(p => p.card.id === task.cardId);
      if (hit && winner === task.seat) task.failed = true;
      if (!state.hands.some(h => h.some(c => c.id === task.cardId)) && hit && winner !== task.seat) task.complete = true;
    }
    if (task.type === 'win-tricks' && winner === task.seat) {
      task.progress = (task.progress || 0) + 1;
      if (task.progress >= task.count) task.complete = true;
    }
    if (task.type === 'win-specific-trick' && state.trickNo === task.trickNo) {
      winner === task.seat ? task.complete = true : task.failed = true;
    }
  }
}

export function playCard(state, seat, cardId) {
  if (state.status !== 'playing' || seat !== state.currentPlayer) return {ok:false,error:'NOT_YOUR_TURN'};
  const hand = state.hands[seat];
  const card = hand.find(c=>c.id===cardId);
  if (!card) return {ok:false,error:'CARD_NOT_OWNED'};
  if (!legalCards(hand,state.trick).some(c=>c.id===cardId)) return {ok:false,error:'MUST_FOLLOW_SUIT'};
  state.hands[seat] = hand.filter(c=>c.id!==cardId);
  state.trick.push({seat,card});
  state.history.push({type:'play',seat,cardId});
  if (state.trick.length < state.playerCount) {
    state.currentPlayer = (seat + 1) % state.playerCount;
    return {ok:true};
  }
  const winner = trickWinner(state.trick);
  const completedTrick = state.trick.map(x=>({...x,card:{...x.card}}));
  state.captured[winner].push(...completedTrick.map(x=>x.card));
  updateTasks(state,winner,completedTrick);
  state.history.push({type:'trick',winner,trickNo:state.trickNo,cards:completedTrick.map(x=>x.card.id)});
  state.trick = [];
  state.leader = winner;
  state.currentPlayer = winner;
  state.trickNo += 1;
  const failed = state.taskState.some(t=>t.failed);
  const noCards = state.hands.every(h=>h.length===0);
  const allDone = state.taskState.every(t=>t.complete);
  if (failed) state.status='failed';
  else if (allDone) state.status='won';
  else if (noCards) state.status='failed';
  return {ok:true,winner,status:state.status};
}

export function stateForSeat(state, seat) {
  const view = structuredClone(state);
  view.hands = view.hands.map((hand,i) => i === seat ? hand : hand.map(()=>({hidden:true})));
  return view;
}

export function validateState(state) {
  const ids=[];
  for (const h of state.hands) for (const c of h) ids.push(c.id);
  for (const p of state.captured) for (const c of p) ids.push(c.id);
  for (const x of state.trick) ids.push(x.card.id);
  return {unique:new Set(ids).size===ids.length,total:ids.length,expected:40};
}
