import test from 'node:test';import assert from 'node:assert/strict';
import {LEVELS,createGame,spawnEnemy} from '../dist/engine.js';
import {MODELS} from '../dist/models.js';
import {SPECIES_TYPES,effectiveness} from '../dist/type-chart.js';

test('each region enemy has a model, type matchup, and complete spawn stats',()=>{
  for(const [stage,region] of LEVELS.entries())for(const kind of region.enemies){
    assert.ok(MODELS[kind]);assert.ok(SPECIES_TYPES[kind]?.length);
    const g=createGame();g.stage=stage;const enemy=spawnEnemy(g,kind);
    assert.ok(Number.isFinite(enemy.hp)&&enemy.hp>0);assert.ok(Number.isFinite(enemy.speed)&&enemy.speed>0);
    assert.deepEqual(enemy.types,SPECIES_TYPES[kind]);
  }
});

test('every region contains a Fire weakness and opening waves retain mixed matchups',()=>{
  for(const region of LEVELS)assert.ok(region.enemies.some(kind=>effectiveness('FIRE',SPECIES_TYPES[kind])>1));
  const g=createGame('charmander',4721),seen=new Set();
  for(let i=0;i<100;i++)seen.add(spawnEnemy(g).kind);
  assert.ok(seen.has('paras'));assert.ok(seen.has('geodude'));assert.ok(seen.has('gastly'));
});
