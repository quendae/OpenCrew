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
  if (playerCount < 3 || playerCount > 5) throw new Error('OpenCrew trick tables use 3-5 active seats');
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

function taskWithState(task, index) {
  return {
    id: task.id || `task-${index}`,
    seat: Number.isInteger(task.seat) ? task.seat : null,
    complete: false,
    failed: false,
    progress: 0,
    ...structuredClone(task)
  };
}

export function createGame({playerCount=4, seed=Date.now(), mode='orbital', mission=null}={}) {
  if (playerCount < 2 || playerCount > 5) throw new Error('OpenCrew supports 2-5 human/table slots');
  // Our two-player mode is deliberately digital-first: two crew slots plus a public,
  // host-controlled Relay Drone. Unlike a normal bot, its hand is public to both humans.
  const relayMode = playerCount === 2;
  const effectivePlayerCount = relayMode ? 3 : playerCount;
  const relaySeat = relayMode ? 2 : null;
  const hands = deal(effectivePlayerCount, seed);
  const captain = hands.findIndex(h => h.some(c => c.id === 'rocket-4'));
  const taskState = (mission?.tasks || []).map(taskWithState);
  const hasUnassigned = taskState.some(t => !Number.isInteger(t.seat));
  const communication = Array.from({length:effectivePlayerCount}, (_, seat) => ({
    used: seat === relaySeat,
    locked: seat === relaySeat,
    cardId: null,
    position: null
  }));
  return {
    version: 2,
    mode,
    seed,
    requestedPlayerCount: playerCount,
    playerCount: effectivePlayerCount,
    relaySeat,
    hands,
    captain,
    leader: captain,
    currentPlayer: captain,
    phase: hasUnassigned ? 'assigning' : 'playing',
    trick: [],
    trickNo: 1,
    maxTricks: Math.floor(40 / effectivePlayerCount),
    captured: Array.from({length:effectivePlayerCount}, () => []),
    tricksWon: Array.from({length:effectivePlayerCount}, () => 0),
    communication,
    mission,
    taskState,
    status: 'playing',
    history: []
  };
}

export function assignTask(state, seat, taskId) {
  if (state.status !== 'playing' || state.phase !== 'assigning') return {ok:false,error:'NOT_ASSIGNING'};
  if (seat !== state.currentPlayer) return {ok:false,error:'NOT_YOUR_ASSIGNMENT_TURN'};
  const task = state.taskState.find(t => t.id === taskId);
  if (!task || Number.isInteger(task.seat)) return {ok:false,error:'TASK_UNAVAILABLE'};
  task.seat = seat;
  state.history.push({type:'assign-task',seat,taskId});
  const remaining = state.taskState.filter(t => !Number.isInteger(t.seat));
  if (!remaining.length) {
    state.phase = 'playing';
    state.leader = state.captain;
    state.currentPlayer = state.captain;
    state.history.push({type:'phase',phase:'playing'});
    return {ok:true,phase:'playing'};
  }
  state.currentPlayer = (seat + 1) % state.playerCount;
  return {ok:true,phase:'assigning'};
}

function commRules(state) {
  return state.mission?.rules || {};
}

export function communicationOptions(state, seat) {
  if (!state || state.status !== 'playing' || state.phase !== 'playing' || state.trick.length) return [];
  const comm = state.communication[seat];
  if (!comm || comm.used || comm.locked) return [];
  const rules = commRules(state);
  if (rules.commDisabled) return [];
  if (rules.commsLockUntil && state.trickNo < rules.commsLockUntil) return [];
  const hand = state.hands[seat] || [];
  const options = [];
  for (const card of hand) {
    if (card.suit === ROCKET) continue;
    const suitCards = hand.filter(c => c.suit === card.suit);
    if (suitCards.length === 1) {
      options.push({card,position:'only'});
      continue;
    }
    const max = Math.max(...suitCards.map(c=>c.value));
    const min = Math.min(...suitCards.map(c=>c.value));
    if (card.value === max) options.push({card,position:'high'});
    if (card.value === min) options.push({card,position:'low'});
  }
  return options;
}

export function communicate(state, seat, cardId, position) {
  const option = communicationOptions(state,seat).find(o => o.card.id === cardId && o.position === position);
  if (!option) return {ok:false,error:'INVALID_COMMUNICATION'};
  state.communication[seat] = {used:true,locked:false,cardId,position};
  state.history.push({type:'communicate',seat,cardId,position});
  return {ok:true};
}

function violatesTaskWindow(state, task) {
  if (task.notBefore && state.trickNo < task.notBefore) return true;
  if (task.deadline && state.trickNo > task.deadline) return true;
  if (task.priority) {
    const earlier = state.taskState.some(t => !t.complete && !t.failed && t.priority && t.priority < task.priority);
    if (earlier) return true;
  }
  return false;
}

