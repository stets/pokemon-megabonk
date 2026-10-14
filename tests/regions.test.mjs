import test from 'node:test';
import assert from 'node:assert/strict';
import { buildingsForStage, ALL_BUILDINGS, avoidBuildings } from '../dist/regions.js';
import { SCENERY, moveWithCollisions } from '../dist/obstacles.js';
import { levelObjects } from '../dist/levels.js';
import { createGame, step } from '../dist/engine.js';

test('regions have distinct authored footprints with open spawn and river corridors',()=>{
  const signatures=[0,1,2].map(stage=>JSON.stringify(buildingsForStage(stage)));
  assert.equal(new Set(signatures).size,3);
  for(const b of ALL_BUILDINGS){assert.ok(Math.hypot(b.x,b.z)>8);assert.ok(Math.abs(b.x-33)>b.w/2+5);}
});

test('all region footprints are reserved from tree and rock placement',()=>{
  for(const o of SCENERY.all) for(const b of ALL_BUILDINGS)
    assert.ok(Math.abs(o.x-b.x)>=b.w/2+o.clearance+3||Math.abs(o.z-b.z)>=b.d/2+o.clearance+3);
});

test('collision selects the active region and prevents dash tunneling through its landmarks',()=>{
  const b=buildingsForStage(1)[0];
  const forest={x:b.x,z:b.z};avoidBuildings(forest,.5,0);assert.deepEqual(forest,{x:b.x,z:b.z});
  const desert={x:b.x,z:b.z};avoidBuildings(desert,.5,1);assert.ok(Math.abs(desert.x-b.x)>=b.w/2+.5||Math.abs(desert.z-b.z)>=b.d/2+.5);
  const actor={x:b.x+8,z:b.z,y:0};moveWithCollisions(actor,{x:b.x-8,z:b.z},.5,1);assert.ok(actor.x<=b.x-b.w/2-.5);
});

test('live movement uses the new region footprint and the ruins gateway stays open',()=>{
  const g=createGame();g.stage=1;g.spawnTimer=1e6;g.player.x=-18;g.player.z=-9;
  step(g,{},1/60);assert.ok(Math.abs(g.player.x+18)>=4||Math.abs(g.player.z+9)>=3);
  for(const z of [-12,14]){const actor={x:0,z};avoidBuildings(actor,.5,2);assert.deepEqual(actor,{x:0,z});}
});


test('chests, shrines and supplies remain outside every active building footprint',()=>{
  for(const stage of [0,1,2]){
    const objects=levelObjects(stage);
    for(const object of [...objects.chests,...objects.shrines,...objects.pokeballs])
      for(const b of buildingsForStage(stage)) assert.ok(Math.abs(object.x-b.x)>b.w/2+.5||Math.abs(object.z-b.z)>b.d/2+.5,`stage ${stage}: object ${object.x},${object.z}`);
  }
});

test('ruins lintels rest on both column caps despite uneven hill heights',async()=>{
  const T=await import('../dist/assets/vendor/three/build/three.module.js');
  const {buildRegion}=await import('../dist/regions.js');
  const {groundHeight}=await import('../dist/terrain.js');
  const materials=new Map();
  const root=buildRegion(T,color=>{if(!materials.has(color))materials.set(color,new T.MeshToonMaterial({color}));return materials.get(color)},groundHeight,2);
  for(const z of [-12,14]){
    const lintel=root.children.find(m=>m.position.z===z&&m.geometry.parameters.width===20);
    assert.ok(lintel);
    for(const x of [-10,10]){
      const cap=root.children.find(m=>m.position.x===x&&m.position.z===z&&m.geometry.parameters.height===.3);
      assert.ok(cap);
      assert.ok(Math.abs(cap.position.y+.15-(lintel.position.y-.25))<1e-9);
    }
  }
  for(const mesh of root.children)mesh.geometry.dispose();for(const material of materials.values())material.dispose();
});
