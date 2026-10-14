import { groundHeight } from './terrain.js?v=13';

export function buildPokeball(T, material) {
  const root = new T.Group();
  const top = new T.Mesh(new T.SphereGeometry(.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), material('#df615b'));
  const bottom = new T.Mesh(new T.SphereGeometry(.42, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), material('#f1eee1'));
  const band = new T.Mesh(new T.TorusGeometry(.42, .035, 4, 12), material('#27333b')); band.rotation.x = Math.PI / 2;
  const button = new T.Mesh(new T.CylinderGeometry(.11, .11, .07, 8), material('#f1eee1')); button.rotation.x = Math.PI / 2; button.position.z = .42;
  root.add(top, bottom, band, button); root.traverse(node => { if (node.isMesh) node.castShadow = true; });
  return root;
}

export function buildChest(T, material) {
  const root = new T.Group(), lid = new T.Group();
  const wood = material('#894826'), dark = material('#3c271f'), gold = material('#e8bc52');
  const box = (parent, w, h, d, x, y, z, mat) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  box(root, 1.65, .9, 1.15, 0, .55, 0, dark);
  for (let i = 0; i < 5; i++) box(root, .29, .74, 1.19, (i - 2) * .31, .57, 0, wood);
  for (const x of [-.61, .61]) {
    box(root, .13, .95, 1.23, x, .56, 0, gold);
    for (const y of [.24, .76]) box(root, .08, .08, .05, x, y, .64, dark);
  }
  for (const z of [-.59, .59]) box(root, 1.75, .13, .1, 0, .15, z, gold);
  // The lid pivots around its rear hinge; all detailing moves with it.
  lid.position.set(0, 1.02, -.58); root.add(lid);
  const arch = new T.Shape(); arch.moveTo(-.59, 0); arch.lineTo(.59, 0);
  for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 8; arch.lineTo(Math.cos(a) * .59, Math.sin(a) * .45); }
  arch.closePath();
  const roof = new T.Mesh(new T.ExtrudeGeometry(arch, { depth: 1.7, bevelEnabled: false, steps: 1 }), wood);
  roof.rotation.y = Math.PI / 2; roof.position.set(-.85, 0, .59); roof.castShadow = true; lid.add(roof);
  for (const x of [-.61, .61]) for (let i = 0; i < 8; i++) {
    const a = (i + .5) * Math.PI / 8;
    const strap = box(lid, .13, .07, .25, x, Math.sin(a) * .46, .59 + Math.cos(a) * .6, gold);
    strap.rotation.x = a - Math.PI / 2;
  }
  box(lid, .25, .34, .12, 0, -.05, 1.2, gold);
  box(lid, .08, .15, .03, 0, -.08, 1.27, dark);
  const glow = new T.Mesh(new T.RingGeometry(.85, 1.05, 24), new T.MeshBasicMaterial({ color: '#ffe697', side: T.DoubleSide, transparent: true, opacity: .3, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = .06; root.add(glow);
  return { root, lid, glow };
}

export function buildShrine(T, material) {
  const root = new T.Group();
  for (let i = 0; i < 3; i++) {
    const base = new T.Mesh(new T.CylinderGeometry(1.1 - i * .2, 1.2 - i * .2, .3, 6), material(i % 2 ? '#586575' : '#8793a1'));
    base.position.y = .15 + i * .3; base.castShadow = base.receiveShadow = true; root.add(base);
  }
  const pillar = new T.Mesh(new T.CylinderGeometry(.3, .5, 1.1, 5), material('#596878'));
  pillar.position.y = 1.25; pillar.castShadow = true; root.add(pillar);
  const crystal = new T.Mesh(new T.OctahedronGeometry(.55), new T.MeshBasicMaterial({ color: '#b78cff' }));
  crystal.scale.y = 1.5; crystal.position.y = 2.2; root.add(crystal);
  const ring = new T.Mesh(new T.RingGeometry(4.35, 4.5, 48), new T.MeshBasicMaterial({ color: '#c99dff', side: T.DoubleSide, transparent: true, opacity: .2, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .08; root.add(ring);
  const beam = new T.Mesh(new T.CylinderGeometry(.1, .5, 11, 6, 1, true), new T.MeshBasicMaterial({ color: '#c99dff', side: T.DoubleSide, transparent: true, opacity: .08, depthWrite: false }));
  beam.position.y = 7; root.add(beam);
  return { root, crystal, ring, beam, followGround(x, z) {
    const positions = ring.geometry.attributes.position;
    // RingGeometry lies in XY before rotating into the ground plane.
    for (let i = 0; i < positions.count; i++) {
      positions.setZ(i, -(groundHeight(x + positions.getX(i), z - positions.getY(i)) - groundHeight(x, z)));
    }
    positions.needsUpdate = true; ring.geometry.computeBoundingSphere();
  } };
}

export function buildPortal(T) {
  const root = new T.Group(); root.visible = false;
  const surface = new T.Mesh(new T.CircleGeometry(1.55, 32), new T.ShaderMaterial({
    side: T.DoubleSide, transparent: true, depthWrite: false, uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv; uniform float time;
      void main(){vec2 p=floor(vUv*64.0)/64.0-.5;float r=length(p)*2.0;
      float a=atan(p.y,p.x);float swirl=.5+.5*sin(a*5.0-r*22.0+time*7.0);
      vec3 c=mix(vec3(.15,.04,.35),vec3(.5,.2,.95),swirl);
      c=mix(c,vec3(.5,1.,.9),pow(r,5.0));gl_FragColor=vec4(c,1.0-smoothstep(.95,1.0,r));}`,
  }));
  const ring = new T.Mesh(new T.TorusGeometry(1.58, .14, 4, 24), new T.MeshBasicMaterial({ color: '#89ffdb' }));
  root.add(surface, ring);
  for (let i = 0; i < 12; i++) {
    const spark = new T.Mesh(new T.BoxGeometry(.1, .16, .1), ring.material);
    const a = i * Math.PI / 6; spark.position.set(Math.cos(a) * 1.88, Math.sin(a) * 1.88, 0); root.add(spark);
  }
  return { root, surface, ring };
}
