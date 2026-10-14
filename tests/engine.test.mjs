import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, spawnEnemy, applyUpgrade, makeChoices, STARTERS } from '../dist/engine.js';

function isolated(starter = 'pikachu') { const g = createGame(starter, 123); g.spawnTimer = 1e6; return g; }
function advance(g, seconds, input = {}) { for (let i = 0; i < Math.ceil(seconds * 60); i++) step(g, input, 1 / 60); }

test('all four starters initialize their signature move and independent stats', () => {
  for (const [id, data] of Object.entries(STARTERS)) {
    const g = createGame(id, 1);
    assert.equal(g.moves[0].id, data.move); assert.equal(g.player.hp, data.hp);
    assert.equal(g.player.maxHp, data.hp); assert.equal(g.player.speed, data.speed);
  }
  const a = createGame(), b = createGame(); a.enemies.push({}); assert.equal(b.enemies.length, 0);
});
test('diagonal movement has the same speed as straight movement and stays inside arena', () => {
  const straight = isolated(), diagonal = isolated();
  advance(straight, 1, { x: 1 }); advance(diagonal, 1, { x: 1, z: 1 });
  assert.ok(Math.abs(straight.player.x - Math.hypot(diagonal.player.x, diagonal.player.z)) < .001);
  advance(straight, 12, { x: 1 }); assert.ok(Math.hypot(straight.player.x, straight.player.z) <= 53.001);
});
test('enemies pursue the player and automatic attacks respect range', () => {
  const g = isolated(); const far = spawnEnemy(g, 'geodude', { x: 20, z: 0 });
  advance(g, 1); assert.ok(far.x < 20); assert.equal(far.hp, far.maxHp);
  const close = spawnEnemy(g, 'gastly', { x: 5, z: 0 }); advance(g, .6);
  assert.ok(close.hp < close.maxHp); assert.ok(g.events.includes('attack'));
});
test('all signature moves can damage a stationary nearby enemy', () => {
  for (const id of Object.keys(STARTERS)) {
    const g = isolated(id); const enemy = spawnEnemy(g, 'gastly', { x: 3, z: 0 }); enemy.speed = 0;
    advance(g, 1.3); assert.ok(enemy.hp < enemy.maxHp, `${id} failed to attack`);
  }
});
test('contact damage has invulnerability frames and dash prevents contact damage', () => {
  const g = isolated(); g.moves = []; spawnEnemy(g, 'geodude', { x: .1, z: 0 });
  step(g, {}, 1 / 60); const hp = g.player.hp;
  advance(g, .3); assert.equal(g.player.hp, hp);
  const d = isolated(); d.moves = []; spawnEnemy(d, 'geodude', { x: 0, z: 0 });
  step(d, { dash: true, x: 1 }, 1 / 60); assert.equal(d.player.hp, d.player.maxHp); assert.ok(d.player.dashCooldown > 0);
});
test('collecting XP pauses the game and choosing an upgrade resumes it once', () => {
  const g = isolated(); g.drops.push({ x: 0, z: 0, kind: 'xp', value: 7 });
  step(g); assert.equal(g.level, 2); assert.equal(g.status, 'upgrade'); assert.equal(g.choices.length, 3);
  const before = g.time; advance(g, 1); assert.equal(g.time, before);
  const id = g.choices[0].id; assert.equal(applyUpgrade(g, id), true); assert.equal(g.status, 'playing'); assert.equal(applyUpgrade(g, id), false);
});
test('evolution at level eight restores HP and increases max health', () => {
  const g = isolated('bulbasaur'); g.level = 7; g.xp = g.xpNext; g.player.hp = 20;
  step(g); assert.equal(g.level, 8); assert.equal(g.evolved, true); assert.equal(g.player.maxHp, 145); assert.equal(g.player.hp, 145);
});
test('chests require coins, consume their cost, and cannot be reopened', () => {
  const g = isolated(); const c = g.chests[0]; g.player.x = c.x; g.player.z = c.z;
  step(g, { interact: true }); assert.equal(c.opened, false);
  g.gold = 20; step(g, { interact: true }); assert.equal(g.gold, 5); assert.equal(c.opened, true); assert.equal(g.status, 'upgrade');
  applyUpgrade(g, g.choices[0].id); step(g, { interact: true }); assert.equal(g.status, 'playing'); assert.equal(g.gold, 5);
});
test('wave escalation and final boss are triggered once, victory requires its defeat', () => {
  const g = isolated(); g.player.hp = 1e9; g.player.maxHp = 1e9;
  g.time = 149.99; step(g, {}, .02); assert.equal(g.wave, 6); assert.equal(g.enemies.filter(e => e.kind === 'mewtwo').length, 1);
  advance(g, .1); assert.equal(g.enemies.filter(e => e.kind === 'mewtwo').length, 1);
  g.time = 180; step(g); assert.equal(g.status, 'playing');
  g.finalBossDead = true; step(g); assert.equal(g.status, 'won');
});
test('death freezes simulation and a new run resets progression', () => {
  const g = isolated(); g.moves = []; g.player.hp = 1; spawnEnemy(g, 'geodude', { x: .1, z: 0 });
  step(g); assert.equal(g.status, 'dead'); const time = g.time; advance(g, 1); assert.equal(g.time, time);
  const next = createGame(); assert.equal(next.status, 'playing'); assert.equal(next.level, 1); assert.equal(next.kills, 0); assert.equal(next.time, 0);
});
test('invalid upgrade requests do not mutate a build', () => {
  const g = isolated(); makeChoices(g); assert.equal(applyUpgrade(g, 'invented'), false); assert.equal(g.status, 'upgrade'); assert.equal(g.stats.damage, 1);
});
test('seeded three-minute combat simulation stays finite through repeated upgrades', () => {
  const g = createGame('pikachu', 81); g.player.hp = g.player.maxHp = 1e7;
  for (let i = 0; i < 10860; i++) {
    if (g.status === 'upgrade') applyUpgrade(g, g.choices[0].id);
    step(g, { x: Math.sin(i / 300), z: Math.cos(i / 300), dash: i % 240 === 0 }, 1 / 60);
    assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.hp));
  }
  assert.ok(g.time >= 180 || g.status === 'won'); assert.ok(g.kills > 0); assert.ok(g.level > 1); assert.ok(g.enemies.length <= 138);
});
