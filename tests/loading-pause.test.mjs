import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {createGame} from '../dist/engine.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const pauseSource=app.slice(app.indexOf('function pause()'),app.indexOf("$('start').addEventListener"));
const readySource=app.match(/if \(!missing.length\) \{[^\n]+/)[0];
function context(status='loading'){
  const nodes=new Map();const g=createGame();g.status=status;
  const ctx={game:g,lobby:false,assetsPaused:true,missing:[],clearInput(){},captureMouse(){},
    $(id){if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',focus(){}});return nodes.get(id)}};
  vm.createContext(ctx);vm.runInContext(pauseSource,ctx);return ctx;
}
test('Escape/pause can pause a loading encounter and model readiness preserves that choice',()=>{
  const ctx=context();ctx.pause();assert.equal(ctx.game.status,'paused');assert.equal(ctx.$('paused').hidden,false);
  vm.runInContext(readySource,ctx);assert.equal(ctx.game.status,'paused');assert.equal(ctx.assetsPaused,false);
});
test('model readiness resumes an encounter that the player has not paused',()=>{
  const ctx=context();vm.runInContext(readySource,ctx);assert.equal(ctx.game.status,'playing');assert.equal(ctx.assetsPaused,false);
});
test('loading retains pointer lock, while an intentional pause releases it',()=>{
  const source=app.match(/if \(document.pointerLockElement && !\[[^\n]+document.exitPointerLock\(\);/)[0];
  const ctx=context();let releases=0;ctx.document={pointerLockElement:{},exitPointerLock(){releases++}};
  vm.runInContext(source,ctx);assert.equal(releases,0);
  ctx.pause();vm.runInContext(source,ctx);assert.equal(releases,1);
});

test('title readiness includes every opening enemy before enabling the run',async()=>{
  const {OPENING_ENEMIES}=await import('../dist/levels.js');
  const source=app.slice(app.indexOf('function updateAssetStatus('),app.indexOf('function clearInput('));
  const ctx=context();ctx.lobby=true;ctx.selected='pikachu';ctx.OPENING_ENEMIES=OPENING_ENEMIES;
  const ready=new Set(['pikachu',...OPENING_ENEMIES.filter(k=>k!=='paras')]);
  ctx.renderer={errors:new Map(),ready:kind=>ready.has(kind)};
  vm.runInContext(source,ctx);ctx.updateAssetStatus();assert.equal(ctx.$('start').disabled,true);assert.match(ctx.$('asset-status').textContent,/3 \/ 4 READY/);
  ready.add('paras');ctx.updateAssetStatus();assert.equal(ctx.$('start').disabled,false);
});
