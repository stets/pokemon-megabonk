import { groundHeight } from './terrain.js?v=14';

export function safeCameraPosition(target, candidate) {
  let fraction = 1;
  // Shorten the orbit arm at the first obstruction. Raising it can turn a
  // low-angle view into an unwanted top-down camera near steep slopes.
  for (let i = 1; i <= 24; i++) {
    const t = i / 24, x = target.x + (candidate.x - target.x) * t, z = target.z + (candidate.z - target.z) * t;
    const y = target.y + (candidate.y - target.y) * t;
    if (groundHeight(x, z) + .35 > y) { fraction = Math.max(.08, (i - 1) / 24); break; }
  }
  const x = target.x + (candidate.x - target.x) * fraction, z = target.z + (candidate.z - target.z) * fraction;
  return { x, z, y: Math.max(target.y + (candidate.y - target.y) * fraction, groundHeight(x, z) + .45) };
}

export function easeCamera(camera, dt) {
  const blend = 1 - Math.exp(-10 * dt);
  camera.yaw += (camera.targetYaw - camera.yaw) * blend;
  camera.pitch += (camera.targetPitch - camera.pitch) * blend;
}

export function turnCamera(camera, dx, dy, settings = {}) {
  const sensitivity = settings.sensitivity ?? 1;
  camera.targetYaw -= dx * .0045 * sensitivity * (settings.invertX ? -1 : 1);
  // Raising the orbit camera points it down; mouse-up therefore lowers pitch.
  camera.targetPitch = Math.max(.16, Math.min(1.15,
    camera.targetPitch + dy * .0038 * sensitivity * (settings.invertY ? -1 : 1)));
}
