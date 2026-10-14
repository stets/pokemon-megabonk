// Authored hamlet layout: routes, plazas and building footprints are shared
// between visuals and collision. Coordinates are original to this project.
export const BUILDINGS = [
  { x: -12, z: -5, w: 5, d: 4, roof: '#c96c59' },
  { x: 10, z: -7, w: 5, d: 4, roof: '#5979aa' },
  { x: -14, z: 10, w: 6, d: 4, roof: '#a88959' },
  { x: 14, z: 11, w: 6, d: 5, roof: '#c96c59' },
  { x: -47, z: -28, w: 5, d: 4, roof: '#5979aa' },
  { x: 47, z: 25, w: 7, d: 5, roof: '#a88959' },
];

export function avoidBuildings(actor, radius) {
  for (const b of BUILDINGS) {
    const dx = actor.x - b.x, dz = actor.z - b.z, ex = b.w / 2 + radius, ez = b.d / 2 + radius;
    if (Math.abs(dx) >= ex || Math.abs(dz) >= ez) continue;
    const pushX = ex - Math.abs(dx), pushZ = ez - Math.abs(dz);
    if (pushX < pushZ) actor.x = b.x + (dx >= 0 ? ex : -ex);
    else actor.z = b.z + (dz >= 0 ? ez : -ez);
  }
}

export function buildRegion(T, material, height) {
  const root = new T.Group();
  const box = (w, h, d, x, y, z, color) => {
    const object = new T.Mesh(new T.BoxGeometry(w, h, d), material(color));
    object.position.set(x, y, z); object.castShadow = object.receiveShadow = true; root.add(object); return object;
  };
  for (const b of BUILDINGS) {
    const base = height(b.x, b.z);
    box(b.w + .3, .3, b.d + .3, b.x, base + .15, b.z, '#5b6671');
    box(b.w, 3, b.d, b.x, base + 1.8, b.z, '#e3dbb6');
    // Two sloped roof panels, with stepped tile rows and dark eaves.
    for (const side of [-1, 1]) {
      const roof = box(b.w + .6, .24, b.d * .62, b.x, base + 3.75, b.z + side * b.d * .24, b.roof);
      roof.rotation.x = side * .45;
      for (let i = 0; i < 4; i++) {
        const z = b.z + side * (i * b.d * .12 + .1), y = base + 4.2 - i * .22;
        box(b.w + .6, .07, .08, b.x, y, z, '#624c4a');
      }
    }
    box(1, 1.9, .09, b.x, base + 1.25, b.z + b.d / 2 + .06, '#527773');
    box(.15, .15, .08, b.x + .3, base + 1.3, b.z + b.d / 2 + .12, '#e6c476');
    for (const side of [-1, 1]) {
      box(1.15, 1, .12, b.x + side * b.w * .3, base + 2, b.z + b.d / 2 + .08, '#475b76');
      box(.95, .78, .14, b.x + side * b.w * .3, base + 2, b.z + b.d / 2 + .1, '#87cbd6');
      box(.07, .78, .16, b.x + side * b.w * .3, base + 2, b.z + b.d / 2 + .13, '#edf0cc');
    }
    for (const y of [.55, 1.5, 2.65]) box(b.w, .08, b.d + .04, b.x, base + y, b.z, '#b9b6a5');
    box(.7, .65, .7, b.x + b.w * .25, base + 4.5, b.z - .4, '#8e6c5e');
    box(.5, .4, .5, b.x - b.w * .6, base + .9, b.z + b.d * .55, '#d3ded4');
    box(.1, .7, .1, b.x - b.w * .6, base + .4, b.z + b.d * .55, '#806c52');
  }
  for (let i = 0; i < 10; i++) {
    const x = -6 + i * 1.2, z = 15;
    box(.1, .8, .15, x, height(x, z) + .4, z, '#eee9d3');
    box(1.2, .12, .1, x + .55, height(x, z) + .45, z, '#c8cbbc');
  }
  return root;
}
