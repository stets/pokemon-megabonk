import test from 'node:test';
import assert from 'node:assert/strict';
import { groundHeight } from '../dist/terrain.js';
import { easeCamera, turnCamera } from '../dist/camera-motion.js';
import { createGame, step, applyUpgrade } from '../dist/engine.js';

test('hilltops rise above the flat spawn clearing', () => {
  assert.ok(Math.abs(groundHeight(0, 0)) < .01);
  assert.ok(groundHeight(-23, -18) > 5);
  assert.ok(groundHeight(18, 22) > 5);
  for (let x = -53; x <= 53; x += 2) for (let z = -53; z <= 53; z += 2) assert.ok(Number.isFinite(groundHeight(x, z)));
});

test('Ctrl sliding accelerates downhill, stays bounded and stops on release', () => {
  const g = createGame(); g.spawnTimer = 1e6; g.moves = [];
  g.player.x = -16; g.player.z = -18;
  const initialHeight = groundHeight(g.player.x, g.player.z);
  for (let i = 0; i < 120; i++) step(g, { slide: true }, 1 / 60);
  assert.ok(groundHeight(g.player.x, g.player.z) < initialHeight - 1);
  assert.ok(Math.hypot(g.player.slideX, g.player.slideZ) <= 19);
  const x = g.player.x, z = g.player.z;
  step(g, {}, 1 / 60);
  assert.equal(g.player.sliding, false); assert.equal(g.player.x, x); assert.equal(g.player.z, z);
});

test('shrines charge only in range and grant exactly one upgrade', () => {
  const g = createGame(); g.spawnTimer = 1e6; g.moves = [];
  g.player.hp = g.player.maxHp = 1e6;
  const shrine = g.shrines[0]; g.player.x = shrine.x; g.player.z = shrine.z;
  step(g, { interact: true }); assert.equal(shrine.active, true);
  g.player.x = 0; g.player.z = 0; const charge = shrine.charge;
  for (let i = 0; i < 120; i++) step(g);
  assert.equal(shrine.charge, charge);
  g.player.x = shrine.x; g.player.z = shrine.z;
  for (let i = 0; i < 365; i++) step(g);
  assert.equal(shrine.completed, true); assert.equal(g.status, 'upgrade'); assert.equal(g.upgradeSource, 'shrine');
  applyUpgrade(g, g.choices[0].id); step(g, { interact: true }); assert.equal(g.status, 'playing');
});

test('camera eases at the same rate across frame rates and clamps pitch', () => {
  const a = { yaw: 0, pitch: .5, targetYaw: 0, targetPitch: .5 }, b = { ...a };
  turnCamera(a, 100, 10000); turnCamera(b, 100, 10000);
  assert.equal(a.targetPitch, 1.15);
  for (let i = 0; i < 60; i++) easeCamera(a, 1 / 60);
  for (let i = 0; i < 30; i++) easeCamera(b, 1 / 30);
  assert.ok(Math.abs(a.yaw - b.yaw) < 1e-10); assert.ok(Math.abs(a.pitch - b.pitch) < 1e-10);
  assert.ok(a.yaw > a.targetYaw && a.yaw < 0);
});
