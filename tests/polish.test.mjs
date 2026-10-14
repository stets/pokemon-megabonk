import test from 'node:test';
import assert from 'node:assert/strict';
import { ControllerInput, stickAxes } from '../dist/controller.js';
import { loadSettings, saveSettings } from '../dist/settings.js';
import { turnCamera, safeCameraPosition } from '../dist/camera-motion.js';
import { groundHeight } from '../dist/terrain.js';
import { SCENERY, moveWithCollisions } from '../dist/obstacles.js';
import { lightningPath } from '../dist/lightning.js';
import { musicBpm } from '../dist/audio.js';
import { createGame, spawnEnemy, step, applyUpgrade, MOVES } from '../dist/engine.js';
import { RiverWaves } from '../dist/water.js';
import { waterDepth, riverCenter } from '../dist/terrain.js';

test('saved camera preferences survive reload, tolerate corrupt storage, and reverse both axes', () => {
  let value; const storage = { getItem: () => value, setItem: (key, next) => { value = next; } };
  assert.deepEqual(loadSettings(storage), { invertX: false, invertY: false, sensitivity: 1 });
  saveSettings(storage, { invertX: true, invertY: true, sensitivity: 1.4 });
  const settings = loadSettings(storage), normal = { targetYaw: 0, targetPitch: .5 }, inverted = { ...normal };
  turnCamera(normal, 10, -10); turnCamera(inverted, 10, -10, settings);
  assert.ok(normal.targetYaw < 0 && inverted.targetYaw > 0);
  assert.ok(normal.targetPitch < .5 && inverted.targetPitch > .5);
  value = '{broken'; assert.equal(loadSettings(storage).sensitivity, 1);
});

test('controller ignores stick drift, registers button edges once, and resets on disconnect', () => {
  assert.deepEqual(stickAxes(.1, -.1), { x: 0, y: 0 });
  assert.ok(Math.hypot(...Object.values(stickAxes(1, 1))) <= 1.00001);
  const input = new ControllerInput(), pad = { id: 'test', connected: true, mapping: 'standard', axes: [1, 0, .5, -.5], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })) };
  const first = input.poll([pad], 0); assert.ok(first.pressed.has(0)); assert.equal(first.navX, 1);
  assert.ok(!input.poll([pad], .01).pressed.has(0)); assert.equal(input.poll([pad], .1).navX, 0);
  assert.equal(input.poll([], .2).connected, false); assert.ok(input.poll([pad], .3).pressed.has(0));
});

test('low camera arms clear hill geometry by getting closer instead of rising overhead', () => {
  for (const [x, z] of [[-16, -18], [18, 22], [-60, -48], [63, 46]]) {
    const target = { x, z, y: groundHeight(x, z) + 1 };
    const candidate = { x: x - 14, z: z - 3, y: target.y + 1.5 };
    const result = safeCameraPosition(target, candidate);
    assert.ok(result.y >= groundHeight(result.x, result.z) + .44);
    assert.ok(result.y <= candidate.y + .5);
    for (let i = 1; i <= 20; i++) {
      const t = i / 20, px = x + (result.x - x) * t, pz = z + (result.z - z) * t;
      assert.ok(target.y + (result.y - target.y) * t > groundHeight(px, pz), 'camera ray entered terrain');
    }
  }
});

test('scenery spacing prevents tree/rock intersections and fast movement cannot tunnel through trunks', () => {
  for (let i = 0; i < SCENERY.all.length; i++) for (let j = i + 1; j < SCENERY.all.length; j++) {
    const a = SCENERY.all[i], b = SCENERY.all[j]; assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= a.clearance + b.clearance + .99);
  }
  const trunk = SCENERY.trees[0], from = { x: trunk.x - 4, z: trunk.z }, actor = { x: trunk.x + 4, z: trunk.z, y: 0 };
  moveWithCollisions(actor, from); assert.ok(actor.x < trunk.x); assert.ok(Math.hypot(actor.x - trunk.x, actor.z - trunk.z) >= trunk.radius + .49);
});

test('lightning has jagged intermediate points and exact endpoints', () => {
  const a = { x: 0, y: 0 }, b = { x: 200, y: 0 }, path = lightningPath(a, b, 7);
  assert.deepEqual(path[0], a); assert.deepEqual(path.at(-1), b);
  assert.ok(path.slice(1, -1).some(p => Math.abs(p.y) > 5));
});

test('music tempo ramps with campaign depth and stays bounded', () => {
  assert.equal(musicBpm('lobby'), 104);
  assert.equal(musicBpm('playing', 0), 118); assert.equal(musicBpm('playing', 1), 178);
  assert.ok(musicBpm('playing', .7) > musicBpm('playing', .2)); assert.equal(musicBpm('playing', 5), 178);
});

test('breakable Pokeballs drop diamonds without counting as enemy kills', () => {
  const g = createGame(); g.spawnTimer = 1e6; const ball = g.pokeballs[0]; ball.x = 3; ball.z = 0;
  g.pokeballs = [ball]; g.moves[0].cooldown = 0;
  step(g); assert.equal(ball.broken, true); assert.equal(g.kills, 0);
  assert.equal(g.drops.filter(d => d.kind === 'xp').reduce((sum, d) => sum + d.value, 0) + g.xp, 3);
  assert.ok(g.events.includes('supply-broken'));
});

