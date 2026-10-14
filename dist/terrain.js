export const ARENA_RADIUS = 108;
export const WATER_LEVEL = -.12;
export const riverCenter = z => 33 + Math.sin(z * .09) * 2;
// Shared by movement, collision, scenery and the terrain mesh.
export function groundHeight(x, z) {
  const hill = (cx, cz, height, width) => height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (width * width));
  const clearing = 1 - Math.exp(-(x * x + z * z) / 90);
  const ridges = hill(-23, -18, 7, 12) + hill(18, 22, 6, 13) + hill(-27, 26, 4.8, 10) + hill(8, -35, 5, 11)
    + hill(-60, -48, 9, 22) + hill(63, 46, 8, 20) + hill(48, -64, 7, 18) + hill(-66, 45, 6, 19);
  const waves = 1.1 * Math.sin(x * .105) * Math.sin(z * .09);
  const bankDistance = Math.abs(x - riverCenter(z));
  const t = Math.max(0, Math.min(1, (bankDistance - 3.4) / 3.6)), river = 1 - t * t * (3 - 2 * t);
  return (ridges + waves) * clearing * (1 - river) - river * .75;
}

export function waterDepth(x, z) {
  return Math.abs(x - riverCenter(z)) < 3.7 ? Math.max(0, WATER_LEVEL - groundHeight(x, z)) : 0;
}

export function groundSlope(x, z) {
  const d = .2;
  return { x: (groundHeight(x + d, z) - groundHeight(x - d, z)) / (2 * d),
    z: (groundHeight(x, z + d) - groundHeight(x, z - d)) / (2 * d) };
}
