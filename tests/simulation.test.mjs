import test from 'node:test';
import assert from 'node:assert/strict';
import { assignTask, createGame, playCard, validateState } from '../src/game.js';
import { CAMPAIGNS, missionFor } from '../src/missions.js';
import { chooseBotCard, chooseBotTask } from '../src/bot.js';

function simulate(campaign,missionNo,playerCount,seed){
  const game=createGame({playerCount,seed,mode:campaign,mission:missionFor(campaign,missionNo,playerCount)});
  let guard=240;
  while(game.status==='playing'&&guard--){
    if(game.phase==='assigning'){
      const seat=game.currentPlayer;const task=chooseBotTask(game,seat);assert.ok(task,`task available in ${campaign}/${missionNo}`);const r=assignTask(game,seat,task.id);assert.equal(r.ok,true);continue;
    }
    const seat=game.currentPlayer;const card=chooseBotCard(game,seat,'hard');assert.ok(card,`legal card available in ${campaign}/${missionNo}`);const r=playCard(game,seat,card.id);assert.equal(r.ok,true);
    const check=validateState(game);assert.equal(check.unique,true);assert.equal(check.total,40);
  }
  assert.ok(guard>0,`simulation deadlocked: ${campaign}/${missionNo}/${playerCount}/${seed}`);
  assert.ok(['won','failed'].includes(game.status));
  return game.status;
}

test('288 deterministic bot simulations terminate without corrupting cards',()=>{
  let count=0;
  for(const c of Object.values(CAMPAIGNS)){
    const missions=[1,Math.ceil(c.missionCount/2),c.missionCount];
    for(const missionNo of missions)for(const players of [2,3,4,5])for(let seed=1;seed<=8;seed++){
      simulate(c.id,missionNo,players,missionNo*1000+players*100+seed);count++;
    }
  }
  assert.equal(count,288);
});
