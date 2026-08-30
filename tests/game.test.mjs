import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, deal, legalCards, trickWinner, createGame, playCard, validateState, stateForSeat } from '../src/game.js';

test('deck has 40 unique cards',()=>{const d=makeDeck();assert.equal(d.length,40);assert.equal(new Set(d.map(c=>c.id)).size,40)});
test('deal conserves cards for 2-5 seats',()=>{for(let n=2;n<=5;n++){const h=deal(n,123);assert.equal(h.flat().length,40);assert.equal(new Set(h.flat().map(c=>c.id)).size,40)}});
test('must follow led suit when possible',()=>{const hand=[{id:'blue-2',suit:'blue',value:2},{id:'green-9',suit:'green',value:9}];const trick=[{seat:1,card:{id:'blue-7',suit:'blue',value:7}}];assert.deepEqual(legalCards(hand,trick).map(c=>c.id),['blue-2'])});
test('rocket trumps colors',()=>{const t=[{seat:0,card:{suit:'blue',value:9}},{seat:1,card:{suit:'rocket',value:1}},{seat:2,card:{suit:'green',value:9}}];assert.equal(trickWinner(t),1)});
test('state view hides other hands',()=>{const g=createGame({playerCount:4,seed:1});const v=stateForSeat(g,2);assert.ok(v.hands[2][0].id);assert.equal(v.hands[0][0].hidden,true)});
test('automated legal play can finish a hand without card duplication',()=>{const g=createGame({playerCount:4,seed:2,mission:{tasks:[{type:'win-tricks',seat:0,count:99}]}});let guard=100;while(g.status==='playing'&&guard--){const seat=g.currentPlayer;const legal=legalCards(g.hands[seat],g.trick);playCard(g,seat,legal[0].id);const chk=validateState(g);assert.equal(chk.unique,true);assert.equal(chk.total,40)}assert.ok(guard>0);assert.equal(g.status,'failed')});
