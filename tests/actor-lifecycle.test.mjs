import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseActor, playAnimation, finishAnimationFade } from '../dist/actor-lifecycle.js';

test('actor cleanup frees each owned GPU resource once without disposing shared meshes or textures', () => {
  const calls = [];
  const sharedGeometry = { dispose() { throw new Error('Shared geometry must survive another actor'); } };
  const sharedTexture = { dispose() { throw new Error('Shared texture must survive another actor'); } };
  const skeleton = { dispose() { calls.push('skeleton'); } };
  const material = { map: sharedTexture, dispose() { calls.push('material'); } };
  const model = { geometry: sharedGeometry };
  releaseActor({ model, mixer: { stopAllAction() { calls.push('stop'); }, uncacheRoot(root) { assert.equal(root, model); calls.push('uncache'); } },
    root: { removeFromParent() { calls.push('remove'); } }, skeletons: new Set([skeleton, skeleton]), materials: [{ material }, { material }] });
  assert.deepEqual(calls, ['stop', 'uncache', 'remove', 'skeleton', 'material']);
});

test('hundreds of idle/run transitions bind only the two used clips and stop faded actions', () => {
  let bindings = 0;
  const actor = { clips: new Map(['idle', 'run', 'attack', 'sleep', 'happy'].map(name => [name, { name }])), actions: new Map(),
    action: null, fadingAction: null, fadeLeft: 0, mixer: { clipAction(clip) {
      bindings++;
      return { name: clip.name, playing: false, reset() { return this; }, setEffectiveWeight() { return this; }, setEffectiveTimeScale() { return this; },
        play() { this.playing = true; return this; }, stop() { this.playing = false; return this; }, crossFadeFrom() { return this; } };
    } } };
  playAnimation(actor, 'idle', true);
  for (let i = 0; i < 300; i++) {
    playAnimation(actor, i % 2 ? 'idle' : 'run'); finishAnimationFade(actor, .2);
    assert.equal(actor.fadingAction, null);
    assert.equal([...actor.actions.values()].filter(a => a.playing).length, 1);
  }
  assert.equal(bindings, 2); assert.equal(actor.actions.size, 2);
});
