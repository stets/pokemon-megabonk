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

export const REGION_BUILDINGS = [BUILDINGS, [
  { x: -18, z: -9, w: 7, d: 5, roof: '#a06e49' },
  { x: 19, z: -12, w: 6, d: 5, roof: '#bf8352' },
  ...[[-15, 20], [16, 25], [-43, -30], [52, 18], [-55, 43], [61, -48]].map(([x, z], i) =>
    ({ x, z, w: 3 + i % 2, d: 3, kind: 'spire', roof: '#c58b63' })),
], [
  ...[[-10, -12], [10, -12], [-10, 14], [10, 14], [-48, -30], [51, 27]].map(([x, z]) =>
    ({ x, z, w: 2.5, d: 2.5, kind: 'ruin', roof: '#8abccd' })),
  { x: -22, z: 33, w: 4, d: 3, kind: 'ruin', roof: '#8abccd' },
  { x: 20, z: -38, w: 4, d: 3, kind: 'ruin', roof: '#8abccd' },
]];
export const buildingsForStage = (stage = 0) => REGION_BUILDINGS[stage] ?? BUILDINGS;
// Reserve every footprint so trees never occupy a later region's landmarks.
export const ALL_BUILDINGS = REGION_BUILDINGS.flat();

export function avoidBuildings(actor, radius, stage = 0) {
  for (const b of buildingsForStage(stage)) {
    const dx = actor.x - b.x, dz = actor.z - b.z, ex = b.w / 2 + radius, ez = b.d / 2 + radius;
    if (Math.abs(dx) >= ex || Math.abs(dz) >= ez) continue;
    const pushX = ex - Math.abs(dx), pushZ = ez - Math.abs(dz);
    if (pushX < pushZ) actor.x = b.x + (dx >= 0 ? ex : -ex);
    else actor.z = b.z + (dz >= 0 ? ez : -ez);
  }
}

export function buildRegion(T, material, height, stage = 0) {
  const root = new T.Group();
  const box = (w, h, d, x, y, z, color) => {
    const object = new T.Mesh(new T.BoxGeometry(w, h, d), material(color));
    object.position.set(x, y, z); object.castShadow = object.receiveShadow = true; root.add(object); return object;
  };
  const pixelMaterials = new Map();
  function pixelMaterial(color, style) {
    const key = color + style; if (pixelMaterials.has(key)) return pixelMaterials.get(key);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 32, 32);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 8 + (row % 2 ? 4 : 0), y = row * 8;
      ctx.fillStyle = (row + col) % 2 ? '#d9d4c4' : '#efead7'; ctx.fillRect(x, y, 7, 7);
      ctx.fillStyle = style === 'tiles' ? '#857d73' : '#b5b1a2'; ctx.fillRect(x, y + 6, 7, 2);
    }
    const texture = new T.CanvasTexture(canvas); texture.minFilter = texture.magFilter = T.NearestFilter; texture.generateMipmaps = false; texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(style === 'tiles' ? 1 : 2, 1);
    const mat = material(color).clone(); mat.map = texture; mat.needsUpdate = true; pixelMaterials.set(key, mat); return mat;
  }
  for (const b of buildingsForStage(stage)) {
    const base = height(b.x, b.z);
    if (b.kind === 'spire') {
      box(b.w, .45, b.d, b.x, base + .225, b.z, '#87634e');
      box(b.w * .8, 2.4, b.d * .8, b.x, base + 1.65, b.z, '#bb8358');
      box(b.w * .55, 1.6, b.d * .55, b.x, base + 3.65, b.z, '#d7a478');
      box(b.w * .32, 1, b.d * .32, b.x, base + 4.95, b.z, '#e1b887');
      for (const side of [-1, 1]) box(.3, .65, .65, b.x + side * b.w * .42, base + 1.6, b.z, '#709c9d');
      continue;
    }
    if (b.kind === 'ruin') {
      box(b.w, .4, b.d, b.x, base + .2, b.z, '#676681');
      const top = Math.abs(b.x) === 10 ? Math.max(height(-10, b.z), height(10, b.z)) + 4.15 : base + 4.1;
      const shaft = top - base - .7;
      box(b.w * .7, shaft, b.d * .7, b.x, base + .4 + shaft / 2, b.z, '#9291a7');
      for (const y of [1, 2, 3.2]) box(b.w * .74, .18, b.d * .74, b.x, base + y, b.z, '#b2adc0');
      box(b.w * .9, .3, b.d * .9, b.x, top - .15, b.z, '#c5bed1');
      const crystal = box(.55, .9, .55, b.x, top + .65, b.z, '#8abccd'); crystal.rotation.y = Math.PI / 4;
      continue;
    }
    box(b.w + .3, .3, b.d + .3, b.x, base + .15, b.z, '#5b6671');
    box(b.w, 3, b.d, b.x, base + 1.8, b.z, '#e3dbb6').material = pixelMaterial('#e3dbb6', 'walls');
    const run = b.d / 2 + .35, rise = 1.05;
    const profile = new T.Shape(); profile.moveTo(-run, 0); profile.lineTo(0, rise); profile.lineTo(run, 0); profile.closePath();
    const roof = new T.Mesh(new T.ExtrudeGeometry(profile, { depth: b.w + .6, bevelEnabled: false }), pixelMaterial(b.roof, 'tiles'));
    roof.rotation.y = Math.PI / 2; roof.position.set(b.x - (b.w + .6) / 2, base + 3.3, b.z); roof.castShadow = true; roof.receiveShadow = true; root.add(roof);
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
  if (stage === 0) for (let i = 0; i < 10; i++) {
    const x = -6 + i * 1.2, z = 15;
    box(.1, .8, .15, x, height(x, z) + .4, z, '#eee9d3');
    box(1.2, .12, .1, x + .55, height(x, z) + .45, z, '#c8cbbc');
  }
  if (stage === 2) {
    for (const z of [-12, 14]) box(20, .5, 1.3, 0, Math.max(height(-10, z), height(10, z)) + 4.4, z, '#b2adc0');
  }
  return root;
}
