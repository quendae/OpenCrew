import test from 'node:test';
import assert from 'node:assert/strict';
import { assignTask, communicate, communicationOptions, makeDeck, deal, legalCards, trickWinner, createGame, playCard, validateState, stateForSeat } from '../src/game.js';
import { CAMPAIGNS, missionFor, taskLabel } from '../src/missions.js';

test('deck has 40 unique cards',()=>{const d=makeDeck();assert.equal(d.length,40);assert.equal(new Set(d.map(c=>c.id)).size,40)});

test('deal conserves cards for 3-5 active seats',()=>{
  for(let n=3;n<=5;n++){
    const h=deal(n,123);assert.equal(h.flat().length,40);assert.equal(new Set(h.flat().map(c=>c.id)).size,40);
  }
  assert.deepEqual(deal(3,123).map(h=>h.length),[14,13,13]);
  assert.deepEqual(deal(5,123).map(h=>h.length),[8,8,8,8,8]);
});

test('must follow led suit when possible',()=>{const hand=[{id:'blue-2',suit:'blue',value:2},{id:'green-9',suit:'green',value:9}];const trick=[{seat:1,card:{id:'blue-7',suit:'blue',value:7}}];assert.deepEqual(legalCards(hand,trick).map(c=>c.id),['blue-2'])});

test('rocket trumps colors',()=>{const t=[{seat:0,card:{suit:'blue',value:9}},{seat:1,card:{suit:'rocket',value:1}},{seat:2,card:{suit:'green',value:9}}];assert.equal(trickWinner(t),1)});

test('two-slot mode adds a public Relay Drone seat',()=>{
  const g=createGame({playerCount:2,seed:1,mission:{tasks:[]}});
  assert.equal(g.requestedPlayerCount,2);assert.equal(g.playerCount,3);assert.equal(g.relaySeat,2);
  const v=stateForSeat(g,0);assert.ok(v.hands[0][0].id);assert.ok(v.hands[2][0].id);assert.equal(v.hands[1][0].hidden,true);
});

test('guest state hides deterministic seed and private hands',()=>{
  const g=createGame({playerCount:4,seed:987,mission:{tasks:[]}});const v=stateForSeat(g,2);
  assert.equal('seed' in v,false);assert.ok(v.hands[2][0].id);assert.equal(v.hands[0][0].hidden,true);
});

test('tasks are drafted clockwise before card play',()=>{
  const g=createGame({playerCount:4,seed:7,mission:{tasks:[{id:'a',type:'capture-card',cardId:'blue-1'},{id:'b',type:'capture-card',cardId:'green-2'}]}});
  assert.equal(g.phase,'assigning');const first=g.currentPlayer;
  assert.deepEqual(communicationOptions(g,first),[]);
  assert.equal(assignTask(g,first,'a').ok,true);const second=(first+1)%g.playerCount;assert.equal(g.currentPlayer,second);
  assert.equal(assignTask(g,second,'b').ok,true);assert.equal(g.phase,'playing');assert.equal(g.currentPlayer,g.captain);
});

test('communication is constrained, once per mission, and only between tricks',()=>{
  const g=createGame({playerCount:4,seed:4,mission:{tasks:[]}});const options=communicationOptions(g,0);assert.ok(options.length>0);
  const o=options[0];assert.equal(communicate(g,0,o.card.id,o.position).ok,true);assert.equal(communicate(g,0,o.card.id,o.position).ok,false);
  const g2=createGame({playerCount:4,seed:5,mission:{tasks:[]}});const lead=g2.currentPlayer;const card=g2.hands[lead][0];playCard(g2,lead,card.id);assert.deepEqual(communicationOptions(g2,(lead+1)%4),[]);
});

test('three-player hand ends after 13 full tricks and leaves one card unplayed',()=>{
  const g=createGame({playerCount:3,seed:2,mission:{tasks:[{id:'long',type:'win-tricks',seat:0,count:99}]}});let guard=100;
  while(g.status==='playing'&&guard--){const seat=g.currentPlayer;const legal=legalCards(g.hands[seat],g.trick);assert.ok(legal.length);playCard(g,seat,legal[0].id);const chk=validateState(g);assert.equal(chk.unique,true);assert.equal(chk.total,40)}
  assert.ok(guard>0);assert.equal(g.status,'failed');assert.equal(g.trickNo,13);assert.equal(g.hands.flat().length,1);
});

test('five-player automated legal play reaches a normal hand boundary',()=>{
  const g=createGame({playerCount:5,seed:11,mission:{tasks:[{id:'long',type:'win-tricks',seat:0,count:99}]}});let guard=100;
  while(g.status==='playing'&&guard--){const seat=g.currentPlayer;const legal=legalCards(g.hands[seat],g.trick);playCard(g,seat,legal[0].id)}
  assert.ok(guard>0);assert.equal(g.status,'failed');assert.equal(g.trickNo,8);assert.equal(g.hands.flat().length,0);
});

test('all three campaigns generate original task packages across their full ranges',()=>{
  for(const c of Object.values(CAMPAIGNS)){
    const first=missionFor(c.id,1,4);const last=missionFor(c.id,c.missionCount,4);
    assert.ok(first.tasks.length>0);assert.ok(last.tasks.length>0);assert.notEqual(first.title,last.title);
    for(const t of last.tasks)assert.ok(taskLabel(t).length>3);
  }
});
