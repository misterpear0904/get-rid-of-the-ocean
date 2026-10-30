import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FramePacer,AdaptiveResolution,FrameStats} from '../dist/performance.js';
test('frame deadlines sustain selected rates without drifting on 60, 120 and 144Hz monitors',()=>{
 for(const hz of [60,120,144])for(const limit of [30,60,90,120,144,0]){const pacer=new FramePacer();let count=0;for(let i=1;i<=hz*10;i++)if(pacer.ready(i*1000/hz,limit))count++;const expected=Math.min(hz,limit||hz)*10;assert.ok(Math.abs(count-expected)<=1,`${hz}Hz ${limit} limit produced ${count}`);}
});
test('frame limits switch promptly, menus remain bounded, and stalls do not cause catch-up bursts',()=>{
 const p=new FramePacer();assert.equal(p.ready(0,60),true);assert.equal(p.ready(1,60),false);assert.equal(p.ready(2,1),true);assert.equal(p.ready(500,1),false);assert.equal(p.ready(1002,1),true);assert.equal(p.ready(1003,60),true);assert.equal(p.ready(1004,60),false);assert.equal(p.ready(5000,60),true);assert.equal(p.ready(5001,60),false);assert.equal(p.ready(5002,0),true);
});
test('adaptive resolution recognizes intentional 30FPS pacing instead of treating it as overload',()=>{
 const a=new AdaptiveResolution(1,.6);for(let i=0;i<1200;i++)a.sample(1000/30,i*1000/30,true,1000/30);assert.equal(a.ratio,1);
});
test('sustained slow frames gradually lower resolution without exceeding its floor',()=>{const a=new AdaptiveResolution(1,.6);let now=0,changes=0,last=1;for(let i=0;i<2000;i++){now+=30;const next=a.sample(30,now);if(next!==null){assert.ok(last-next<=.101);assert.ok(next>=.6);last=next;changes++;}}assert.equal(a.ratio,.6);assert.equal(changes,4);});
test('brief stalls and paused menus do not reduce quality, and recovery is deliberately slow',()=>{const a=new AdaptiveResolution(1,.6);a.sample(200,200);assert.equal(a.ratio,1);for(let i=0;i<200;i++)a.sample(40,200+i*40,false);assert.equal(a.ratio,1);let now=10000;for(let i=0;i<200;i++){now+=30;a.sample(30,now);}assert.ok(a.ratio<1);const low=a.ratio;for(let i=0;i<300;i++){now+=15;a.sample(15,now);}assert.equal(a.ratio,low);for(let i=0;i<1000;i++){now+=15;a.sample(15,now);}assert.ok(a.ratio>low);assert.ok(a.ratio<=1);});
test('adaptive rendering can be disabled and frame diagnostics report slow-frame percentiles',()=>{const a=new AdaptiveResolution(.75,.5,false);for(let i=0;i<1000;i++)assert.equal(a.sample(40,i*40),null);assert.equal(a.ratio,.75);const stats=new FrameStats();for(let i=0;i<120;i++)stats.record(i%10===0?40:16);const result=stats.read(2000);assert.equal(result.p95,40);assert.ok(result.fps>45&&result.fps<60);});
test('repeated frame spikes trigger adaptation while isolated hitches do not',()=>{const spiky=new AdaptiveResolution(1,.6),rare=new AdaptiveResolution(1,.6);let slowNow=0,rareNow=0;for(let i=0;i<500;i++){const a=i%5===0?40:16,b=i%100===0?40:16;spiky.sample(a,slowNow+=a);rare.sample(b,rareNow+=b);}assert.ok(spiky.ratio<1);assert.equal(rare.ratio,1);});

test('switching between idle and active frame budgets does not falsely lower resolution',()=>{
 const a=new AdaptiveResolution(1,.6);let now=0;
 for(let cycle=0;cycle<8;cycle++)for(const fps of [30,60])for(let i=0;i<100;i++){const ms=1000/fps;a.sample(ms,now+=ms,true,ms);}
 assert.equal(a.ratio,1);
});
