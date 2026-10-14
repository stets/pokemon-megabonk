import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveness, SPECIES_TYPES } from '../dist/type-chart.js';
import { createGame, spawnEnemy, step, makeChoices, applyUpgrade, MOVES } from '../dist/engine.js';

test('modern type chart handles weaknesses, resistances, immunity and dual types', () => {
  assert.equal(effectiveness('WATER', ['GRASS']), .5);
  assert.equal(effectiveness('GRASS', ['ROCK']), 2);
  assert.equal(effectiveness('ROCK', ['ELECTRIC']), 1);
  assert.equal(effectiveness('ELECTRIC', ['GROUND']), 0);
  assert.equal(effectiveness('GRASS', SPECIES_TYPES.geodude), 4);
  assert.equal(effectiveness('GRASS', SPECIES_TYPES.zubat), .25);
  assert.equal(effectiveness('GHOST', SPECIES_TYPES.pidgey), 0);
  assert.equal(effectiveness('GHOST', SPECIES_TYPES.mewtwo), 2);
  assert.throws(() => effectiveness('TYPO', ['GRASS']));
});

function encounter(moveId, kind) {
  const g = createGame(); g.spawnTimer = 1e6; g.moves = [{ id: moveId, level: 1, cooldown: 0 }];
  const enemy = spawnEnemy(g, kind, { x: 3, z: 0 });
  enemy.hp = enemy.maxHp = 1000; enemy.speed = 0; g.rng = () => .99;
  for (let i = 0; i < 30; i++) step(g, {}, 1 / 60);
  return { g, enemy };
}

test('live beam, area and projectile hits apply type multipliers', () => {
  for (const [move, kind, multiplier] of [
    ['thunder', 'pidgey', 2], ['vine', 'geodude', 4], ['vine', 'zubat', .25],
    ['ember', 'geodude', .5], ['water', 'geodude', 4], ['rock', 'zubat', 2], ['shadow', 'gengar', 2],
  ]) {
    const { g, enemy } = encounter(move, kind);
    const amount = Math.round(MOVES[move].damage * multiplier);
    assert.equal(1000 - enemy.hp, amount, `${move} vs ${kind}`);
    assert.ok(g.numbers.some(n => n.effectiveness === multiplier));
  }
});

test('immune enemies take no damage and display immunity without hit flashing', () => {
  for (const [move, kind] of [['thunder', 'geodude'], ['shadow', 'pidgey']]) {
    const { g, enemy } = encounter(move, kind);
    assert.equal(enemy.hp, 1000); assert.equal(enemy.hit, 0); assert.equal(g.kills, 0);
    assert.ok(g.numbers.some(n => n.text === 'IMMUNE'));
  }
});

test('projectiles aim toward vulnerable targets instead of the nearest neutral enemy', () => {
  const g = createGame('squirtle'); g.spawnTimer = 1e6; g.moves[0].cooldown = 0;
  spawnEnemy(g, 'gastly', { x: -2, z: 0 }).speed = 0;
  spawnEnemy(g, 'geodude', { x: 7, z: 0 }).speed = 0;
  step(g); assert.ok(g.bullets[0].vx > 0); assert.equal(g.bullets[0].type, 'WATER');
});

test('level-up generation guarantees a useful counter when one fits the build', () => {
  const g = createGame('pikachu'); spawnEnemy(g, 'geodude', { x: 3, z: 0 });
  makeChoices(g);
  const choice = g.choices[0];
  assert.ok(['move:vine', 'move:water'].includes(choice.id));
  assert.equal(choice.matchup, 'COUNTERS GEODUDE · ×4');
  assert.equal(applyUpgrade(g, choice.id), true);
  assert.ok(g.moves.some(m => m.id === choice.id.slice(5)));
});


test('a vulnerable region boss receives attacks even while 4x-weak enemies keep spawning', () => {
  const g=createGame('squirtle');g.spawnTimer=1e6;g.moves[0].cooldown=0;
  spawnEnemy(g,'geodude',{x:3,z:0}).speed=0;
  const boss=spawnEnemy(g,'gengar',{x:-7,z:0});boss.speed=0;g.stageBossId=boss.id;
  step(g);assert.ok(g.bullets[0].vx<0);
});

test('region boss priority never diverts an attack from a vulnerable enemy to an immune boss', () => {
  const g=createGame('eevee');g.spawnTimer=1e6;g.moves=[{id:'swift',level:1,cooldown:0}];
  spawnEnemy(g,'pidgey',{x:5,z:0}).speed=0;
  const boss=spawnEnemy(g,'gengar',{x:-3,z:0});boss.speed=0;g.stageBossId=boss.id;
  step(g);assert.ok(g.bullets[0].vx>0);
});
