import { ALL_BUILDINGS, avoidBuildings } from './regions.js?v=15';

function placements() {
  let state = 91277;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) | 0; return (state >>> 0) / 4294967296; };
  const trees = [], rocks = [], all = [];
  for (const [kind, output, count] of [['tree', trees, 150], ['rock', rocks, 125]]) {
    for (let attempt = 0; output.length < count && attempt < 5000; attempt++) {
      const a = random() * Math.PI * 2, r = 17 + random() * 90, x = Math.cos(a) * r, z = Math.sin(a) * r, size = .65 + random() * 1.2;
      const clearance = kind === 'tree' ? size * 1.8 : size;
      if (Math.abs(z - Math.sin(x * .1) * 3) < 3 || Math.abs(x - 33 - Math.sin(z * .09) * 2) < 5) continue;
      if (ALL_BUILDINGS.some(b => Math.abs(x - b.x) < b.w / 2 + clearance + 3 && Math.abs(z - b.z) < b.d / 2 + clearance + 3)) continue;
      if (all.some(o => Math.hypot(x - o.x, z - o.z) < clearance + o.clearance + 1)) continue;
      const object = { kind, x, z, size, clearance, radius: kind === 'tree' ? .35 * size : .9 * size, height: kind === 'tree' ? 3.3 * size : 1.15 * size };
      output.push(object); all.push(object);
    }
  }
  return { trees, rocks, all };
}
export const SCENERY = placements();
const grid = new Map(), CELL = 12;
for (const o of SCENERY.all) {
  const key = `${Math.floor(o.x / CELL)},${Math.floor(o.z / CELL)}`;
  if (!grid.has(key)) grid.set(key, []); grid.get(key).push(o);
}
function* nearby(x, z) {
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) yield* (grid.get(`${cx + dx},${cz + dz}`) ?? []);
}

export function moveWithCollisions(actor, from, radius = .5, stage = 0) {
  const dx = actor.x - from.x, dz = actor.z - from.z, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .2));
  actor.x = from.x; actor.z = from.z;
  for (let i = 0; i < steps; i++) {
    actor.x += dx / steps; actor.z += dz / steps;
    for (const obstacle of nearby(actor.x, actor.z)) {
      if ((actor.y ?? 0) > obstacle.height + .3) continue;
      const ox = actor.x - obstacle.x, oz = actor.z - obstacle.z, distance = Math.hypot(ox, oz), limit = radius + obstacle.radius;
      if (distance >= limit) continue;
      actor.x = obstacle.x + (distance ? ox / distance : 1) * limit;
      actor.z = obstacle.z + (distance ? oz / distance : 0) * limit;
    }
    avoidBuildings(actor, radius, stage);
  }
}
