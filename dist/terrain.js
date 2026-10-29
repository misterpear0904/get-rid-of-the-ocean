// World-space scale stays independent from the deliberately stylized litre economy.
export const LAYOUT=[
 {hx:1.6,hz:1.3,floor:1.2}, {hx:1.6,hz:1.3,floor:1.2},
 {hx:2.4,hz:1.35,floor:.35,rim:2}, {hx:12,hz:8,floor:.35,rim:2.85},
 {hx:22,hz:17,floor:.35,rim:4.15}, {hx:44,hz:34,floor:.35,rim:5.45}
];
export function shoreRadius(angle){return 1+.045*Math.sin(angle*3)+.025*Math.cos(angle*7);}
export function accessLayout(stage){
 if(!Number.isInteger(stage)||stage<0||stage>=LAYOUT.length)throw new RangeError('invalid stage');
 const {hx,rim}=LAYOUT[stage];
 return {entryX:-hx*.55,deck:1.8,rampLength:Math.max(5.5,(rim??0)*2.4),innerLength:5.5};
}
export function waterRange(stage){
 const l=LAYOUT[stage];if(!l)throw new RangeError('invalid stage');
 return stage<2?{bottom:1.27,top:stage===0?2.23:2.38}:{bottom:l.floor+.06,top:l.rim-.08};
}
export function insideBasin(stage,x,z){
 const {hx,hz}=LAYOUT[stage],dz=z+4;
 if(stage>=4){const a=Math.atan2(-dz/hz,x/hx),r=Math.hypot(x/hx,dz/hz)/shoreRadius(a);return r<1;}
 const pad=stage===3?.2:stage===2?.4:.55;
 return Math.abs(x)<hx+pad&&Math.abs(dz)<hz+pad;
}
const clamp01=v=>Math.max(0,Math.min(1,v));
export function basinHeight(stage,x,z){
 const {hx,hz,floor,rim}=LAYOUT[stage],dz=z+4;
 if(stage<3)return insideBasin(stage,x,z)?null:0;
 if(stage>=3){
  const access=accessLayout(stage),onExteriorRamp=Math.abs(x-access.entryX)<1.25&&dz>=hz+access.deck&&dz<=hz+access.deck+access.rampLength;
  if(onExteriorRamp)return rim*(1-clamp01((dz-(hz+access.deck))/access.rampLength));
  if(Math.abs(x)<=hx+access.deck&&Math.abs(dz)<=hz+access.deck){
   if(insideBasin(stage,x,z)){
    if(stage===3&&Math.abs(x-access.entryX)<1.25&&dz>hz-access.innerLength)
     return floor+(rim-floor)*clamp01((dz-(hz-access.innerLength))/access.innerLength);
    if(stage>=4){const a=Math.atan2(-dz/hz,x/hx),r=Math.hypot(x/hx,dz/hz)/shoreRadius(a);
     if(r<=.62)return floor;
     return floor+(rim-floor)*clamp01((r-.62)/.38);
    }
    return floor;
   }
   return rim;
  }
  return 0;
 }
 return insideBasin(stage,x,z)?floor:0;
}
export function walkableHeight(stage,x,z,fraction,currentHeight=0){
 if(Math.abs(x)>54||Math.abs(z)>52)return null;
 const h=basinHeight(stage,x,z);if(h===null||Math.abs(h-currentHeight)>.5)return null;
 if(stage>=2&&insideBasin(stage,x,z)&&fraction>.00001){const {bottom,top}=waterRange(stage),water=bottom+(top-bottom)*fraction;if(h+.08<water)return null;}
 return h;
}
