export function easeCamera(camera, dt) {
  const blend = 1 - Math.exp(-10 * dt);
  camera.yaw += (camera.targetYaw - camera.yaw) * blend;
  camera.pitch += (camera.targetPitch - camera.pitch) * blend;
}

export function turnCamera(camera, dx, dy) {
  camera.targetYaw -= dx * .0045;
  camera.targetPitch = Math.max(.16, Math.min(1.15, camera.targetPitch - dy * .0038));
}