test('crit equipment has bounded stacking and actual damage produces a critical label', () => {
  const g = createGame(); g.spawnTimer = 1e6; g.pokeballs = [];
  for (let i = 0; i < 30; i++) for (const id of ['crit-chance', 'crit-damage']) {
    g.status = 'upgrade'; g.choices = [{ id }]; applyUpgrade(g, id);
  }
  assert.equal(g.stats.critChance, .5); assert.equal(g.stats.critMultiplier, 3);
  const enemy = spawnEnemy(g, 'gastly', { x: 3, z: 0 }); enemy.speed = 0; enemy.hp = enemy.maxHp = 1000;
  g.rng = () => 0; g.moves[0].cooldown = 0; step(g);
  assert.equal(g.combat.criticalHits, 1); assert.equal(enemy.hp, 1000 - MOVES.thunder.damage * 3); assert.ok(g.numbers[0].label.includes('CRIT'));
});

test('river disturbances propagate and stay finite, while swimmers float and drift', () => {
  const river = new RiverWaves(); river.disturb(4, 80, .1);
  for (let i = 0; i < 120; i++) river.update(1 / 60);
  assert.ok(river.heights.some(v => Math.abs(v) > .0001));
  assert.ok([...river.heights].every(v => Number.isFinite(v) && Math.abs(v) <= .151));
  const g = createGame(); g.moves = []; g.pokeballs = []; g.spawnTimer = 1e6;
  g.player.x = riverCenter(0); g.player.z = 0;
  for (let i = 0; i < 60; i++) step(g, {}, 1 / 60);
  assert.ok(g.player.y >= waterDepth(g.player.x, g.player.z) - .3);
  assert.ok(g.player.z > .5);
});

test('later waves add evolved rock enemies without removing Geodude', () => {
  const g = createGame(); g.stageTime = 130;
  const kinds = new Set();
  for (let i = 0; i < 80; i++) kinds.add(spawnEnemy(g).kind);
  assert.ok(kinds.has('geodude') && kinds.has('graveler') && kinds.has('golem'));
});

test('Capture Ranger miniboss spawns once and telegraphs a temporary capture slow', () => {
  const g = createGame(); g.moves = []; g.pokeballs = []; g.spawnTimer = 1e6;
  g.player.hp = g.player.maxHp = 10000; g.stageTime = 44.99;
  step(g, {}, .02); assert.equal(g.enemies.filter(e => e.kind === 'ranger').length, 1);
  const ranger = g.enemies.find(e => e.kind === 'ranger'); ranger.x = 6; ranger.z = 0; ranger.speed = 0; ranger.attackTimer = 0;
  step(g); assert.equal(g.captureZones.length, 1); assert.equal(g.player.capturedTime, 0);
  for (let i = 0; i < 75; i++) step(g);
  assert.ok(g.player.capturedTime > 0); assert.equal(g.enemies.filter(e => e.kind === 'ranger').length, 1);
  g.enemies = []; g.bullets = [];
  for (let i = 0; i < 120; i++) step(g);
  assert.equal(g.player.capturedTime, 0);
});

test('Mewtwo arrival alert survives unrelated notices and pauses', () => {
  const g = createGame(); g.stage = 2; g.stageTime = 149.99; g.spawnTimer = 1e6; g.rangerStages = [45, 105]; g.bossStages = [60, 120];
  step(g, {}, .02); assert.equal(g.bossAlert.name, 'MEWTWO'); assert.equal(g.bossAlert.remaining, 6);
  g.notice = 'EVOLUTION'; g.status = 'upgrade'; const remaining = g.bossAlert.remaining;
  step(g, {}, .05); assert.equal(g.bossAlert.name, 'MEWTWO'); assert.equal(g.bossAlert.remaining, remaining);
});

test('unlanded projectile expiry increments misses separately from immunity', () => {
  const g = createGame(); g.moves = []; g.pokeballs = []; g.spawnTimer = 1e6;
  g.bullets.push({ x: 0, z: 0, vx: 1, vz: 0, radius: .2, life: .001, enemy: false, type: 'WATER', damage: 10, color: '#fff', hitIds: new Set(), pierce: 1 });
  step(g); assert.equal(g.combat.shotsMissed, 1); assert.equal(g.combat.immuneHits, 0);
  const enemy = spawnEnemy(g, 'geodude', { x: 2, z: 0 }); enemy.speed = 0;
  g.bullets.push({ x: 1.5, z: 0, vx: 1, vz: 0, radius: .2, life: 1, enemy: false, type: 'ELECTRIC', damage: 10, color: '#fff', hitIds: new Set(), pierce: 1 });
  step(g); assert.equal(g.combat.shotsMissed, 1); assert.equal(g.combat.immuneHits, 1); assert.equal(g.combat.shotsHit, 1);
});
