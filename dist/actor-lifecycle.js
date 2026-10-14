// Actor-owned resources are separate from the shared species meshes/textures.
export function releaseActor(actor) {
  actor.mixer.stopAllAction(); actor.mixer.uncacheRoot(actor.model); actor.root.removeFromParent();
  for (const skeleton of actor.skeletons) skeleton.dispose();
  for (const material of new Set(actor.materials.map(entry => entry.material))) material.dispose();
}

export function playAnimation(actor, name, instant = false) {
  const clip = actor.clips.get(name) || actor.clips.get('walk') || actor.clips.get('idle') || actor.clips.values().next().value;
  if (!clip) return;
  let next = actor.actions.get(clip.name);
  if (!next) { next = actor.mixer.clipAction(clip); actor.actions.set(clip.name, next); }
  if (next === actor.action) return;
  if (actor.fadingAction && actor.fadingAction !== next) actor.fadingAction.stop();
  actor.fadingAction = null;
  const previous = actor.action;
  next.reset().setEffectiveWeight(1).setEffectiveTimeScale(name === 'run' ? .85 : 1).play();
  if (previous) {
    if (instant) previous.stop();
    else { next.crossFadeFrom(previous, .18, true); actor.fadingAction = previous; actor.fadeLeft = .18; }
  }
  actor.action = next;
}

export function finishAnimationFade(actor, dt) {
  if (!actor.fadingAction) return;
  actor.fadeLeft -= dt;
  if (actor.fadeLeft <= 0) { actor.fadingAction.stop(); actor.fadingAction = null; }
}
