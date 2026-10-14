export const ARENA_RADIUS = 108;
// Shared by movement, collision, scenery and the terrain mesh.
export function groundHeight(x, z) {
  const hill = (cx, cz, height, width) => height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (width * width));
  const clearing = 1 - Math.exp(-(x * x + z * z) / 90);
  const ridges = hill(-23, -18, 7, 12) + hill(18, 22, 6, 13) + hill(-27, 26, 4.8, 10) + hill(8, -35, 5, 11)
    + hill(-60, -48, 9, 22) + hill(63, 46, 8, 20) + hill(48, -64, 7, 18) + hill(-66, 45, 6, 19);
  const waves = 1.1 * Math.sin(x * .105) * Math.sin(z * .09);
  const river = Math.exp(-(((x - 33 - Math.sin(z * .09) * 2) / 5) ** 2));
  return (ridges + waves) * clearing * (1 - river) - river * .5;
}

export function groundSlope(x, z) {
  const d = .2;
  return { x: (groundHeight(x + d, z) - groundHeight(x - d, z)) / (2 * d),
    z: (groundHeight(x, z + d) - groundHeight(x, z - d)) / (2 * d) };
}
