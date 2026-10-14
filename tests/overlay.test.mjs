import test from 'node:test';
import assert from 'node:assert/strict';
import { paintOverlay } from '../dist/overlay.js';

for (const kind of ['ring', 'burst']) {
  test(`draws a complete ${kind} attack effect`, () => {
    const points = [];
    let strokes = 0;
    const ctx = {
      setTransform() {}, clearRect() {}, beginPath() {},
      moveTo(x, y) { points.push([x, y]); },
      lineTo(x, y) { points.push([x, y]); },
      stroke() { strokes++; },
    };
    const renderer = {
      ctx, dpr: 1, width: 800, heightPx: 600,
      project(x, y, z) { return { x, y: z }; },
    };
    paintOverlay.call(renderer, {
      fx: [{ kind, x: 3, z: 4, radius: 2, life: 1, maxLife: 1, color: '#fff' }],
      enemies: [], numbers: [], player: { x: 0, z: 0 },
    }, 0, false);
    assert.equal(strokes, 1);
    assert.equal(points.length, 33);
    assert.ok(points.flat().every(Number.isFinite));
    assert.ok(Math.hypot(points[0][0] - points[32][0], points[0][1] - points[32][1]) < 1e-10);
    assert.equal(ctx.globalAlpha, 1);
  });
}
