import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,TOOLS,MACHINES,freshState,tick,removeWater,buyTool,buyMachine,buySkill,placeMachine,pendingMachines,manualRate,autoRate,advance,prestige,loadState} from '../dist/game.js';
test('water removal earns proportional money and cannot overshoot',()=>{const s=freshState();removeWater(s,.125);assert.equal(s.cash,20);assert.equal(s.remaining,.125);removeWater(s,100);assert.equal(s.cash,40);assert.equal(s.remaining,0);assert.equal(s.complete,true);tick(s,30,true);assert.equal(s.cash,40);assert.deepEqual(s.trophies,[0]);});
test('cup finishes in about 28 seconds with the pocket lighter',()=>{const s=freshState();tick(s,27,true);assert.equal(s.complete,false);tick(s,1,true);assert.equal(s.complete,true);});
test('shop enforces affordability and sequential tools',()=>{const s=freshState();assert.equal(buyTool(s,1),false);s.cash=100000;assert.equal(buyTool(s,3),false);assert.equal(buyTool(s,1),true);assert.equal(s.cash,100000-TOOLS[1].cost);assert.equal(buyTool(s,1),false);assert.ok(manualRate(s)>TOOLS[0].rate);});
test('automation works independently from holding action',()=>{const s=freshState();s.cash=100;assert.equal(buyMachine(s,0),true);assert.equal(s.cash,45);assert.equal(autoRate(s),0);assert.equal(pendingMachines(s),1);assert.equal(placeMachine(s,0),true);assert.equal(autoRate(s),MACHINES[0].rate);tick(s,2,false);assert.ok(Math.abs(s.remaining-(.25-.01-.024))<1e-9);});
test('skills change manual output, income, and automation',()=>{const s=freshState();s.cash=10000;buyMachine(s,0);placeMachine(s,0);const m=manualRate(s),a=autoRate(s);buySkill(s,0);buySkill(s,1);buySkill(s,2);assert.equal(manualRate(s),m*1.3);assert.equal(autoRate(s),a*1.35);const c=s.cash;removeWater(s,.125);assert.ok(Math.abs(s.cash-c-24)<1e-9);});
test('completion bonus is claimed once and upgrades carry forward',()=>{const s=freshState();s.cash=100;buyTool(s,1);assert.equal(advance(s),false);removeWater(s,1);const c=s.cash;assert.equal(advance(s),true);assert.equal(s.cash,c+40);assert.equal(s.stage,1);assert.equal(s.tool,1);assert.equal(s.remaining,5);assert.equal(advance(s),false);});
test('offline removal caps at the current container',()=>{const s=freshState();s.machines[0]=1;s.placedMachines[0]=1;tick(s,3600,false);assert.equal(s.cash,40);assert.equal(s.stage,0);assert.equal(s.complete,true);});
test('saves roundtrip and reject impossible fields',()=>{const s=freshState();tick(s,2,true);assert.deepEqual(loadState(JSON.stringify(s)),s);for(const change of [{stage:99},{remaining:-1},{cash:-5},{tool:9},{machines:[-1,0,0,0,0]},{skills:[999,0,0]},{remaining:999}])assert.equal(loadState(JSON.stringify({...s,...change})),null);assert.equal(loadState('garbage'),null);});
test('final voyage unlocks permanent power and resets progression',()=>{const s=freshState();assert.equal(prestige(s),null);s.stage=5;s.remaining=1;removeWater(s,1);const n=prestige(s);assert.equal(n.prestige,1);assert.equal(n.stage,0);assert.equal(n.cash,0);assert.equal(manualRate(n),TOOLS[0].rate*1.3);});
test('all eight manual rates, earnings, skill scaling, and saved tool selection stay compatible',()=>{
 const expected=[.009,.021,.1275,2.7,450,30000,750000,6750000];
 assert.deepEqual(TOOLS.map(tool=>tool.rate),expected);
 for(let i=0;i<expected.length;i++){
  const s=freshState();s.stage=5;s.remaining=STAGES[5].capacity;s.tool=i;
  assert.equal(manualRate(s),expected[i]);
  assert.equal(tick(s,1,true),expected[i]);
  assert.ok(Math.abs(s.cash-expected[i]/STAGES[5].capacity*STAGES[5].revenue)<1e-9);
 }
 const skilled=freshState();skilled.stage=5;skilled.remaining=STAGES[5].capacity;skilled.tool=7;skilled.skills[0]=1;skilled.skills[1]=1;
 assert.equal(manualRate(skilled),expected[7]*1.3);
 assert.equal(tick(skilled,1,true),expected[7]*1.3);
 assert.ok(Math.abs(skilled.cash-(expected[7]*1.3/STAGES[5].capacity*STAGES[5].revenue*1.2))<1e-9);
 const oldSave={...freshState(),tool:7};delete oldSave.placedMachines;
 const restored=loadState(JSON.stringify(oldSave));
 assert.equal(restored.tool,7);assert.equal(manualRate(restored),expected[7]);
});
test('packed automation stays idle until installed and cannot be placed twice',()=>{const s=freshState();s.cash=100;buyMachine(s,0);tick(s,3600,false);assert.equal(s.remaining,.25);assert.equal(autoRate(s),0);assert.equal(placeMachine(s,0),true);assert.equal(pendingMachines(s),0);assert.equal(placeMachine(s,0),false);assert.equal(placeMachine(s,1),false);tick(s,1,false);assert.ok(s.remaining<.25);assert.deepEqual(loadState(JSON.stringify(s)).placedMachines,[1,0,0,0,0]);});
test('old saves preserve purchased machines in inventory and reject impossible placements',()=>{const s=freshState();s.machines=[2,1,0,0,0];delete s.placedMachines;const restored=loadState(JSON.stringify(s));assert.deepEqual(restored.machines,[2,1,0,0,0]);assert.equal(pendingMachines(restored),3);assert.equal(autoRate(restored),0);assert.equal(loadState(JSON.stringify({...restored,placedMachines:[3,0,0,0,0]})),null);assert.equal(loadState(JSON.stringify({...restored,placedMachines:[-1,0,0,0,0]})),null);});
test('commissioning surge removes at most four percent, pays for actual water, and cannot repeat on reload',()=>{const s=freshState();s.cash=100;buyMachine(s,0);const before=s.remaining,cash=s.cash;placeMachine(s,0);const removed=before-s.remaining;assert.ok(removed>0&&removed<=STAGES[0].capacity*.04+1e-10);assert.ok(Math.abs(s.cash-cash-removed/STAGES[0].capacity*STAGES[0].revenue)<1e-9);const restored=loadState(JSON.stringify(s)),remaining=restored.remaining;assert.equal(placeMachine(restored,0),false);assert.equal(restored.remaining,remaining);tick(restored,1,false);assert.ok(Math.abs(restored.remaining-(remaining-MACHINES[0].rate))<1e-9);});
test('a buying strategy can clear every stage with money earned by play',()=>{
 const s=freshState();let t=0;const split=[];for(let step=0;step<36000&&!s.complete;step++){
  // Buy the strongest affordable tool; allow a modest automation spend.
  while(buyTool(s,s.tool+1)){}
  if(s.tool>=2&&s.machines[0]===0&&s.cash>80)buyMachine(s,0);
  if(s.tool>=4&&s.machines[2]===0&&s.cash>5000)buyMachine(s,2);
  if(s.tool>=6&&s.machines[3]===0&&s.cash>20000)buyMachine(s,3);
  for(let i=0;i<5;i++)while(placeMachine(s,i)){}; tick(s,.25,true);t+=.25;
  if(s.complete){split.push({stage:STAGES[s.stage].short,time:t,tool:TOOLS[s.tool].name});if(s.stage<5)advance(s);}
 }
 assert.equal(s.stage,5);assert.equal(s.complete,true);assert.ok(t<2700,`Run took ${t}s`);console.log('Continuous-work balance:',JSON.stringify(split));
});
