import * as THREE from './vendor/three.module.js';
import {LAYOUT,accessLayout} from './terrain.js';
import {automationLayout,offshoreSites} from './automation-layout.js';

export function createSpectacle({scene,mesh,box,cyl,lineBetween,textSprite,M,mat,batchStatic}){
 const landmarks=new THREE.Group(),plants=new THREE.Group(),moving=new THREE.Group(),trophyYard=new THREE.Group();
 landmarks.name='scale-landmarks';plants.name='visible-automation';moving.name='automation-motion';trophyYard.name='trophy-yard';scene.add(landmarks,plants,moving,trophyYard);
 const glow=new THREE.MeshBasicMaterial({color:'#ffac4d'}),water=new THREE.MeshBasicMaterial({color:'#67e0ed'}),beamMat=new THREE.MeshBasicMaterial({color:'#fff1a0',transparent:true,opacity:.22,depthWrite:false});
 let stage=0,bounds=LAYOUT[0],bottom=1.2,top=2.2,trophies=[],actors=[],outlets=[],progressKey='',pulse=0;
 let machineSites=[],labels=[],labelElapsed=1;const animatedUnits=new Set(),offshore=offshoreSites(5);
 const trophyPosition=new THREE.Vector3();const metrics={landmarks:0,machines:0};
 function clear(group){while(group.children.length){const c=group.children[0];c.traverse(o=>{o.geometry?.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});group.remove(c);}}
 function sign(text,x,y,z,scale,parent=landmarks){const s=textSprite(text,{scale,size:46,color:'#315b48'});s.position.set(x,y,z);s.userData.text=text;parent.add(s);return s;}
 function worker(x,z,parent=landmarks){const g=new THREE.Group();g.name='human-scale-worker';g.userData.height=1.9;g.position.set(x,0,z);parent.add(g);box(.48,.65,.28,M.orange,0,1.05,0,g);for(const a of [-.14,.14])box(.17,.65,.23,M.green,a,.4,0,g);mesh(new THREE.SphereGeometry(.22,10,8),mat('#d9ac7b'),0,1.6,0,g);cyl(.29,.29,.12,M.yellow,0,1.83,0,g,10);return g;}
 function rail(x,z,length,alongX=true,parent=landmarks){for(const n of [-.5,0,.5])box(.055,1,.055,M.white,x+(alongX?n*length:0),.5,z+(alongX?0:n*length),parent);box(alongX?length:.055,.055,alongX?.055:length,M.white,x,.95,z,parent);}
 function buildStage(i,geometry){stage=i;machineSites=[];bounds=LAYOUT[i];bottom=geometry.bottom;top=geometry.top;clear(landmarks);actors=[];metrics.landmarks=0;
  const {hx,hz,floor,rim}=bounds;
  // A person, 2.2m door, and one-metre railings never grow with the basin.
  worker(-hx-3,-4+hz+1);const hut=new THREE.Group();hut.name='human-scale-door';hut.position.set(hx+3,0,-4+hz+1);landmarks.add(hut);box(2.1,2.5,1.3,M.white,0,1.25,0,hut);box(.9,2.2,.04,M.green,0,1.1,.67,hut);box(2.4,.15,1.6,M.orange,0,2.55,0,hut);sign('FIELD OFFICE',0,2.9,.7,2,hut);const deckRails=new THREE.Group();deckRails.position.y=i>=3?rim:0;landmarks.add(deckRails);rail(hx*.5,-4+hz+.55,3,true,deckRails);
  sign(i<2?'ONE LIGHTER. ONE VERY SMALL START.':i===3?'24 METRES ACROSS · SAME LITTLE LIGHTER':i===4?'LAKE LASTDROP · 44 METRES ACROSS':'88 METRES OF OCEAN · WALK THE SHORE',0,i>=3?rim+2.6:3.7,-4+hz+1.5,i<2?3:6);
  if(i>=3){
   const {entryX,deck,rampLength}=accessLayout(i),n=Math.ceil(rim/.18);
   const stairs=new THREE.Group();stairs.name='raised-basin-access';landmarks.add(stairs);
   for(let k=0;k<n;k++){const h=rim*(1-k/n);box(2.4,h,rampLength/n+.02,M.white,entryX,h/2,-4+hz+deck+(k+.5)*rampLength/n,stairs);}
   sign('UP TO THE WATER',entryX,1.2,-4+hz+deck+rampLength+.5,3.6);
  }
  if(i===3){
   const length=5.5,n=12,x=-hx*.55;for(let k=0;k<n;k++){const z=-4+hz-(k+.5)*length/n,y=floor+(rim-floor)*(1-k/n);box(2.4,.15,length/n+.015,M.white,x,y-.075,z,landmarks);}
   sign('WALK DOWN AS THE WATER FALLS',x,rim+1.5,-4+hz+1.1,3.8);rail(x-1.4,-4+hz-.5,3,false,deckRails);
   for(let k=0;k<5;k++){const marker=box(.18,.02,hz*2-.5,M.green,-hx+2+k*4,floor+.025,-4,landmarks);marker.name='pool-lane';}
  }
  if(i>=4){
   // Ruins on the dry bed emerge naturally as the real water plane lowers.
   const ruins=new THREE.Group();ruins.name='exposed-ruins';ruins.position.set(2,floor,-5);landmarks.add(ruins);
   for(let n=0;n<4;n++){cyl(.35,.42,2.5,M.sand,(n%2)*3,1.25,Math.floor(n/2)*3,ruins,8);}box(4,.35,4,M.sand,1.5,2.6,1.5,ruins);box(5,.2,5,M.stone,1.5,.1,1.5,ruins);
   for(let n=0;n<5;n++)box(.7,.12,.6,M.stone,-3+n*.9,floor+.06,2,landmarks);
   sign('FOLLOW THE EXPOSED SHORE TO THE RUINS',-hx*.35,rim+1.3,-4+hz+1.2,5);
  }
  if(i===5){
   const ship=new THREE.Group();ship.name='emerging-shipwreck';ship.position.set(-11,floor+.15,-8);ship.rotation.y=.35;landmarks.add(ship);
   box(13,1.25,3.2,M.darkwood,0,.7,0,ship);box(11.5,.15,3,M.wood,0,1.45,0,ship);box(3.8,1.9,2.5,M.white,1.7,2.4,0,ship);for(let n=0;n<4;n++)box(.55,.55,.05,M.green,.3+n*.8,2.6,1.28,ship);cyl(.09,.12,3.8,M.darkwood,-2,2.8,0,ship,8);rail(0,1.5,10,true,ship);rail(0,-1.5,10,true,ship);
  }
  batchStatic(landmarks,new Set());metrics.landmarks=landmarks.children.length;setTrophies(trophies,true);
 }
 function setTrophies(list,force=false){const key=list.join(',');trophies=[...list];if(key===progressKey&&!force)return;progressKey=key;clear(trophyYard);trophyPosition.set(0,0,-4+bounds.hz+9);trophyYard.position.copy(trophyPosition);
  sign('WHERE IT ALL STARTED',0,2.9,0,4.5,trophyYard);
  for(const i of list.filter(n=>n<3)){const g=new THREE.Group();g.name='cleared-container-'+i;g.position.set(-4+i*4.5,0,0);trophyYard.add(g);box(i===2?5.3:2.4,.2,i===2?3.1:2.4,M.stone,0,.1,0,g);
   if(i<2){const r=i===0?.64:.93,h=i===0?1.1:1.25,material=i===0?M.white:M.metal;cyl(r,r,.1,material,0,.3,0,g);mesh(new THREE.CylinderGeometry(r,r,h,24,1,true),material,0,.3+h/2,0,g);const rim=mesh(new THREE.TorusGeometry(r,.045,5,24),material,0,.3+h,0,g);rim.rotation.x=Math.PI/2;if(i===0)mesh(new THREE.TorusGeometry(.42,.105,6,18),M.white,r+.19,.85,0,g);}
   else{box(4.8,.15,2.7,M.white,0,.3,0,g);for(const x of [-2.3,2.3])box(.15,1,2.7,M.white,x,.8,0,g);for(const z of [-1.3,1.3])box(4.8,1,.15,M.white,0,.8,z,g);}
   sign(['THE FIRST 250 mL','THE 5 L STOCKPOT','180 L. GONE.'][i],0,2.2,0,2.8,g);
  }
  if(!list.length)sign('YOUR EMPTY CUP WILL LIVE HERE',0,1.3,0,4,trophyYard);
  batchStatic(trophyYard,new Set(trophyYard.children.filter(c=>c.name.startsWith('cleared-container-'))));
 }
 function buildMachines(counts){clear(plants);clear(moving);actors=[];outlets=[];labels=[];animatedUnits.clear();labelElapsed=1;metrics.machines=counts.reduce((a,b)=>a+b,0);coloursDirty=true;const {hx,hz}=bounds;
  machineSites=automationLayout(stage,counts,machineSites);
  for(const unit of machineSites){const {type,index,x,z,size}=unit;const identifier=['BOILER','BUCKET BOT','PUMP STATION','STEAM ENGINE','SOLAR ARRAY'][type]+' #'+String(index+1).padStart(2,'0');
   const rig=new THREE.Group();rig.name='visible-rig-'+type+(index?'-'+index:'');rig.userData.unitKey=unit.key;rig.userData.machineType=type;rig.userData.machineIndex=index;rig.userData.identifier=identifier;rig.position.set(x,0,z);plants.add(rig);
   const chassis=new THREE.Group();chassis.scale.setScalar(size);rig.add(chassis);box(1.7,.22,1.6,M.black,0,.13,0,chassis);
   if(type===0||type===3){cyl(.48,.6,2.1,M.orange,0,1.25,0,chassis);cyl(.16,.2,1.4,M.darkwood,.35,2.7,0,chassis);for(let n=0;n<3;n++){const collar=mesh(new THREE.TorusGeometry(.51,.06,5,12),M.metal,0,.65+n*.55,0,chassis);collar.rotation.x=Math.PI/2;}outlets.push({kind:'steam',x:x+.35*size,y:3.4*size,z,type});}
   else if(type===1){box(1,.9,.8,M.yellow,0,.85,0,chassis);cyl(.35,.35,.18,M.metal,0,1.55,0,chassis).rotation.x=Math.PI/2;}
   else{cyl(.55,.65,1.3,type===4?M.yellow:M.green,0,.9,0,chassis);box(.8,.5,.8,M.metal,0,1.7,0,chassis);if(type===4){const lens=mesh(new THREE.SphereGeometry(.95,12,7),M.metal,0,2.6,0,chassis);lens.scale.y=.18;}}
   // The visible apparatus connects to the heater/intake kept below the source.
   const platformSite=stage===5&&type>=2?offshore[index*3+type-2]:null;
   const intake=new THREE.Vector3(stage<2?((index%3)-1)*.13+type*.05:platformSite?platformSite.x:(type-2)*hx*.15+((index%5)-2)*.4,stage<2?1.03:bottom+.18,platformSite?platformSite.z:stage<2?-4+(Math.floor(index/3)%3-1)*.1:-4+hz*.1+Math.floor(index/5)*.15),elbow=new THREE.Vector3(x,stage<2?1.05:top+.55,z),aboveIntake=new THREE.Vector3(intake.x,elbow.y,intake.z);
   if(stage===5&&type>=2){
    const platform=new THREE.Group();platform.name='offshore-platform-'+type+(index?'-'+index:'');platform.userData.unitKey=unit.key;platform.position.set(intake.x,top-.45,intake.z);platform.scale.set(.7,1,.7);plants.add(platform);
    box(7,.3,6,M.darkwood,0,1.1,0,platform);for(const xx of [-2.6,2.6])for(const zz of [-2.2,2.2])cyl(.18,.25,top-bottom+.71,M.metal,xx,1.1-(top-bottom+.71)/2,zz,platform,8);
    const railing=new THREE.Group();railing.position.y=1.3;platform.add(railing);rail(0,2.9,6,true,railing);rail(0,-2.9,6,true,railing);rail(-3.3,0,5,false,railing);rail(3.3,0,5,false,railing);
    if(type===3){for(const xx of [-1.1,1.1]){cyl(.7,1.2,5,M.white,xx,3.7,0,platform,12);outlets.push({kind:'steam',x:intake.x+xx,y:top+5.85,z:intake.z,type});}}
    else{box(3,2,2.5,type===4?M.yellow:M.green,0,2.3,0,platform);cyl(.15,.2,4.8,M.orange,2,3.5,0,platform,8);box(4.5,.2,.2,M.orange,.5,5.8,0,platform);}
    const plate=sign(identifier,0,7.8,0,4.4,platform);plate.userData.unitKey=unit.key;plate.visible=false;labels.push({mesh:plate,x:intake.x,z:intake.z,key:unit.key,distance:Infinity,secondary:true});
   }
   if(stage>=2)lineBetween(new THREE.Vector3(x,.7,z),elbow,.065*size,M.orange,plants);
   rig.userData.intake=intake.toArray();rig.userData.pipeStart=elbow.toArray();
   lineBetween(elbow,aboveIntake,.065*size,M.orange,plants);lineBetween(aboveIntake,intake,.065*size,M.orange,plants);
   const conduit=mesh(new THREE.CylinderGeometry(.075*size,.075*size,1,6),glow,0,0,0,moving);conduit.name='flowing-conduit';actors.push({unitKey:unit.key,kind:'conduit',mesh:conduit,a:elbow,b:aboveIntake,type});
   const fan=mesh(new THREE.TorusGeometry(.35,.06,5,12),M.yellow,x+size*.6,1.2*size,z,moving);fan.rotation.y=Math.PI/2;actors.push({unitKey:unit.key,kind:'fan',mesh:fan,type});
   const dischargeX=x+(x<0?-1:1)*size*.65,dischargeZ=z+size*.65;
   lineBetween(new THREE.Vector3(x,.8*size,z),new THREE.Vector3(dischargeX,.8*size,dischargeZ),.11*size,M.metal,plants);outlets.push({kind:type===0||type===3?'steam':'water',x:dischargeX,y:.8*size,z:dischargeZ,type});
   if(type!==0&&type!==3){const trough=box(.8*size,.12,.7*size,M.white,dischargeX,.08,dischargeZ+.15*size,plants);const stream=box(.5*size,.035,.55*size,water,dischargeX,.16,dischargeZ+.15*size,moving);actors.push({unitKey:unit.key,kind:'stream',mesh:stream,type});}
   if(type===1){const bot=new THREE.Group();bot.name='working-bucket-bot';moving.add(bot);box(.45,.5,.4,M.yellow,0,.5,0,bot);cyl(.22,.17,.35,M.metal,0,.6,-.45,bot,10);actors.push({unitKey:unit.key,kind:'bot',mesh:bot,x,z,type,size});}
   if(type===4){const sunbeam=mesh(new THREE.CylinderGeometry(.2,.7,12,8),beamMat,intake.x,top+6,intake.z,moving);actors.push({unitKey:unit.key,kind:'sunbeam',mesh:sunbeam,type});}
   const plate=sign(identifier,x,3.7*size+.15,z,Math.max(1.55,size*1.8),plants);plate.userData.unitKey=unit.key;plate.visible=false;labels.push({mesh:plate,x,z,key:unit.key,distance:Infinity,secondary:false});
  }batchStatic(plants,new Set());
 }
 const particles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09,0),new THREE.MeshBasicMaterial({color:'#ffffff'}),96);particles.name='automation-discharge';particles.frustumCulled=false;particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(particles);
 const transform=new THREE.Object3D(),direction=new THREE.Vector3(),mid=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),white=new THREE.Color('#eef8e7'),blue=new THREE.Color('#50cfe3');let simulationTime=0,particleElapsed=0,coloursDirty=true;const frameInfo={pulse:0,machineCount:0,exposedArea:0};
 function update(dt,time,fraction,running,quality,viewer){simulationTime+=dt;pulse=Math.max(0,pulse-dt);const active=running&&fraction>0;
  labelElapsed+=dt;if(labelElapsed>=.25){labelElapsed=0;animatedUnits.clear();const vx=viewer?.x||0,vz=viewer?.z||0,maxDistance=(quality==='low'?18:28)+stage*2;
   for(const label of labels)label.distance=(label.x-vx)**2+(label.z-vz)**2;
   labels.sort((a,b)=>a.distance-b.distance);let shown=0;
   for(const label of labels){label.mesh.visible=shown<(quality==='low'?10:16)&&label.distance<maxDistance*maxDistance;if(label.mesh.visible){shown++;animatedUnits.add(label.key);}}
  }
  for(const a of actors){a.mesh.visible=active&&animatedUnits.has(a.unitKey);if(!a.mesh.visible)continue;if(a.kind==='fan')a.mesh.rotation.z+=dt*(3+stage+Math.log2(1+metrics.machines));
   if(a.kind==='conduit'){direction.subVectors(a.b,a.a);a.mesh.position.copy(a.a).lerp(a.b,.5+.12*Math.sin(simulationTime*4));a.mesh.scale.set(.65,direction.length()*.22,.65);a.mesh.quaternion.setFromUnitVectors(up,direction.normalize());}
   if(a.kind==='bot'){const t=(Math.sin(simulationTime*1.6)+1)/2;a.mesh.position.set(a.x*(1-t)+Math.sign(a.x)*bounds.hx*.8*t,0,a.z+t*2);a.mesh.rotation.y=Math.sin(simulationTime*1.6)>0?0:Math.PI;}
   if(a.kind==='stream')a.mesh.scale.z=.85+.15*Math.sin(simulationTime*10);
   if(a.kind==='sunbeam')a.mesh.scale.x=1+Math.sin(simulationTime*2)*.12;
  }
  particles.visible=active&&outlets.length>0;const n=quality==='low'?36:96;particles.count=n;
  particleElapsed+=dt;if(particles.visible&&(particleElapsed>=1/30||coloursDirty)){particleElapsed=0;for(let i=0;i<n;i++){const o=outlets[(i+Math.floor(simulationTime*3))%outlets.length],t=(simulationTime*(o.kind==='water'?1.4:.45)+i*.618)%1,size=(stage<2?.5:1+stage*.35)*(o.kind==='water'?.55:1.4);transform.position.set(o.x+Math.sin(i*12.3+t*5)*t*.35*size,o.y+(o.kind==='water'?(Math.sin(t*Math.PI)*.7-t*t*(o.y+.1)):t*4*size),o.z+t*(o.kind==='water'?.65*size:.2));transform.scale.setScalar((o.kind==='water'?1:1+t*3)*size*(1-t*.6));transform.updateMatrix();particles.setMatrixAt(i,transform.matrix);particles.setColorAt(i,o.kind==='water'?blue:white);}particles.instanceMatrix.needsUpdate=true;if(particles.instanceColor)particles.instanceColor.needsUpdate=true;coloursDirty=false;}
  frameInfo.pulse=pulse;frameInfo.machineCount=metrics.machines;frameInfo.exposedArea=stage>=4?Math.PI*bounds.hx*bounds.hz*(1-(.62+.38*fraction)**2):0;return frameInfo;
 }
 function commissioning(){pulse=2.5;}
 return {buildStage,buildMachines,setTrophies,update,commissioning,trophyPosition,metrics};
}
