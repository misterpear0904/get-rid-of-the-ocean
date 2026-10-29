import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createWorld} from '../dist/world.js';
import {defaultSettings} from '../dist/settings.js';
import {LAYOUT} from '../dist/terrain.js';

// These exercise the actual scene construction and Three.js geometry without a
// browser or GPU. They do not substitute for visual inspection of WebGL output.
globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.devicePixelRatio=1;
globalThis.addEventListener=()=>{};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
const fakeRenderer=()=>({shadowMap:{},setPixelRatio(){},setSize(){},render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}});
const canvas={addEventListener(){},setPointerCapture(){}};
test('all six real scenes build with finite geometry and falling water',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});
 for(let stage=0;stage<6;stage++){
  world.buildStage(stage);world.setTool(stage+2>7?7:stage+2);world.setMachines([1,1,1,1,1]);
  let previous=Infinity;
  for(const fraction of [1,.75,.25,0]){world.update(.016,1,fraction,true,true,false);const water=world.scene.getObjectByName('active-water');assert.ok(Number.isFinite(water.position.y));assert.ok(water.position.y<previous);previous=water.position.y;assert.equal(water.visible,fraction>0);}
  world.scene.traverse(object=>{if(object.isMesh){assert.ok(object.geometry.attributes.position.count>0);assert.ok(object.position.toArray().every(Number.isFinite));}});
 }
});
test('terrain, sea, and island base never occlude the empty sunk basin',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});
 for(let stage=2;stage<6;stage++){
  world.buildStage(stage);world.update(.016,1,0,false,false,false);const water=world.scene.getObjectByName('active-water');
  const ray=new THREE.Raycaster(new THREE.Vector3(0,20,-4),new THREE.Vector3(0,-1,0));
  const terrain=world.scene.getObjectByName('yard-ground');const sea=world.scene.getObjectByName('coastal-sea');const base=world.scene.getObjectByName('island-base');
  assert.equal(ray.intersectObject(terrain).length,0,`stage ${stage} terrain hole`);assert.equal(ray.intersectObject(sea).length,0,`stage ${stage} sea hole`);
  assert.ok(ray.intersectObject(base)[0].point.y<water.position.y,`stage ${stage} foundation is beneath the floor`);
 }
});
test('shops remain reachable from safe spawn positions at every scale',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});
 for(let stage=0;stage<6;stage++){world.buildStage(stage);assert.equal(world.nearWater(),true);assert.equal(world.closestStore(),null);for(const key of ['water','tools','skills','automation']){world.setDestination(key);const result=world.update(.016,1,1,false,false,false);assert.ok(Number.isFinite(result.destinationDistance));}}
});
test('first-person camera follows the player and respects remapped movement',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});const settings=defaultSettings();settings.bindings.forward='KeyI';world.applySettings(settings);world.player.position.set(10,0,10);world.keys.add('KeyW');world.update(.1,1,1,false,false,true);assert.equal(world.player.position.z,10);world.keys.clear();world.keys.add('KeyI');world.update(.1,1,1,false,false,true);assert.ok(world.player.position.z<10);assert.equal(world.camera.position.x,world.player.position.x);assert.equal(world.camera.position.z,world.player.position.z);assert.equal(world.camera.position.y,2.95);
});
test('level window, float and waterline fall while original full line stays fixed',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});world.update(.1,1,1,false,false,false);const full=world.scene.getObjectByName('original-full-line'),float=world.scene.getObjectByName('water-level-float'),window=world.scene.getObjectByName('water-level-window');const original=full.position.y,initialFloat=float.position.y,initialHeight=window.scale.y;world.update(.1,2,.25,false,false,false);assert.equal(full.position.y,original);assert.ok(float.position.y<initialFloat);assert.ok(window.scale.y<initialHeight*.3);
});
test('gas stove is below the cup and its flames respond to automation',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});world.setMachines([1,0,0,0,0]);const boiler=world.scene.getObjectByName('boiler');assert.ok(boiler);assert.equal(boiler.position.x,0);assert.equal(boiler.position.z,-4);assert.ok(boiler.children.find(c=>c.isMesh).position.y<1.2);const warmHeat=world.update(.2,1,1,false,true,false).heat;assert.ok(warmHeat>0);const cool=world.update(.2,2,1,false,false,false);assert.ok(cool.heat<warmHeat);
});
test('scenery batching reduces static mesh draws and default disables costly shadows',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});console.log('Scenery mesh batches:',JSON.stringify(world.optimization));assert.ok(world.optimization.after<world.optimization.before*.5);assert.equal(world.renderer.shadowMap.enabled,false);assert.equal(world.renderer.shadowMap.autoUpdate,false);let steamBatches=0;world.scene.traverse(o=>{if(o.isInstancedMesh)steamBatches++;});assert.equal(steamBatches,2);const settings=defaultSettings();settings.quality='high';world.applySettings(settings);assert.equal(world.renderer.shadowMap.enabled,true);
});
test('automation placement previews underneath the source and cancels cleanly',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});world.previewPlacement(0);const preview=world.scene.getObjectByName('automation-placement-preview');assert.equal(preview.visible,true);const body=preview.children.find(c=>c.isMesh);assert.equal(body.position.z,-4);assert.equal(body.position.x,0);assert.ok(body.position.y<world.scene.getObjectByName('active-water').position.y);assert.equal(body.material.depthTest,false);world.previewPlacement(null);assert.equal(preview.visible,false);
 for(let stage=2;stage<6;stage++){world.buildStage(stage);world.setMachines([1,1,1,1,1]);world.update(.1,1,1,false,true,false);const surface=world.scene.getObjectByName('active-water');const boiler=world.scene.getObjectByName('boiler');assert.ok(boiler.position.y<surface.position.y);assert.ok(Math.abs(boiler.position.x)<LAYOUT[stage].hx);}
});
test('visible dry-bank rigs connect to submerged heaters and discharge visibly animates',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});world.buildStage(4);world.setMachines([1,1,1,0,0]);world.update(.1,1,1,false,true,false);const rig=world.scene.getObjectByName('visible-rig-0');assert.ok(rig);assert.ok(Math.abs(rig.position.x)>LAYOUT[4].hx);assert.ok(rig.userData.intake[1]<world.scene.getObjectByName('active-water').position.y);assert.ok(Math.abs(rig.userData.intake[0])<LAYOUT[4].hx);const discharge=world.scene.getObjectByName('automation-discharge');assert.equal(discharge.visible,true);const before=Array.from(discharge.instanceMatrix.array);world.update(.3,1.3,1,false,true,false);assert.notDeepEqual(Array.from(discharge.instanceMatrix.array),before);world.update(.1,1.4,1,false,false,false);assert.equal(discharge.visible,false);
});
test('human references retain their scale and the yard preserves original empty containers',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});const initial=world.scene.getObjectByName('human-scale-worker').userData.height;world.buildStage(5);assert.equal(world.scene.getObjectByName('human-scale-worker').userData.height,initial);world.setProgress([0,1,2]);const cup=world.scene.getObjectByName('cleared-container-0');assert.ok(cup);assert.ok(cup.children.some(c=>c.geometry?.parameters.radiusTop===.64));assert.ok(world.scene.getObjectByName('cleared-container-2'));assert.ok(world.scene.getObjectByName('emerging-shipwreck'));world.setDestination('trophies');assert.ok(Number.isFinite(world.update(.1,1,0,false,false,false).destinationDistance));
});
test('walking a drained pool lowers the real first-person camera down its steps',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});world.buildStage(3);world.player.position.set(-LAYOUT[3].hx*.55,0,4.5);world.keys.add('KeyW');for(let n=0;n<80;n++)world.update(.02,n*.02,0,false,false,true);assert.ok(world.player.position.y<-1);assert.equal(world.camera.position.y,world.player.position.y+2.95);
});
test('ocean industry includes offshore platforms and visible cooling towers',()=>{const world=createWorld(canvas,{rendererFactory:fakeRenderer});world.buildStage(5);world.setMachines([0,0,1,1,1]);for(const type of [2,3,4]){const platform=world.scene.getObjectByName('offshore-platform-'+type);assert.ok(platform);assert.ok(Math.abs(platform.position.x)<LAYOUT[5].hx);assert.ok(Math.abs(platform.position.z+4)<LAYOUT[5].hz);}world.update(.1,1,1,false,true,false);assert.equal(world.scene.getObjectByName('automation-discharge').visible,true);});
test('idle steam uploads stop and active instance uploads are limited to effect cadence',()=>{const world=createWorld(canvas,{rendererFactory:fakeRenderer});let steam;world.scene.traverse(o=>{if(o.isInstancedMesh&&o.name!=='automation-discharge')steam=o;});const before=steam.instanceMatrix.version;for(let i=0;i<120;i++)world.update(1/120,i/120,1,false,false,false);assert.equal(steam.instanceMatrix.version,before);for(let i=0;i<120;i++)world.update(1/120,i/120,1,true,false,false);assert.ok(steam.instanceMatrix.version-before<=31);for(let i=0;i<360;i++)world.update(1/120,i/120,1,false,false,false);const idle=steam.instanceMatrix.version;for(let i=0;i<120;i++)world.update(1/120,i/120,1,false,false,false);assert.equal(steam.instanceMatrix.version,idle);});
test('sensitivity and key changes do not reallocate rendering buffers',()=>{let allocations=0;const world=createWorld(canvas,{rendererFactory:()=>({...fakeRenderer(),setPixelRatio(){allocations++;}})});const initial=allocations;const settings=defaultSettings();for(let i=0;i<20;i++){settings.sensitivity=.5+i*.1;world.applySettings(settings);}assert.equal(allocations,initial);settings.quality='low';world.applySettings(settings);assert.ok(allocations>initial);});
test('two boilers are separate numbered models and adding a third keeps their positions',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});world.setMachines([1,0,0,0,0]);const plants=world.scene.getObjectByName('visible-automation');const vertices=()=>{let n=0;plants.traverse(o=>{if(o.geometry)n+=o.geometry.attributes.position.count;});return n;};const one=vertices();world.setMachines([2,0,0,0,0]);assert.ok(vertices()>one*1.8);const first=world.scene.getObjectByName('visible-rig-0'),second=world.scene.getObjectByName('visible-rig-0-1');assert.ok(first&&second);assert.equal(first.userData.identifier,'BOILER #01');assert.equal(second.userData.identifier,'BOILER #02');assert.ok(first.position.distanceTo(second.position)>1.8);const a=first.position.toArray(),b=second.position.toArray();const labels=[];plants.traverse(o=>{if(o.isSprite&&o.userData.unitKey)labels.push(o.userData.text);});assert.deepEqual(labels.sort(),['BOILER #01','BOILER #02']);world.setMachines([3,0,0,0,0]);assert.deepEqual(world.scene.getObjectByName('visible-rig-0').position.toArray(),a);assert.deepEqual(world.scene.getObjectByName('visible-rig-0-1').position.toArray(),b);
});
test('large collections retain every physical machine while nearby detail stays bounded',()=>{
 const world=createWorld(canvas,{rendererFactory:fakeRenderer});world.buildStage(5);world.setMachines([25,25,25,25,25]);world.update(.3,1,1,false,true,false);let units=0,labels=0;world.scene.getObjectByName('visible-automation').traverse(o=>{if(o.userData.identifier)units++;if(o.isSprite&&o.userData.unitKey&&o.visible)labels++;});assert.equal(units,125);assert.ok(labels<=16);const settings=defaultSettings();settings.quality='low';world.applySettings(settings);world.update(.3,1.3,1,false,true,false);labels=0;world.scene.getObjectByName('visible-automation').traverse(o=>{if(o.isSprite&&o.userData.unitKey&&o.visible)labels++;});assert.ok(labels<=10);
});
