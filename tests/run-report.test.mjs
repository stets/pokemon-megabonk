import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,spawnEnemy,step} from '../dist/engine.js';
import {moveReport,runRecord,normalizeBest,isBetterRun} from '../dist/run-report.js';
function quiet(starter='pikachu'){
 const g=createGame(starter);g.spawnTimer=1e6;g.pokeballs=[];g.moves[0].cooldown=0;g.rng=()=>.99;return g;
}
test('a finishing hit reports only HP removed, with damage and kills attributed to its move',()=>{
 const g=quiet();const e=spawnEnemy(g,'pidgey',{x:3,z:0});e.hp=7;e.speed=0;step(g);
 assert.equal(g.combat.damageDealt,7);assert.equal(g.combat.byMove.thunder.damageDealt,7);
 assert.equal(g.combat.byMove.thunder.kills,1);assert.equal(g.combat.byMove.thunder.hits,1);
 assert.equal(g.combat.byMove.thunder.casts,1);assert.equal(moveReport(g)[0].share,100);
});
test('critical, immune, and projectile contact records stay distinct',()=>{
 const g=quiet();const e=spawnEnemy(g,'pidgey',{x:3,z:0});e.hp=1000;e.speed=0;g.rng=()=>0;step(g);
 assert.equal(g.combat.byMove.thunder.criticalHits,1);assert.equal(g.combat.byMove.thunder.damageDealt,68);
 const immune=quiet();spawnEnemy(immune,'geodude',{x:3,z:0}).speed=0;step(immune);
 assert.equal(immune.combat.byMove.thunder.immuneHits,1);assert.equal(immune.combat.byMove.thunder.hits,0);assert.equal(immune.combat.byMove.thunder.damageDealt,0);
 const water=quiet('squirtle');spawnEnemy(water,'gastly',{x:3,z:0}).speed=0;
 for(let i=0;i<10;i++)step(water,{},1/60);
 assert.equal(water.combat.byMove.water.shotsFired,1);assert.equal(water.combat.byMove.water.shotsHit,1);
 assert.equal(water.combat.byMove.water.hits,1);
});
test('one piercing projectile records multiple hits and one landed shot',()=>{
 const g=quiet('charmander');for(const x of [2,3]){const e=spawnEnemy(g,'oddish',{x,z:0});e.speed=0;}
 for(let i=0;i<12;i++)step(g,{},1/60);
 assert.equal(g.combat.byMove.ember.shotsFired,1);assert.equal(g.combat.byMove.ember.shotsHit,1);assert.equal(g.combat.byMove.ember.hits,2);
});
test('projectiles that expire without contact are attributed as misses exactly once',()=>{
 const g=quiet('squirtle');const e=spawnEnemy(g,'gastly',{x:3,z:0});e.speed=0;step(g);g.enemies=[];
 g.moves[0].cooldown=100;for(let i=0;i<70;i++)step(g,{},1/60);
 assert.equal(g.combat.byMove.water.shotsMissed,1);assert.equal(g.combat.byMove.water.shotsHit,0);assert.equal(g.combat.byMove.water.damageDealt,0);
});
test('reports are zero-safe and preserve individual move contribution',()=>{
 const g=quiet();g.moves.push({id:'water',level:2,cooldown:0});assert.equal(moveReport(g)[0].share,0);
 g.combat.damageDealt=100;g.combat.byMove={thunder:{damageDealt:30,hits:2},water:{damageDealt:70,hits:4}};
 assert.deepEqual(moveReport(g).map(r=>[r.id,r.share,r.hits]),[['thunder',30,2],['water',70,4]]);
 g.stage=2;g.status='won';assert.equal(runRecord(g).areasCleared,3);assert.equal(runRecord(g).won,true);
});
test('victories outrank longer failures, and faster clears outrank slower victories',()=>{
 const win={won:true,areasCleared:3,time:600,kills:1000};const death={won:false,areasCleared:2,time:900,kills:2000};
 assert.equal(isBetterRun(win,death),true);assert.equal(isBetterRun(death,win),false);
 assert.equal(isBetterRun({...win,time:550},win),true);assert.equal(isBetterRun({...win,time:650},win),false);
 assert.equal(isBetterRun({...death,areasCleared:1,time:1000},death),false);
 assert.equal(isBetterRun(win,{time:1200,kills:4000}),true);assert.equal(normalizeBest({time:'broken',kills:3}),null);
});
