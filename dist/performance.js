// Keep a deadline instead of resetting the clock after each rendered refresh.
// This retains the requested average rate on displays such as 144Hz.
export class FramePacer{
 constructor(){this.next=0;this.interval=0;}
 ready(now,fps=60){
  if(fps===0){this.next=now;this.interval=0;return true;}
  const interval=1000/fps;if(interval!==this.interval){this.interval=interval;this.next=now;}
  if(now+.2<this.next)return false;
  this.next+=interval;if(this.next<now-interval)this.next=now+interval;return true;
 }
}
export class AdaptiveResolution{
 constructor(base=1,min=.6,enabled=true){this.configure(base,min,enabled,0);}
 configure(base,min,enabled,now){this.base=base;this.min=Math.min(min,base);this.ratio=base;this.enabled=enabled;this.lastChange=now;this.elapsed=0;this.total=0;this.count=0;this.slow=0;this.targetMs=null;}
 sample(ms,now,active=true,targetMs=1000/60){
  if(!active||!this.enabled||!Number.isFinite(ms)||ms<=0||ms>150){this.elapsed=0;this.total=0;this.count=0;this.slow=0;return null;}
  if(this.targetMs!==targetMs){this.targetMs=targetMs;this.elapsed=0;this.total=0;this.count=0;this.slow=0;}
  this.elapsed+=ms;this.total+=ms;this.count++;if(ms>targetMs*1.68)this.slow++;if(this.elapsed<1500)return null;
  const average=this.total/this.count,slowFraction=this.slow/this.count;this.elapsed=0;this.total=0;this.count=0;this.slow=0;let next=this.ratio;
  if((average>targetMs*1.26||slowFraction>.12)&&now-this.lastChange>=2500)next=Math.max(this.min,this.ratio-.1);
  else if(average<targetMs*1.05&&slowFraction<.05&&now-this.lastChange>=12000)next=Math.min(this.base,this.ratio+.05);
  next=Math.round(next*100)/100;if(Math.abs(next-this.ratio)<.001)return null;this.ratio=next;this.lastChange=now;return next;
 }
}
export class FrameStats{
 constructor(){this.samples=new Float32Array(120);this.index=0;this.count=0;this.lastRead=-Infinity;this.value={fps:0,p95:0};}
 record(ms){if(ms>0&&ms<250){this.samples[this.index]=ms;this.index=(this.index+1)%this.samples.length;this.count=Math.min(this.count+1,this.samples.length);}}
 read(now){if(now-this.lastRead<1000||this.count===0)return this.value;this.lastRead=now;const values=Array.from(this.samples.subarray(0,this.count)).sort((a,b)=>a-b);let sum=0;for(const v of values)sum+=v;this.value.fps=Math.round(1000/(sum/values.length));this.value.p95=Number(values[Math.min(values.length-1,Math.floor(values.length*.95))].toFixed(1));return this.value;}
}
