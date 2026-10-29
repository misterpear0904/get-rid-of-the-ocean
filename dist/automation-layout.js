import {LAYOUT,shoreRadius,accessLayout} from './terrain.js';

const SIZES=[.65,.65,1,1.35,1.6,1.8];
const MIN_PITCH=1.8;

function validSite(stage,x,z,size){
 if(x < -52+size||x > 52-size||z < -50+size||z > 49-size)return false;
 const {hx,hz}=LAYOUT[stage];
 const sourceGap=stage<2?.25:stage>=3?accessLayout(stage).deck:1;
 if(stage>=3){const a=accessLayout(stage);if(Math.abs(x-a.entryX)<1.25+size&&z+4>hz+a.deck-size&&z+4<hz+a.deck+a.rampLength+size)return false;}
 if(Math.abs(x)<hx+size+sourceGap&&Math.abs(z+4)<hz+size+sourceGap)return false;
 const shops=[[-hx-7.2,-5], [hx+7.2,-5],[-hx-7.2,5]];
 if(shops.some(([sx,sz])=>Math.abs(x-sx)<3.3+size&&Math.abs(z-sz)<3.3+size))return false;
 if(x>-8-size&&x<8+size&&z>-4+hz+6-size&&z<-4+hz+12+size)return false;
 return true;
}

function candidates(stage,size){
 const pitch=Math.max(MIN_PITCH,2.2*size),out=[];
 for(let x=-52+size;x<=52-size+1e-8;x+=pitch)for(let z=-50+size;z<=49-size+1e-8;z+=pitch){
  if(validSite(stage,x,z,size))out.push({x:+x.toFixed(4),z:+z.toFixed(4),size,slot:`${x.toFixed(4)},${z.toFixed(4)}`});
 }
 // Keep early units beside the source instead of hiding them behind it.
 const {hx,hz}=LAYOUT[stage];
 out.sort((a,b)=>{
  const sideA=Math.abs(a.x)>hx?0:8,sideB=Math.abs(b.x)>hx?0:8;
  return (Math.hypot(a.x,a.z+4)+sideA)-(Math.hypot(b.x,b.z+4)+sideB)||a.x-b.x||a.z-b.z;
 });
 return {out,pitch};
}

export function automationLayout(stage,counts,previous=[]){
 if(!Number.isInteger(stage)||stage<0||stage>=LAYOUT.length)throw new RangeError('invalid stage');
 if(!Array.isArray(counts)||counts.length!==5||counts.some(n=>!Number.isInteger(n)||n<0||n>25))throw new RangeError('counts must contain five integers from 0 to 25');
 const size=SIZES[stage],{out,pitch}=candidates(stage,size),maxCount=counts.reduce((a,b)=>a+b,0);
 const wanted=new Set(counts.flatMap((n,type)=>Array.from({length:n},(_,index)=>`${type}:${index}`)));
 const assignments=[],used=new Set();
 for(const p of previous){
  if(!wanted.has(p.key)||used.has(p.key)||!Number.isFinite(p.x)||!Number.isFinite(p.z)||!validSite(stage,p.x,p.z,size))continue;
  if(assignments.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<pitch-1e-6))continue;
  assignments.push({...p,size});used.add(p.key);
 }
 const occupied=assignments;
 for(let type=0;type<counts.length;type++)for(let index=0;index<counts[type];index++){
  const key=`${type}:${index}`;if(used.has(key))continue;
  const site=out.find(p=>!occupied.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<pitch-1e-6));
  if(!site)throw new Error(`insufficient dry sites for stage ${stage}: ${maxCount} requested`);
  const slot=assignments.length;
  const unit={key,type,index,x:site.x,z:site.z,size,slot};assignments.push(unit);used.add(key);
 }
 // Preserve input order by type/index even when retaining prior assignments.
 assignments.sort((a,b)=>a.type-b.type||a.index-b.index);
 return assignments;
}

export function offshoreSites(stage=5){
 if(!Number.isInteger(stage)||stage<0||stage>=LAYOUT.length)throw new RangeError('invalid stage');
 const {hx,hz}=LAYOUT[stage],pitch=5.41,rowPitch=pitch*Math.sqrt(3)/2,out=[];
 let row=0;
 for(let z=-4-hz*.9;z<=-4+hz*.9+1e-8;z+=rowPitch,row++)for(let x=-hx*.9+(row%2)*pitch/2;x<=hx*.9+1e-8;x+=pitch){
  const angle=Math.atan2(-(z+4)/hz,x/hx),r=Math.hypot(x/hx,(z+4)/hz)/shoreRadius(angle);
  if(r>=.9||r<=.62)continue;
  if(x>=-1&&x<=8&&z>=-8&&z<=2)continue;
  if(x>=-19&&x<=-3&&z>=-12&&z<=-4)continue;
  out.push({x:+x.toFixed(4),z:+z.toFixed(4)});
 }
 out.sort((a,b)=>Math.atan2(a.z+4,a.x)-Math.atan2(b.z+4,b.x));
 if(out.length<75)throw new Error(`stage ${stage} has only ${out.length} offshore sites`);
 return out.slice(0,Math.max(75,out.length));
}
