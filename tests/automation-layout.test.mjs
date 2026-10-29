import test from 'node:test';
import assert from 'node:assert/strict';
import {automationLayout,offshoreSites} from '../dist/automation-layout.js';
import {LAYOUT,shoreRadius} from '../dist/terrain.js';

const maximum=[25,25,25,25,25];
const SIZES=[.65,.65,1,1.35,1.6,1.8];

test('maximum 125 assignments fit each stage on dry, bounded, spaced sites',()=>{
 for(let stage=0;stage<LAYOUT.length;stage++){
  const sites=automationLayout(stage,maximum),{hx,hz}=LAYOUT[stage],pitch=Math.max(1.8,2.2*SIZES[stage]);
  assert.equal(sites.length,125,`stage ${stage}`);
  assert.equal(new Set(sites.map(s=>s.key)).size,125);
  for(let i=0;i<sites.length;i++){
   const s=sites[i];assert.ok(s.x>=-52&&s.x<=52&&s.z>=-50&&s.z<=49,`bounds ${stage} ${s.key}`);
   const sourceGap=stage<2?.25:1;assert.ok(!(Math.abs(s.x)<hx+s.size+sourceGap&&Math.abs(s.z+4)<hz+s.size+sourceGap),`water ${stage} ${s.key}`);
   assert.equal(s.size,SIZES[stage]);
   for(let j=0;j<i;j++)assert.ok(Math.hypot(s.x-sites[j].x,s.z-sites[j].z)>=pitch-1e-6,`spacing ${stage} ${s.key}/${sites[j].key}`);
  }
 }
});

test('retained units keep their sites when new units are added',()=>{
 const first=automationLayout(4,[2,1,0,0,0]);
 const next=automationLayout(4,[4,1,0,0,2],first);
 for(const s of first){const later=next.find(q=>q.key===s.key);assert.ok(later);assert.equal(later.x,s.x);assert.equal(later.z,s.z);}
});

test('offshore deck has 75 unique sites outside exclusions with scaled spacing',()=>{
 const sites=offshoreSites(),{hx,hz}=LAYOUT[5];
 assert.ok(sites.length>=75);assert.equal(new Set(sites.map(s=>`${s.x},${s.z}`)).size,sites.length);
 for(let i=0;i<sites.length;i++){
  const s=sites[i],a=Math.atan2(-(s.z+4)/hz,s.x/hx),r=Math.hypot(s.x/hx,(s.z+4)/hz)/shoreRadius(a);
  assert.ok(r<.9&&r>.62);assert.ok(!(s.x>=-1&&s.x<=8&&s.z>=-8&&s.z<=2));assert.ok(!(s.x>=-19&&s.x<=-3&&s.z>=-12&&s.z<=-4));
  for(let j=0;j<i;j++)assert.ok(Math.hypot(s.x-sites[j].x,s.z-sites[j].z)>=5.4-1e-6);
 }
});
