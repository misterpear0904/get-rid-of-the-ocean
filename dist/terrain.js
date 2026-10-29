// World-space scale stays independent from the deliberately stylized litre economy.
export const LAYOUT=[
 {hx:1.6,hz:1.3,floor:1.2}, {hx:1.6,hz:1.3,floor:1.2},
 {hx:2.4,hz:1.35,floor:-1.05}, {hx:12,hz:8,floor:-2.4},
 {hx:22,hz:17,floor:-3.7}, {hx:44,hz:34,floor:-5}
];
export function shoreRadius(angle){return 1+.045*Math.sin(angle*3)+.025*Math.cos(angle*7);}
export function basinHeight(stage,x,z){
 const {hx,hz,floor}=LAYOUT[stage],dz=z+4;
 if(stage<2)return Math.abs(x)<hx+.55&&Math.abs(dz)<hz+.55?null:0;
 if(stage===2)return Math.abs(x)<hx+.4&&Math.abs(dz)<hz+.4?null:0;
 if(stage===3){
  if(Math.abs(x)>=hx+.2||Math.abs(dz)>=hz+.2)return 0;
  const length=5.5;
  if(Math.abs(x+hx*.55)<1.25&&dz>hz-length)return floor+(0-floor)*Math.max(0,Math.min(1,(dz-(hz-length))/length));
  return floor;
 }
 const a=Math.atan2(-dz/hz,x/hx),r=Math.hypot(x/hx,dz/hz)/shoreRadius(a);
 if(r>=1)return 0;if(r<=.62)return floor;
 return floor+(0-floor)*(r-.62)/.38;
}
export function walkableHeight(stage,x,z,fraction,currentHeight=0){
 if(Math.abs(x)>54||Math.abs(z)>52)return null;
 const h=basinHeight(stage,x,z);if(h===null||Math.abs(h-currentHeight)>.5)return null;
 if(stage>=3&&h<-.02&&fraction>.00001){const bottom=LAYOUT[stage].floor+.06,water=bottom+(.02-bottom)*fraction;if(h+.08<water)return null;}
 return h;
}
