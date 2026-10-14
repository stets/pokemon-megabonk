import { groundHeight } from './terrain.js?v=10';

export function safeCameraHeight(target, candidate) {
  let height = candidate.y;
  // Raise the boom enough that every sampled section clears the terrain.
  for (let i = 1; i <= 24; i++) {
    const t = i / 24, x = target.x + (candidate.x - target.x) * t, z = target.z + (candidate.z - target.z) * t;
    height = Math.max(height, target.y + (groundHeight(x, z) + .8 - target.y) / t);
  }
  return height;
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