function updateTasks(state, winner, trick, isFinalTrick) {
  for (const task of state.taskState) {
    if (task.complete || task.failed || !Number.isInteger(task.seat)) continue;
    if (task.type === 'capture-card') {
      const hit = trick.some(p => p.card.id === task.cardId);
      if (hit) {
        if (winner !== task.seat || violatesTaskWindow(state,task)) task.failed = true;
        else task.complete = true;
      }
    }
    if (task.type === 'avoid-card') {
      const hit = trick.some(p => p.card.id === task.cardId);
      if (hit) winner === task.seat ? task.failed = true : task.complete = true;
    }
    if (task.type === 'pair-capture') {
      const hits = task.cardIds.filter(id => trick.some(p=>p.card.id===id));
      if (hits.length) {
        if (hits.length !== task.cardIds.length || winner !== task.seat || violatesTaskWindow(state,task)) task.failed = true;
        else task.complete = true;
      }
    }
    if (task.type === 'win-tricks' && winner === task.seat) {
      task.progress += 1;
      if (task.progress >= task.count) task.complete = true;
    }
    if (task.type === 'exact-tricks' && winner === task.seat) {
      task.progress += 1;
      if (task.progress > task.count) task.failed = true;
    }
    if (task.type === 'no-tricks' && winner === task.seat) {
      task.progress += 1;
      task.failed = true;
    }
    if (task.type === 'capture-suit-count' && winner === task.seat) {
      task.progress += trick.filter(p => p.card.suit === task.suit).length;
      if (task.progress >= task.count) task.complete = true;
    }
    if (task.type === 'win-specific-trick' && state.trickNo === task.trickNo) {
      winner === task.seat ? task.complete = true : task.failed = true;
    }
    if (task.type === 'win-final-trick' && isFinalTrick) {
      winner === task.seat ? task.complete = true : task.failed = true;
    }
  }
}

function finishHandTasks(state) {
  for (const task of state.taskState) {
    if (task.complete || task.failed) continue;
    if (task.type === 'no-tricks') task.complete = task.progress === 0;
    else if (task.type === 'exact-tricks') {
      if (task.progress === task.count) task.complete = true;
      else task.failed = true;
    } else if (task.type === 'capture-suit-count') {
      if (task.progress >= task.count) task.complete = true;
      else task.failed = true;
    } else task.failed = true;
  }
}

function settleStatus(state, handEnded=false) {
  if (state.taskState.some(t=>t.failed)) {
    state.status = 'failed';
    return;
  }
  if (state.taskState.length && state.taskState.every(t=>t.complete)) {
    state.status = 'won';
    return;
  }
  if (handEnded) {
    finishHandTasks(state);
    state.status = state.taskState.every(t=>t.complete) ? 'won' : 'failed';
  }
}

export function playCard(state, seat, cardId) {
  if (state.status !== 'playing' || state.phase !== 'playing') return {ok:false,error:'NOT_PLAYING'};
  if (seat !== state.currentPlayer) return {ok:false,error:'NOT_YOUR_TURN'};
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
  const isFinalTrick = state.trickNo >= state.maxTricks;
  state.captured[winner].push(...completedTrick.map(x=>x.card));
  state.tricksWon[winner] += 1;
  updateTasks(state,winner,completedTrick,isFinalTrick);
  state.history.push({type:'trick',winner,trickNo:state.trickNo,cards:completedTrick.map(x=>x.card.id)});
  state.trick = [];
  state.leader = winner;
  state.currentPlayer = winner;
  settleStatus(state,isFinalTrick);
  if (state.status === 'playing') state.trickNo += 1;
  return {ok:true,winner,status:state.status};
}

export function stateForSeat(state, seat) {
  const view = structuredClone(state);
  // A deterministic seed is equivalent to knowing the future deck order, so it is host-private.
  delete view.seed;
  view.hands = view.hands.map((hand,i) => (i === seat || i === view.relaySeat) ? hand : hand.map(()=>({hidden:true})));
  if (view.mission?.rules?.commsFog) {
    view.communication = view.communication.map((comm,i) => i !== seat && comm.cardId ? {...comm,position:'fogged'} : comm);
  }
  return view;
}

export function validateState(state) {
  const ids=[];
  for (const h of state.hands) for (const c of h) ids.push(c.id);
  for (const p of state.captured) for (const c of p) ids.push(c.id);
  for (const x of state.trick) ids.push(x.card.id);
  return {unique:new Set(ids).size===ids.length,total:ids.length,expected:40};
}
