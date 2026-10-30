export const STAGES = [
  {name:'A cup of water',short:'Cup',capacity:0.25,revenue:40,bonus:40,radius:3.8,tag:'SMALL BEGINNINGS',story:'Every ocean starts with a single, extremely inconvenient cup.',relic:'A very clean teaspoon'},
  {name:'The stockpot',short:'Pot',capacity:5,revenue:160,bonus:120,radius:4,tag:'TURN UP THE HEAT',story:'Someone made soup. Your job is to unmake the water.',relic:'The missing pasta fork'},
  {name:'Bath time is over',short:'Bathtub',capacity:180,revenue:1200,bonus:700,radius:5,tag:'MAKING A DENT',story:'One rubber duck. One hundred and eighty litres. No mercy.',relic:'Captain Quack'},
  {name:'The neighbourhood pool',short:'Pool',capacity:48000,revenue:7000,bonus:3500,radius:10,tag:'DEEP END ENERGY',story:'The lifeguard has been reassigned to the gift shop.',relic:'A suspiciously heavy pool ring'},
  {name:'Lake Lastdrop',short:'Lake',capacity:2400000,revenue:40000,bonus:18000,radius:17,tag:'AN INDUSTRIAL PROBLEM',story:'The ducks have filed a formal complaint.',relic:'A bicycle from 1978'},
  {name:'The actual ocean',short:'Ocean',capacity:1000000000,revenue:350000,bonus:100000,radius:25,tag:'A PERFECTLY REASONABLE PLAN',story:'A compact, billion-litre ocean. The physics department has left.',relic:'The keys to Atlantis'}
];
export const TOOLS = [
 {name:'Pocket lighter',cost:0,rate:0.009,kind:'fire',desc:'A tiny flame. An unreasonable ambition.',icon:'01'},
 {name:'Storm lighter',cost:24,rate:0.021,kind:'fire',desc:'Windproof. Doubtproof. 2.3× the flame.',icon:'02'},
 {name:'Blowtorch',cost:90,rate:0.1275,kind:'fire',desc:'Now we are actually cooking.',icon:'03'},
 {name:'Power scoop',cost:250,rate:2.7,kind:'scoop',desc:'A bucket with a deeply unnecessary motor.',icon:'04'},
 {name:'Suction cannon',cost:1400,rate:450,kind:'pump',desc:'The water is going to have to go somewhere.',icon:'05'},
 {name:'Industrial siphon',cost:7000,rate:30000,kind:'pump',desc:'Municipal infrastructure. Handheld edition.',icon:'06'},
 {name:'Solar evaporator',cost:30000,rate:750000,kind:'solar',desc:'Borrow a little of the sun.',icon:'07'},
 {name:'Horizon eraser',cost:75000,rate:6750000,kind:'solar',desc:'For when the horizon is mostly water.',icon:'08'}
];
export const MACHINES = [
 {name:'Gas stove',cost:55,rate:0.012,desc:'A faithful little flame. Works while you shop.'},
 {name:'Bucket bot',cost:600,rate:2.5,desc:'Endlessly enthusiastic. Never takes a break.'},
 {name:'Pump station',cost:3000,rate:450,desc:'Pipes, pressure, and absolutely no water bill.'},
 {name:'Steam engine',cost:15000,rate:30000,desc:'An entire factory devoted to less water.'},
 {name:'Orbital lens',cost:65000,rate:800000,desc:'Automation with a very large footprint.'}
];
export const SKILLS = [
 {name:'Steady hands',desc:'+30% manual power per rank.',base:45,max:8},
 {name:'Good business',desc:'+20% water income per rank.',base:60,max:6},
 {name:'Machine whisperer',desc:'+35% automation output per rank.',base:100,max:8}
];
export function freshState(){return {version:1,stage:0,remaining:STAGES[0].capacity,cash:0,earned:0,removed:0,tool:0,machines:[0,0,0,0,0],placedMachines:[0,0,0,0,0],skills:[0,0,0],prestige:0,complete:false,trophies:[],seconds:0,savedAt:Date.now()};}
export function manualRate(s){return TOOLS[s.tool].rate*(1+s.skills[0]*0.3)*(1+s.prestige*0.3);}
export function autoRate(s){return MACHINES.reduce((a,m,i)=>a+m.rate*(s.placedMachines?.[i]||0),0)*(1+s.skills[2]*0.35)*(1+s.prestige*0.3);}
export function machineCost(s,i){return Math.ceil(MACHINES[i].cost*1.65**s.machines[i]);}
export function skillCost(s,i){return Math.ceil(SKILLS[i].base*2.3**s.skills[i]);}
export function removeWater(s,amount){
 if(s.complete||amount<=0||!Number.isFinite(amount))return 0;
 const removed=Math.min(s.remaining,amount);s.remaining=Math.max(0,s.remaining-removed);
 const money=removed/STAGES[s.stage].capacity*STAGES[s.stage].revenue*(1+s.skills[1]*0.2);
 s.cash+=money;s.earned+=money;s.removed+=removed;
 if(s.remaining<STAGES[s.stage].capacity*1e-10){s.remaining=0;s.complete=true;if(!s.trophies.includes(s.stage))s.trophies.push(s.stage);}
 return removed;
}
export function tick(s,dt,working){if(!Number.isFinite(dt)||dt<=0)return 0;s.seconds+=dt;return removeWater(s,(autoRate(s)+(working?manualRate(s):0))*dt);}
export function buyTool(s,i){if(i!==s.tool+1||!TOOLS[i]||s.cash+1e-8<TOOLS[i].cost)return false;s.cash-=TOOLS[i].cost;s.tool=i;return true;}
export function buyMachine(s,i){if(!MACHINES[i]||s.machines[i]>=25)return false;const c=machineCost(s,i);if(s.cash+1e-8<c)return false;s.cash-=c;s.machines[i]++;return true;}
export function commissioningVolume(s,i){return Math.min(STAGES[s.stage].capacity*.04,MACHINES[i].rate*8*(1+s.skills[2]*.35)*(1+s.prestige*.3));}
export function placeMachine(s,i){if(!MACHINES[i]||s.placedMachines[i]>=s.machines[i])return false;s.placedMachines[i]++;removeWater(s,commissioningVolume(s,i));return true;}
export function pendingMachines(s){return s.machines.reduce((n,count,i)=>n+count-s.placedMachines[i],0);}
export function buySkill(s,i){if(!SKILLS[i]||s.skills[i]>=SKILLS[i].max)return false;const c=skillCost(s,i);if(s.cash+1e-8<c)return false;s.cash-=c;s.skills[i]++;return true;}
export function advance(s){if(!s.complete||s.stage>=STAGES.length-1)return false;s.cash+=STAGES[s.stage].bonus;s.earned+=STAGES[s.stage].bonus;s.stage++;s.remaining=STAGES[s.stage].capacity;s.complete=false;return true;}
export function prestige(s){if(!s.complete||s.stage!==STAGES.length-1)return null;const n=freshState();n.prestige=s.prestige+1;return n;}
export function loadState(raw){
 try{const s=JSON.parse(raw);if(s.version!==1||!Number.isInteger(s.stage)||s.stage<0||s.stage>=STAGES.length||!Number.isInteger(s.tool)||s.tool<0||s.tool>=TOOLS.length)return null;
 for(const k of ['cash','earned','removed','prestige','seconds','savedAt','remaining'])if(!Number.isFinite(s[k])||s[k]<0)return null;
 if(s.remaining>STAGES[s.stage].capacity||!Array.isArray(s.machines)||s.machines.length!==5||s.machines.some(v=>!Number.isInteger(v)||v<0||v>25)||!Array.isArray(s.skills)||s.skills.length!==3||s.skills.some((v,i)=>!Number.isInteger(v)||v<0||v>SKILLS[i].max))return null;
 if(s.placedMachines===undefined)s.placedMachines=[0,0,0,0,0];
 if(!Array.isArray(s.placedMachines)||s.placedMachines.length!==5||s.placedMachines.some((v,i)=>!Number.isInteger(v)||v<0||v>s.machines[i]))return null;
 s.complete=s.remaining===0;s.trophies=Array.from({length:s.stage+(s.complete?1:0)},(_,i)=>i);return s;
 }catch{return null;}
}
export function volume(v){if(v<1)return `${Math.max(0,v*1000).toFixed(v<0.01?1:0)} mL`;if(v>=1e9)return `${(v/1e9).toFixed(2)}B L`;if(v>=1e6)return `${(v/1e6).toFixed(2)}M L`;if(v>=1000)return `${(v/1000).toFixed(1)}k L`;return `${v.toFixed(v<10?2:0)} L`;}
export function money(v){return v>=1e6?`$${(v/1e6).toFixed(2)}m`:v>=10000?`$${(v/1000).toFixed(1)}k`:`$${Math.floor(v).toLocaleString('en-US')}`;}
