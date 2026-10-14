import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { safeCameraPosition } from './camera-motion.js?v=14';
import { SCENERY } from './obstacles.js?v=14';
import { buildRegion } from './regions.js?v=14';
import { LEVELS } from './levels.js?v=14';
import { RiverWaves } from './water.js?v=14';
import { groundHeight, WATER_LEVEL, riverCenter, waterDepth } from './terrain.js?v=14';
import { buildChest, buildShrine, buildPortal, buildPokeball } from './world-props.js?v=14';
import { MODELS, EVOLUTIONS, modelURL } from './models.js?v=14';
import { seededRandom } from './engine.js?v=14';
import { paintOverlay } from './overlay.js?v=14';
import { releaseActor, playAnimation, finishAnimationFade } from './actor-lifecycle.js?v=14';

const TAU = Math.PI * 2;
const _vector = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _dummy = new THREE.Object3D();

export class Renderer {
  constructor(canvas, overlay, onAssetStatus = () => {}) {
    this.canvas = canvas; this.overlay = overlay; this.ctx = overlay.getContext('2d');
    this.onAssetStatus = onAssetStatus; this.yaw = this.targetYaw = -.35; this.pitch = this.targetPitch = .53; this.cameraHeight = 0; this.previewCamera = { yaw: -.35, pitch: .43, targetYaw: -.35, targetPitch: .43 };
    this.camera = { x: 0, z: 0 }; this.lastTime = null; this.actorMap = new Map(); this.assets = new Map(); this.pending = new Map(); this.errors = new Map();
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#b7d9ec'); this.scene.fog = new THREE.Fog('#b7d9ec', 48, 100);
    this.view = new THREE.PerspectiveCamera(43, 1, .1, 180);
    this.gpu = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.gpu.outputColorSpace = THREE.SRGBColorSpace; this.gpu.toneMapping = THREE.ACESFilmicToneMapping; this.gpu.toneMappingExposure = 1.12;
    this.gpu.shadowMap.enabled = true; this.gpu.shadowMap.type = THREE.PCFShadowMap;
    this.loader = new GLTFLoader(); this.actorRoot = new THREE.Group(); this.scene.add(this.actorRoot);
    this.scene.add(new THREE.HemisphereLight('#e3f2ff', '#596b36', 1.6));
    this.sun = new THREE.DirectionalLight('#fff0cc', 2.2); this.sun.position.set(-22, 35, 20); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); Object.assign(this.sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 90 });
    this.sun.shadow.bias = -.0003; this.sun.shadow.normalBias = .035; this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    const environment = new RoomEnvironment(), generator = new THREE.PMREMGenerator(this.gpu);
    this.envTarget = generator.fromScene(environment, .04); this.scene.environment = this.envTarget.texture; environment.dispose(); generator.dispose();
    this.scene.environmentIntensity = .32;
    this.geometry = { ball: new THREE.SphereGeometry(1, 12, 8), box: new THREE.BoxGeometry(1, 1, 1), candy: new THREE.OctahedronGeometry(.18, 0) };
    this.toonRamp = new THREE.DataTexture(new Uint8Array([65, 165, 255]), 3, 1, THREE.RedFormat);
    this.toonRamp.minFilter = this.toonRamp.magFilter = THREE.NearestFilter; this.toonRamp.generateMipmaps = false; this.toonRamp.needsUpdate = true;
    this.outlineMaterial = this.makeOutlineMaterial();
    this.materialCache = new Map(); this.windShaders = []; this.buildWorld(); this.buildPools();
    this.localAssets = fetch('assets/manifest.json').then(r => r.ok ? r.json() : null).catch(() => null);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.onAssetStatus({ status: 'renderer-error', error: 'The GPU connection was lost. Reload the page to restore the scene.' }); });
  }
  material(color, extra = {}) {
    const key = color + JSON.stringify(extra);
    const { roughness, metalness, ...toonOptions } = extra;
    if (!this.materialCache.has(key)) this.materialCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: this.toonRamp, ...toonOptions }));
    return this.materialCache.get(key);
  }
  makeOutlineMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { resolution: { value: new THREE.Vector2(1, 1) }, thickness: { value: 2.7 } },
      side: THREE.BackSide,
      vertexShader: `
        uniform vec2 resolution; uniform float thickness;
        #include <common>
        #include <skinning_pars_vertex>
        void main() {
          #include <beginnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <defaultnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          #include <project_vertex>
          vec2 direction = (projectionMatrix * vec4(transformedNormal, 0.0)).xy;
          #ifdef FLIP_SIDED
            direction = -direction;
          #endif
          float lengthSquared = dot(direction, direction);
          if (lengthSquared > 0.00001) gl_Position.xy += direction * inversesqrt(lengthSquared) * thickness * 2.0 / resolution * gl_Position.w;
        }`,
      fragmentShader: 'void main() { gl_FragColor = vec4(0.055, 0.065, 0.085, 1.0); }',
    });
  }
  mesh(geometry, color, x, y, z, sx = 1, sy = sx, sz = sx, shadow = true, extra = {}) {
    const mesh = new THREE.Mesh(geometry, this.material(color, extra)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = shadow; mesh.receiveShadow = true;
    this.scene.add(mesh); return mesh;
  }
  buildWorld() {
    const rng = seededRandom(65191), ground = new THREE.PlaneGeometry(280, 280, 200, 200); ground.rotateX(-Math.PI / 2);
    const pos = ground.attributes.position, colors = [], lush = new THREE.Color('#96b869'), trail = new THREE.Color('#c1b68b');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, groundHeight(x, z) - .04);
      const path = Math.max(0, 1 - Math.abs(z - Math.sin(x * .1) * 3) / 2.7);
      const col = lush.clone().lerp(trail, path * path).multiplyScalar(.95 + rng() * .09); colors.push(col.r, col.g, col.b);
    }
    ground.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); ground.computeVertexNormals();
    const terrain = new THREE.Mesh(ground, new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: this.toonRamp, map: this.groundTexture(rng) })); terrain.receiveShadow = true; this.terrain = terrain; this.scene.add(terrain);
    this.makeGrass(rng); this.makeFlowers(rng);
    // Layered foliage, branching trunks, and varied silhouettes frame the arena.
    const trunk = new THREE.CylinderGeometry(.17, .32, 3.3, 7), crown = new THREE.IcosahedronGeometry(1, 1);
    for (const tree of SCENERY.trees) {
      const { x, z, size: s } = tree;
      const base = groundHeight(x, z);
      this.mesh(trunk, '#81634a', x, base + 1.65 * s, z, s);
      const branch = this.mesh(trunk, '#81634a', x + .55 * s, base + 2.55 * s, z, s * .42, s * .5, s * .42); branch.rotation.z = -.8;
      const crowns = [[0, 3.7, 0, 1.7], [-1.1, 3.0, .1, 1.3], [.9, 3.5, -.6, 1.3], [.4, 4.6, .2, 1.05]];
      for (let j = 0; j < crowns.length; j++) {
        const [dx, dy, dz, size] = crowns[j]; const leaf = this.mesh(crown, ['#527b47', '#789852', '#7fa15a', '#99b56c'][j], x + dx * s, base + dy * s, z + dz * s, size * s, size * s * .8, size * s);
        leaf.rotation.set(rng(), rng() * TAU, rng());
        if (!leaf.material.userData.wind) {
          leaf.material.userData.wind = true;
          leaf.material.onBeforeCompile = shader => {
            shader.uniforms.uCanopyTime = { value: 0 }; this.windShaders.push(shader);
            shader.vertexShader = 'uniform float uCanopyTime;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(uCanopyTime*.85 + modelMatrix[3].x*.08 + modelMatrix[3].z*.05) * max(0.0, position.y+.9) * .035;');
          };
        }
      }
    }
    const stone = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < SCENERY.rocks.length; i++) {
      const { x, z, size } = SCENERY.rocks[i];
      const rock = this.mesh(stone, i % 3 ? '#89988a' : '#a3ab96', x, groundHeight(x, z) + size * .35, z, size, size * .65, size * .8); rock.rotation.set(.2, rng() * TAU, .15);
      if (i % 3 === 0) this.mesh(stone, '#829455', x + .1, groundHeight(x, z) + size * .7, z, size * .6, size * .17, size * .7, false);
    }
    const mountain = new THREE.ConeGeometry(1, 1, 6);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU, height = 14 + rng() * 10, r = 140 + rng() * 15;
      const hill = this.mesh(mountain, i % 2 ? '#7eac9f' : '#8bb6a5', Math.sin(a) * r, height * .35, Math.cos(a) * r, 14, height, 14, false); hill.rotation.y = rng();
    }
    // A visible clearing entrance, lanterns, and ruins give the map landmarks.
    for (let side = -1; side <= 1; side += 2) {
      for (let n = 0; n < 6; n++) {
        const x = side * (3.5 + n * 1.35), z = 12;
        this.mesh(this.geometry.box, '#9c8055', x, groundHeight(x, z) + .7, z, .15, 1.4, .15);
        if (n < 5) for (const h of [.5, 1.05]) this.mesh(this.geometry.box, '#b09766', x + side * .65, groundHeight(x + side * .65, z) + h, z, 1.25, .13, .13);
      }
      const x = side * 3.3;
      this.mesh(this.geometry.box, '#6d786e', x, groundHeight(x, 12) + 1.35, 12, .7, 2.7, .7);
      this.mesh(this.geometry.box, '#c3c29c', x, groundHeight(x, 12) + 2.78, 12, .92, .18, .92);
      this.mesh(this.geometry.ball, '#f9d99b', x, groundHeight(x, 12) + 3, 12, .2, .24, .2, false, { emissive: '#ffb64b', emissiveIntensity: .4 });
    }
    const stream = new THREE.PlaneGeometry(7.2, 260, 8, 160); stream.rotateX(-Math.PI / 2);
    for (let i = 0; i < stream.attributes.position.count; i++) { const z = stream.attributes.position.getZ(i); stream.attributes.position.setX(i, stream.attributes.position.getX(i) + riverCenter(z)); stream.attributes.position.setY(i, WATER_LEVEL); }
    stream.computeVertexNormals();
    const waterCanvas = document.createElement('canvas'); waterCanvas.width = waterCanvas.height = 32;
    const waterCtx = waterCanvas.getContext('2d'); waterCtx.fillStyle = '#89c7d2'; waterCtx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 12; i++) { waterCtx.fillStyle = i % 3 ? '#a8e2e4' : '#d8f4e7'; waterCtx.fillRect((i * 7) % 28, (i * 11) % 28, 5, 1); }
    const waterTexture = new THREE.CanvasTexture(waterCanvas); waterTexture.minFilter = waterTexture.magFilter = THREE.NearestFilter; waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping; waterTexture.repeat.set(2, 52);
    this.water = new THREE.Mesh(stream, new THREE.MeshPhysicalMaterial({ color: '#5ca7c1', map: waterTexture, roughness: .18, metalness: .12, transparent: true, opacity: .86, envMapIntensity: .75 })); this.water.receiveShadow = true; this.scene.add(this.water);
    this.riverWaves = new RiverWaves(); this.waterTexture = waterTexture; this.ripples = [];
    // A separate presentation platform keeps the title character unobstructed.
    this.podium = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.16, .24, 64), this.material('#c4bca3')); base.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.84, 1.84, .05, 64), this.material('#718a57')); top.position.y = .145; top.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.93, .028, 6, 80), this.material('#e3dba9')); ring.rotation.x = Math.PI / 2; ring.position.y = .13;
    this.podium.add(base, top, ring); this.podium.position.set(3.2, .15, 0); this.scene.add(this.podium);
    this.chests = []; this.shrines = []; this.supplies = [];
    this.region = buildRegion(THREE, color => this.material(color), groundHeight); this.scene.add(this.region); this.regionStage = 0;
    this.portal = buildPortal(THREE); this.scene.add(this.portal.root);
  }
  groundTexture(rng) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
    c.fillStyle = '#e4e4e4'; c.fillRect(0, 0, 64, 64);
    const palette = ['#b8b8b8', '#cccccc', '#dddddd', '#eeeeee'];
    for (let i = 0; i < 850; i++) {
      const x = Math.floor(rng() * 64), y = Math.floor(rng() * 64);
      c.fillStyle = palette[Math.floor(rng() * palette.length)]; c.fillRect(x, y, 1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 2));
    }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(20, 20); texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.NearestFilter; texture.generateMipmaps = false; texture.anisotropy = 1; return texture;
  }
  makeGrass(rng) {
    const v = [], geometry = new THREE.BufferGeometry();
    for (let blade = 0; blade < 3; blade++) {
      const angle = blade * TAU / 3, x = Math.cos(angle) * .06, z = Math.sin(angle) * .06;
      v.push(x - .05, 0, z, x + .05, 0, z, x + .06, .38, z + .05);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: '#7ea44b', roughness: 1, side: THREE.DoubleSide });
    material.onBeforeCompile = shader => {
      shader.uniforms.uWindTime = { value: 0 }; this.grassShader = shader;
      shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(uWindTime*1.7 + instanceMatrix[3].x*.4 + instanceMatrix[3].z*.35) * pow(position.y,2.0) * .45;');
    };
    const grass = new THREE.InstancedMesh(geometry, material, 5000); let count = 0;
    for (let i = 0; i < 5000; i++) {
      const x = (rng() - .5) * 228, z = (rng() - .5) * 228;
      if (Math.abs(z - Math.sin(x * .1) * 3) < 2.4 || Math.abs(x - 33 - Math.sin(z * .09) * 2) < 4.2) continue;
      _dummy.position.set(x, groundHeight(x, z), z); _dummy.rotation.y = rng() * TAU; _dummy.scale.setScalar(.5 + rng() * 1.1); _dummy.updateMatrix(); grass.setMatrixAt(count, _dummy.matrix);
      grass.setColorAt(count, new THREE.Color().setScalar(.7 + rng() * .2)); count++;
    }
    grass.count = count; grass.instanceMatrix.needsUpdate = true; grass.receiveShadow = true; this.grass = grass; this.scene.add(grass);
  }
  makeFlowers(rng) {
    const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), this.material('#ffffff'), 900), centers = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), this.material('#e9bb55'), 180);
    let count = 0;
    for (let i = 0; i < 180; i++) {
      const x = (rng() - .5) * 180, z = (rng() - .5) * 180;
      if (Math.abs(z - Math.sin(x * .1) * 3) < 2.8 || x > 28 && x < 38) continue;
      const y = groundHeight(x, z) + .22;
      for (let n = 0; n < 5; n++) { const a = n * TAU / 5; _dummy.position.set(x + Math.sin(a) * .09, y, z + Math.cos(a) * .09); _dummy.rotation.set(0, a, 0); _dummy.scale.set(.055, .027, .085); _dummy.updateMatrix(); petals.setMatrixAt(count * 5 + n, _dummy.matrix); petals.setColorAt(count * 5 + n, new THREE.Color(i % 3 ? '#f6f0dc' : '#d6b5d8')); }
      _dummy.position.set(x, y + .02, z); _dummy.scale.set(.05, .028, .05); _dummy.updateMatrix(); centers.setMatrixAt(count, _dummy.matrix); count++;
    }
    petals.count = count * 5; centers.count = count; petals.receiveShadow = true; centers.receiveShadow = true; this.scene.add(petals, centers);
  }
  buildPools() {
    this.fireMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying float vSeed;
        void main(){vUv=uv;vSeed=instanceMatrix[3].x+instanceMatrix[3].z;
        vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
        vec2 size=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
        gl_Position=projectionMatrix*(center+vec4(position.xy*size,0.,0.));}`,
      fragmentShader: `varying vec2 vUv;varying float vSeed;uniform float time;
        void main(){vec2 uv=floor(vUv*32.)/32.;float y=uv.y;float x=(uv.x-.5)*2.;
        x+=sin(y*13.-time*17.+vSeed)*.09;
        float width=(1.-y)*.58+.05+sin(y*17.+time*9.+vSeed)*.04;
        float edge=abs(x)/width;if(edge>1.||y<.04||y>.97)discard;
        vec3 color=mix(vec3(1.,.85,.24),vec3(1.,.23,.03),y);
        color=mix(color,vec3(1.,.98,.75),max(0.,1.-edge*2.)*(1.-y));
        gl_FragColor=vec4(color,.95*(1.-y*.35));}` });
    this.firePool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.fireMaterial, 200); this.firePool.frustumCulled = false; this.firePool.count = 0; this.scene.add(this.firePool);
    this.dropPool = new THREE.InstancedMesh(this.geometry.candy, new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#7092af', emissiveIntensity: .12, roughness: .35 }), 400);
    this.bulletPool = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 600);
    this.dropPool.count = this.bulletPool.count = 0; this.dropPool.frustumCulled = this.bulletPool.frustumCulled = false;
    this.scene.add(this.dropPool, this.bulletPool);
  }
  ready(kind) { return kind === 'ranger' || this.assets.has(kind); }
  async prepare(kind) {
    if (this.ready(kind)) { this.onAssetStatus({ kind, status: 'ready' }); return; }
    await this.requestModel(kind);
  }
  async requestModel(kind) {
    if (this.assets.has(kind)) return this.assets.get(kind);
    if (this.pending.has(kind)) return this.pending.get(kind);
    this.onAssetStatus({ kind, status: 'loading' });
    const promise = (async () => {
      try {
        const local = await this.localAssets;
        const url = modelURL(kind, !!local?.models?.includes(MODELS[kind].id));
        const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
        if (!response.ok) throw new Error(`Model download returned HTTP ${response.status}`);
        const bytes = await response.arrayBuffer(), gltf = await this.loader.parseAsync(bytes, new URL('.', url.startsWith('http') ? url : new URL(url, location.href)).href);
        gltf.scene.updateMatrixWorld(true);
        const mixer = new THREE.AnimationMixer(gltf.scene), idle = gltf.animations.find(a => a.name === 'idle') || gltf.animations[0];
        if (idle) { mixer.clipAction(idle).play(); mixer.update(0); }
        gltf.scene.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(gltf.scene, true), size = bounds.getSize(new THREE.Vector3());
        if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Model has invalid dimensions');
        const pixelated = new Set();
        gltf.scene.traverse(node => {
          if (!node.isMesh) return;
          node.frustumCulled = false; node.castShadow = true; node.receiveShadow = true;
          const originals = Array.isArray(node.material) ? node.material : [node.material];
          const materials = originals.map(source => {
            for (const texture of [source.map, source.alphaMap]) if (texture) {
              if (!pixelated.has(texture) && texture.image) {
                pixelated.add(texture);
                const image = texture.image, ratio = Math.min(1, 64 / Math.max(image.width, image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
                const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height); texture.image = canvas;
              }
              texture.minFilter = texture.magFilter = THREE.NearestFilter; texture.generateMipmaps = false; texture.anisotropy = 1; texture.needsUpdate = true;
            }
            return new THREE.MeshToonMaterial({ color: source.color, map: source.map, alphaMap: source.alphaMap,
              transparent: source.transparent, opacity: source.opacity, alphaTest: source.alphaTest, side: source.side, gradientMap: this.toonRamp });
          });
          node.material = Array.isArray(node.material) ? materials : materials[0];
        });
        mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene);
        const data = { scene: gltf.scene, clips: gltf.animations, scale: MODELS[kind].height / size.y, center: bounds.getCenter(new THREE.Vector3()), floor: bounds.min.y };
        this.assets.set(kind, data); this.errors.delete(kind); this.onAssetStatus({ kind, status: 'ready' }); return data;
      } catch (error) {
        this.errors.set(kind, error.message); this.onAssetStatus({ kind, status: 'error', error: error.message }); console.warn(`Pokébonk model ${kind}:`, error); throw error;
      } finally { this.pending.delete(kind); }
    })();
    this.pending.set(kind, promise); return promise;
  }
  async warmArena() {
    // Parse large nonessential models sequentially to limit startup memory peaks.
    for (const kind of ['gastly', 'geodude', 'graveler', 'golem', 'zubat', 'pidgey', 'sandshrew', 'sandslash', 'gengar', 'mewtwo']) await this.requestModel(kind).catch(() => {});
  }
  makeRanger(key) {
    const root = new THREE.Group(), meshes = [], materials = [], limbs = [];
    const owned = new Map();
    const part = (parent, x, y, z, sx, sy, sz, color) => {
      if (!owned.has(color)) { const material = this.material(color).clone(); owned.set(color, material); materials.push({ material, color: material.color.clone() }); }
      const mesh = new THREE.Mesh(this.geometry.box, owned.get(color)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; parent.add(mesh); meshes.push(mesh); return mesh;
    };
    part(root, 0, 1.25, 0, .68, .85, .38, '#648b64'); part(root, 0, .88, 0, .7, .13, .4, '#b6a27b');
    part(root, 0, 1.95, 0, .48, .48, .42, '#dfbea0'); part(root, 0, 2.2, 0, .65, .2, .58, '#c0a06c'); part(root, 0, 2.12, .15, .88, .08, .72, '#c0a06c');
    for (const side of [-1, 1]) {
      part(root, side * .11, 2, .22, .055, .07, .025, '#263139');
      const leg = new THREE.Group(); leg.position.set(side * .21, .86, 0); root.add(leg); part(leg, 0, -.35, 0, .25, .7, .27, '#455878'); part(leg, 0, -.73, .1, .28, .16, .4, '#363d46'); limbs.push({ group: leg, side });
      part(root, side * .46, 1.25, .05, .24, .72, .25, '#648b64'); part(root, side * .46, .86, .05, .2, .22, .22, '#dfbea0');
    }
    part(root, .47, .85, .24, .24, .24, .24, '#e16f62');
    this.actorRoot.add(root);
    const entry = { key, kind: 'ranger', root, model: root, mixer: new THREE.AnimationMixer(root), clips: new Map(), actions: new Map(), action: null, fadingAction: null, fadeLeft: 0, materials, meshes, skeletons: new Set(), outlines: [], limbs, walkTime: 0 };
    this.actorMap.set(key, entry); return entry;
  }
  makeActor(kind, key) {
    if (kind === 'ranger') return this.makeRanger(key);
    const asset = this.assets.get(kind); if (!asset) { if (!this.errors.has(kind)) this.requestModel(kind).catch(() => {}); return null; }
    const model = cloneSkeleton(asset.scene), transform = new THREE.Group(), root = new THREE.Group();
    model.position.set(-asset.center.x, -asset.floor, -asset.center.z); transform.scale.setScalar(asset.scale); transform.add(model); root.add(transform); this.actorRoot.add(root);
    // Bind only animations actually used. Eagerly binding every clip for every
    // enemy allocates thousands of unnecessary bone-property bindings.
    const mixer = new THREE.AnimationMixer(model), clips = new Map(asset.clips.map(clip => [clip.name, clip]));
    const entry = { key, kind, root, model, mixer, clips, actions: new Map(), action: null, fadingAction: null, fadeLeft: 0, materials: [], meshes: [], skeletons: new Set() };
    model.traverse(node => {
      if (!node.isMesh) return; entry.meshes.push(node);
      if (node.isSkinnedMesh) entry.skeletons.add(node.skeleton);
      const originals = Array.isArray(node.material) ? node.material : [node.material];
      const materials = originals.map(material => material.clone()); node.material = Array.isArray(node.material) ? materials : materials[0];
      for (const material of materials) entry.materials.push({ material, color: material.color?.clone() });
    });
    entry.outlines = [];
    for (const mesh of entry.meshes) {
      if (/eye|mouth|flame|fire|smoke/i.test(mesh.name)) continue;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (materials.every(material => material.transparent)) continue;
      // Share geometry and the actor's animated skeleton, rather than creating
      // another rig for the expanded black back-face silhouette.
      const outline = mesh.clone(false); outline.material = this.outlineMaterial; outline.castShadow = outline.receiveShadow = false;
      outline.renderOrder = -1; mesh.parent.add(outline); entry.outlines.push(outline);
    }
    if (kind === 'pidgey') {
      entry.wings = [];
      for (const side of [-1, 1]) {
        const wing = new THREE.Group(); wing.position.set(side * .35, .82, -.08); root.add(wing);
        for (let i = 0; i < 3; i++) { const feather = new THREE.Mesh(this.geometry.box, this.material(i === 0 ? '#a78151' : '#dfc89d')); feather.position.set(side * (.32 - i * .04), 0, i * .12); feather.scale.set(.65 - i * .1, .055, .16); feather.castShadow = true; wing.add(feather); }
        entry.wings.push({ wing, side });
      }
    }
    this.playActor(entry, 'idle', true); this.actorMap.set(key, entry); return entry;
  }
  playActor(actor, name, instant = false) {
    playAnimation(actor, name, instant);
  }
  removeActor(key) {
    const actor = this.actorMap.get(key); if (!actor) return;
    releaseActor(actor);
    this.actorMap.delete(key);
  }
  actor(kind, key, x, y, z, angle, scale, dt, moving = true, hit = false, visible = true, shadow = true) {
    let actor = this.actorMap.get(key);
    if (actor && actor.kind !== kind) { this.removeActor(key); actor = null; }
    actor ??= this.makeActor(kind, key); if (!actor) return;
    actor.root.position.set(x, y, z); actor.root.rotation.y = angle + (MODELS[kind]?.faceYaw ?? 0); actor.root.scale.setScalar(scale); actor.root.visible = visible;
    for (const mesh of actor.meshes) mesh.castShadow = shadow;
    for (const outline of actor.outlines) outline.visible = shadow || key === 'player';
    this.playActor(actor, kind === 'pidgey' ? 'idle' : moving ? 'run' : 'idle'); actor.mixer.update(dt);
    if (kind === 'ranger') { actor.walkTime += dt; for (const limb of actor.limbs) limb.group.rotation.x = moving ? Math.sin(actor.walkTime * 8) * .35 * limb.side : 0; }
    if (kind === 'pidgey') {
      actor.flightTime = (actor.flightTime ?? 0) + dt;
      actor.flightBones ??= actor.model.children.length ? ['LArm', 'RArm'].map(name => { const bone = actor.model.getObjectByName(name); return bone ? { bone, rest: bone.quaternion.clone(), side: name[0] === 'L' ? 1 : -1 } : null; }).filter(Boolean) : [];
      for (const { wing, side } of actor.wings) wing.rotation.z = side * (.25 + Math.sin(actor.flightTime * 16) * .6);
      for (const { bone, rest, side } of actor.flightBones) { bone.quaternion.copy(rest); bone.rotateZ(side * (.65 + Math.sin(actor.flightTime * 16) * .6)); }
    }
    finishAnimationFade(actor, dt);
    for (const { material, color } of actor.materials) if (color) material.color.copy(color).lerp(_white, hit ? .72 : 0);
    return actor;
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25), width = this.canvas.clientWidth, height = this.canvas.clientHeight;
    if (width !== this.width || height !== this.heightPx || dpr !== this.dpr) {
      this.width = width; this.heightPx = height; this.dpr = dpr; this.gpu.setPixelRatio(dpr); this.gpu.setSize(width, height, false);
      this.overlay.width = Math.round(width * dpr); this.overlay.height = Math.round(height * dpr); this.view.aspect = width / height; this.view.updateProjectionMatrix();
      this.outlineMaterial.uniforms.resolution.value.set(width, height);
    }
  }
  project(x, y, z) {
    _vector.set(x, y, z).project(this.view); if (_vector.z > 1 || _vector.z < -1) return null;
    return { x: (_vector.x * .5 + .5) * this.width, y: (-_vector.y * .5 + .5) * this.heightPx };
  }
  updateChests(chests, dt) {
    if (!this.chests.length) for (const chest of chests) {
      const prop = buildChest(THREE, color => this.material(color));
      prop.root.position.set(chest.x, groundHeight(chest.x, chest.z), chest.z);
      this.scene.add(prop.root); this.chests.push(prop);
    }
    chests.forEach((chest, i) => {
      const prop = this.chests[i];
      prop.lid.rotation.x += ((chest.opened ? -1.9 : 0) - prop.lid.rotation.x) * (1 - Math.exp(-9 * dt));
      prop.glow.visible = !chest.opened;
    });
  }
  updateShrines(shrines, time) {
    if (!this.shrines.length) for (const shrine of shrines) {
      const prop = buildShrine(THREE, color => this.material(color));
      prop.root.position.set(shrine.x, groundHeight(shrine.x, shrine.z), shrine.z);
      prop.followGround(shrine.x, shrine.z);
      this.scene.add(prop.root); this.shrines.push(prop);
    }
    shrines.forEach((shrine, i) => {
      const prop = this.shrines[i];
      prop.crystal.rotation.y = time * .7; prop.crystal.position.y = 2.2 + Math.sin(time * 2) * .12;
      prop.crystal.material.color.set(shrine.completed ? '#61716e' : '#b78cff');
      prop.ring.material.opacity = shrine.completed ? .08 : shrine.active ? .5 + Math.sin(time * 5) * .15 : .2;
      prop.beam.visible = !shrine.completed;
      prop.beam.material.opacity = shrine.active ? .15 + shrine.charge * .25 : .08;
    });
  }
  updateSupplies(g, time) {
    if (!this.supplies.length) for (const ball of g.pokeballs) {
      const root = buildPokeball(THREE, color => this.material(color)); root.position.set(ball.x, groundHeight(ball.x, ball.z) + .48, ball.z); this.scene.add(root); this.supplies.push({ root });
    }
    g.pokeballs.forEach((ball, i) => { const root = this.supplies[i].root; root.visible = !ball.broken; root.rotation.y = time * .35; });
  }
  updateDrops(g, time) {
    let count = 0;
    for (const drop of g.drops) {
      if (count >= 400 || Math.hypot(drop.x - g.player.x, drop.z - g.player.z) > 35) continue;
      _dummy.position.set(drop.x, groundHeight(drop.x, drop.z) + .3 + Math.sin(time * 3 + drop.phase) * .06, drop.z); _dummy.rotation.set(.2, time * 1.5, .2); _dummy.scale.setScalar(drop.value > 3 ? 1.4 : 1); _dummy.updateMatrix();
      this.dropPool.setMatrixAt(count, _dummy.matrix); this.dropPool.setColorAt(count, _color.set(drop.kind === 'berry' ? '#f29a68' : drop.value > 3 ? '#d5a7ec' : '#88d2f3')); count++;
    }
    this.dropPool.count = count; this.dropPool.instanceMatrix.needsUpdate = true; if (this.dropPool.instanceColor) this.dropPool.instanceColor.needsUpdate = true;
    count = 0; let fireCount = 0; this.fireMaterial.uniforms.time.value = time;
    for (const bullet of g.bullets) {
      if (!bullet.enemy && bullet.type === 'FIRE') {
        const angle = Math.atan2(bullet.vx, bullet.vz);
        for (let i = 0; i < 3 && fireCount < 200; i++) {
          const x = bullet.x - Math.sin(angle) * i * .3, z = bullet.z - Math.cos(angle) * i * .3;
          _dummy.position.set(x, groundHeight(x, z) + 1, z); _dummy.rotation.set(0, 0, 0); _dummy.scale.set(1.1 - i * .22, 1.55 - i * .25, 1); _dummy.updateMatrix(); this.firePool.setMatrixAt(fireCount++, _dummy.matrix);
        }
        continue;
      }
      for (let i = 0; i < (bullet.enemy ? 1 : 4); i++) {
        if (count >= 600) break;
        const angle = Math.atan2(bullet.vx, bullet.vz), r = bullet.radius * (1 - i * .22);
        _dummy.position.set(bullet.x - Math.sin(angle) * i * .28, .85 + groundHeight(bullet.x, bullet.z), bullet.z - Math.cos(angle) * i * .28);
        _dummy.rotation.set(0, 0, 0); _dummy.scale.setScalar(r); _dummy.updateMatrix(); this.bulletPool.setMatrixAt(count, _dummy.matrix); this.bulletPool.setColorAt(count, _color.set(bullet.color)); count++;
      }
    }
    this.firePool.count = fireCount; this.firePool.instanceMatrix.needsUpdate = true;
    this.bulletPool.count = count; this.bulletPool.instanceMatrix.needsUpdate = true; if (this.bulletPool.instanceColor) this.bulletPool.instanceColor.needsUpdate = true;
  }
  render(g, time, lobby = false) {
    this.resize();
    if (this.currentStage !== g.stage) {
      if (this.regionStage !== g.stage) {
        this.scene.remove(this.region);
        const shared = new Set(this.materialCache.values()), materials = new Set(), textures = new Set();
        this.region.traverse(node => {
          if (!node.isMesh) return; node.geometry.dispose();
          for (const mat of Array.isArray(node.material) ? node.material : [node.material]) if (!shared.has(mat)) materials.add(mat);
        });
        for (const mat of materials) { if (mat.map) textures.add(mat.map); mat.dispose(); }
        for (const texture of textures) texture.dispose();
        this.region = buildRegion(THREE, color => this.material(color), groundHeight, g.stage);
        this.scene.add(this.region); this.regionStage = g.stage;
      }
      this.currentStage = g.stage; const theme = LEVELS[g.stage];
      this.scene.background.set(theme.sky); this.scene.fog.color.set(theme.sky);
      this.terrain.material.color.set('#ffffff'); this.grass.material.color.set(theme.grass);
      const lush = new THREE.Color(g.stage === 0 ? '#96b869' : theme.ground);
      const trail = new THREE.Color(['#c1b68b', '#caa571', '#9b91b2'][g.stage]);
      const positions = this.terrain.geometry.attributes.position, colors = this.terrain.geometry.attributes.color;
      const tintRandom = seededRandom(65191);
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getZ(i);
        const path = Math.max(0, 1 - Math.abs(z - Math.sin(x * .1) * 3) / 2.7);
        const col = lush.clone().lerp(trail, path * path).multiplyScalar(.95 + tintRandom() * .09);
        colors.setXYZ(i, col.r, col.g, col.b);
      }
      colors.needsUpdate = true;
      this.sun.color.set(g.stage === 2 ? '#aebee8' : '#fff0cc'); this.sun.intensity = g.stage === 2 ? 1.35 : 2.2;
      ['#527b47', '#789852', '#7fa15a', '#99b56c'].forEach((color, i) => this.material(color).color.set(theme.leaves[i]));
      ['#89988a', '#a3ab96', '#829455'].forEach((color, i) => this.material(color).color.set(theme.rocks[i]));
      for (const prop of [...this.chests, ...this.shrines, ...this.supplies]) {
        this.scene.remove(prop.root);
        const shared = new Set(this.materialCache.values());
        prop.root.traverse(node => { if (!node.isMesh) return; node.geometry.dispose(); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) if (!shared.has(mat)) mat.dispose(); });
      }
      this.chests = []; this.shrines = []; this.supplies = [];
    }
    const p = g.player, elapsed = Math.min(.05, this.lastTime === null ? .016 : Math.max(0, time - this.lastTime)); this.lastTime = time;
    const entering = g.status === 'intro', intro = Math.min(1, (g.introTime || 0) / 2.8);
    const dt = lobby || g.status === 'playing' || entering ? elapsed : 0;
    this.camera.x += (p.x - this.camera.x) * .09; this.camera.z += (p.z - this.camera.z) * .09;
    const yaw = lobby ? this.previewCamera.yaw : this.yaw, pitch = Math.max(.16, Math.min(1.15, lobby ? this.previewCamera.pitch : this.pitch)), radius = 15;
    this.cameraHeight += (groundHeight(this.camera.x, this.camera.z) - this.cameraHeight) * (1 - Math.exp(-8 * elapsed));
    const pivotX = lobby ? 3.2 : this.camera.x, pivotZ = lobby ? 0 : this.camera.z;
    const cameraX = pivotX + Math.sin(yaw) * (lobby ? 12 * Math.cos(pitch) : radius * Math.cos(pitch));
    const cameraZ = pivotZ + Math.cos(yaw) * (lobby ? 12 * Math.cos(pitch) : radius * Math.cos(pitch));
    if (lobby) this.view.setViewOffset(this.width, this.heightPx, -this.width * .22, 0, this.width, this.heightPx);
    else if (this.view.view?.enabled) this.view.clearViewOffset();
    const target = { x: pivotX, y: lobby ? 1.6 : 1 + Math.max(this.cameraHeight, groundHeight(this.camera.x, this.camera.z)), z: pivotZ };
    const candidate = { x: cameraX, y: lobby ? 1.6 + 12 * Math.sin(pitch) : this.cameraHeight + 1 + radius * Math.sin(pitch), z: cameraZ };
    const cameraPosition = lobby ? candidate : safeCameraPosition(target, candidate);
    this.view.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    this.view.lookAt(target.x, target.y, target.z); this.view.updateMatrixWorld();
    this.sun.position.set(p.x - 22, 35, p.z + 20); this.sun.target.position.set(p.x, 0, p.z); this.sun.target.updateMatrixWorld();
    this.podium.visible = lobby; for (const shader of this.windShaders) shader.uniforms.uCanopyTime.value = time; if (this.grassShader) this.grassShader.uniforms.uWindTime.value = time;
    for (let i = 0; i < this.ripples.length; i++) this.ripples[i].material.opacity = .25 + (Math.sin(time * 1.5 + i) + 1) * .12;
    if (dt > 0) {
      const previous = this.actorMap.get('player');
      if (waterDepth(p.x, p.z) > .2 && previous && Math.hypot(p.x - (previous.previousX ?? p.x), p.z - (previous.previousZ ?? p.z)) > .005) this.riverWaves.disturb((p.x - riverCenter(p.z) + 3.6) / 7.2 * 8, (130 + p.z) / 260 * 160, .05);
      this.riverWaves.update(dt); this.waterTexture.offset.y -= dt * .11;
      const positions = this.water.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) positions.setY(i, WATER_LEVEL + this.riverWaves.heights[i] + Math.sin(time * 1.9 + positions.getZ(i) * .2) * .015);
      positions.needsUpdate = true; this.water.geometry.computeVertexNormals();
    }
    this.updateSupplies(g, time); this.updateChests(g.chests, dt); this.updateShrines(g.shrines, time); this.updateDrops(g, time);
    this.portal.root.visible = entering;
    if (entering) {
      const size = Math.min(1, intro * 6) * Math.min(1, (1 - intro) * 5);
      this.portal.root.scale.setScalar(Math.max(.001, size));
      this.portal.root.position.set(0, groundHeight(0, -2) + 1.8, -2);
      this.portal.surface.material.uniforms.time.value = g.introTime;
      this.portal.ring.rotation.z = -g.introTime * 1.8;
    }
    const introZ = entering ? -2 + Math.min(1, Math.max(0, (intro - .18) / .5)) * 2 : p.z;
    const px = p.x + (lobby ? 3.2 : 0), py = lobby ? .35 : p.y + groundHeight(p.x, introZ);
    const entryScale = entering ? Math.min(1, Math.max(.05, (intro - .12) * 4)) : 1;
    const kind = g.evolved ? EVOLUTIONS[g.starter] : g.starter;
    const old = this.actorMap.get('player'); const moving = !lobby && !!old && Math.hypot(p.x - (old.previousX ?? p.x), p.z - (old.previousZ ?? p.z)) > .003;
    const player = this.actor(kind, 'player', px, py, introZ, lobby ? -.35 : p.angle, lobby ? 1.7 : entryScale, dt, moving || entering, false, lobby || entering || p.invulnerable <= 0 || Math.floor(time * 18) % 2 === 0);
    if (player) {
      player.previousX = p.x; player.previousZ = p.z;
      if (!lobby && p.sliding) player.root.scale.y *= .72;
    }
    const active = new Set(['player']);
    if (!lobby) for (const enemy of g.enemies) {
      const dist = Math.hypot(enemy.x - p.x, enemy.z - p.z); if (dist > 40) continue;
      const key = 'enemy:' + enemy.id; active.add(key);
      this.actor(enemy.kind, key, enemy.x, groundHeight(enemy.x, enemy.z) + (['gastly', 'zubat', 'pidgey'].includes(enemy.kind) ? (enemy.kind === 'pidgey' ? 1.15 : .55) + Math.sin(time * 2 + enemy.phase) * .1 : 0), enemy.z, enemy.angle,
        enemy.elite ? 1.2 : 1, dt, true, enemy.hit > 0, true, dist < 19);
    }
    for (const key of this.actorMap.keys()) if (!active.has(key)) this.removeActor(key);
    this.gpu.render(this.scene, this.view); paintOverlay.call(this, g, time, lobby);
  }
  dispose() {
    for (const key of this.actorMap.keys()) this.removeActor(key);
    this.outlineMaterial.dispose(); this.toonRamp.dispose(); this.envTarget.dispose(); this.gpu.dispose();
  }
}
const _white = new THREE.Color('#ffffff'), _color = new THREE.Color();
