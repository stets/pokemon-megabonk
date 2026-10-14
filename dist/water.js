export class RiverWaves {
  constructor(width = 9, length = 161) {
    this.width = width; this.length = length; this.heights = new Float32Array(width * length); this.velocities = new Float32Array(width * length); this.accumulator = 0;
  }
  disturb(x, z, force = .12) {
    x = Math.max(1, Math.min(this.width - 2, Math.round(x))); z = Math.max(1, Math.min(this.length - 2, Math.round(z)));
    this.velocities[z * this.width + x] += force;
  }
  update(dt) {
    this.accumulator += Math.min(.05, Math.max(0, dt));
    while (this.accumulator >= 1 / 60) {
      const w = this.width, h = this.heights, v = this.velocities;
      for (let z = 1; z < this.length - 1; z++) for (let x = 1; x < w - 1; x++) {
        const i = z * w + x, laplacian = h[i - 1] + h[i + 1] + h[i - w] + h[i + w] - 4 * h[i];
        v[i] = (v[i] + laplacian * .22 - h[i] * .015) * .975;
      }
      for (let i = 0; i < h.length; i++) h[i] = Math.max(-.15, Math.min(.15, h[i] + v[i]));
      this.accumulator -= 1 / 60;
    }
  }
}
