import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LAYOUT,accessLayout,basinHeight,insideBasin,walkableHeight,waterRange} from '../dist/terrain.js';

test('larger basins sit above grade and expose the requested rims and water ranges',()=>{
 const rims=[2,2.85,4.15,5.45];
 for(let stage=2;stage<=5;stage++){
  const l=LAYOUT[stage],range=waterRange(stage);
  assert.equal(l.floor,.35);assert.equal(l.rim,rims[stage-2]);
  assert.equal(range.bottom,.41);assert.equal(range.top,l.rim-.08);
 }
 assert.deepEqual(waterRange(0),{bottom:1.27,top:2.23});
 assert.deepEqual(waterRange(1),{bottom:1.27,top:2.38});
});

test('pool exterior access ramp ascends continuously to the raised viewing deck',()=>{
 const stage=3,{hx,hz}=LAYOUT[stage],a=accessLayout(stage),x=a.entryX;
 let y=0;
 for(let dz=hz+a.deck+a.rampLength;dz>=hz+a.deck-.01;dz-=.1){
  const next=walkableHeight(stage,x,dz-4,0,y);assert.notEqual(next,null,`exterior ramp ${dz}`);assert.ok(Math.abs(next-y)<=.5);y=next;
 }
 assert.ok(Math.abs(y-LAYOUT[stage].rim)<.03);
 assert.equal(basinHeight(stage,x,hz-4),LAYOUT[stage].rim);
});

test('empty pool interior ramp descends continuously into the basin',()=>{
 const stage=3,{hx,hz,floor,rim}=LAYOUT[stage],a=accessLayout(stage),x=a.entryX;
 let y=rim;
 for(let dz=hz;dz>=hz-a.innerLength-.01;dz-=.1){
  const next=walkableHeight(stage,x,dz-4,0,y);assert.notEqual(next,null,`inner ramp ${dz}`);assert.ok(Math.abs(next-y)<=.5);y=next;
 }
 assert.ok(Math.abs(y-floor)<.01);
});

test('raised basin cliffs and submerged walking are blocked while dry ground stays walkable',()=>{
 const stage=3,{hx,hz}=LAYOUT[stage],a=accessLayout(stage),x=a.entryX;
 assert.equal(walkableHeight(stage,0,-4+hz+1,0,0),null,'cliff onto raised deck');
 assert.equal(walkableHeight(stage,x,0,1,LAYOUT[stage].floor),null,'wet basin floor');
 assert.equal(walkableHeight(stage,40,0,1,0),0,'exterior ground');
 assert.equal(walkableHeight(stage,0,80,0,0),null,'world bounds');
 assert.equal(insideBasin(stage,0,-4),true);assert.equal(insideBasin(stage,hx+2,-4),false);
});

test('organic lake and ocean shores grade from basin floor up to rim',()=>{
 for(const stage of [4,5]){
  const {hx,hz,floor,rim}=LAYOUT[stage],center=basinHeight(stage,0,-4),edge=basinHeight(stage,hx, -4);
  assert.equal(center,floor);assert.ok(edge>floor&&edge<rim);
  const outside=basinHeight(stage,hx+1.5,-4);assert.equal(outside,rim);
  assert.equal(insideBasin(stage,hx,-4),true);assert.equal(insideBasin(stage,hx*1.2,-4),false);
  assert.equal(walkableHeight(stage,0,-4,1,floor),null,'wet deep basin');
  assert.equal(walkableHeight(stage,0,-4,0,floor),floor,'dry deep basin');
  assert.equal(walkableHeight(stage,48,-4,1,0),0,'dry exterior ground remains walkable');
 }
});

test('small raised containers remain solid obstacles and access metadata stays finite',()=>{
 for(let stage=0;stage<3;stage++){assert.equal(basinHeight(stage,0,-4),null);assert.equal(walkableHeight(stage,0,-4,0,0),null);assert.ok(Number.isFinite(accessLayout(stage).rampLength));}
});
test('lake and ocean exterior stairs also connect grade to their viewing decks',()=>{
 for(const stage of [4,5]){const {hz,rim}=LAYOUT[stage],a=accessLayout(stage);let y=0;for(let d=hz+a.deck+a.rampLength;d>=hz+a.deck-.01;d-=.1){const next=walkableHeight(stage,a.entryX,d-4,1,y);assert.notEqual(next,null);y=next;}assert.ok(Math.abs(y-rim)<.05);}
});
