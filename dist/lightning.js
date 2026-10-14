export function lightningPath(a, b, seed = 0) {
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
  const width = Math.min(26, length * .12), points = [a];
  for (let i = 1; i < 12; i++) {
    const t = i / 12, noise = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const offset = ((noise - Math.floor(noise)) * 2 - 1) * width;
    points.push({ x: a.x + dx * t - dy / length * offset, y: a.y + dy * t + dx / length * offset });
  }
  points.push(b); return points;
}

export function drawLightning(ctx, a, b, color, seed) {
  const points = lightningPath(a, b, seed);
  const stroke = (path, width, ink) => {
    ctx.strokeStyle = ink; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (const point of path.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  stroke(points, 9, '#d8a52f'); stroke(points, 5, color); stroke(points, 2, '#fffbe3');
  for (const i of [3, 6, 9]) {
    const point = points[i], side = i % 2 ? 1 : -1;
    const branch = lightningPath(point, { x: point.x + side * 16, y: point.y - 22 }, seed + i);
    stroke(branch, 2, '#fff5b3');
  }
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + seed;
    stroke([b, { x: b.x + Math.cos(angle) * 13, y: b.y + Math.sin(angle) * 13 }], 2, '#fff5b3');
  }
  ctx.shadowBlur = 0;
}
