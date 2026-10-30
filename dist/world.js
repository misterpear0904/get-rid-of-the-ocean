import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {defaultSettings} from './settings.js';
import {LAYOUT,walkableHeight,accessLayout,waterRange} from './terrain.js';
import {createSpectacle} from './spectacle.js';
import {AdaptiveResolution,FrameStats} from './performance.js';

export function createWorld(canvas,options={}){
 const renderer=options.rendererFactory?options.rendererFactory():new THREE.WebGLRenderer({canvas,antialias:false,stencil:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
 const scene=new THREE.Scene();scene.matrixAutoUpdate=false;scene.background=new THREE.Color('#d5e4d9');scene.fog=new THREE.Fog('#cbded5',65,180);
 let preferences=defaultSettings();
 const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.08,220);camera.rotation.order='YXZ';scene.add(camera);
 const environment=new THREE.Group();scene.add(environment);
 scene.add(new THREE.HemisphereLight('#fff9e5','#6d9284',2.6));
 const sun=new THREE.DirectionalLight('#fff0cd',3.4);sun.position.set(-18,35,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38;sun.shadow.normalBias=.045;sun.shadow.bias=-.0001;scene.add(sun);
 const materialCache=new Map(),sharedMaterials=new Set();
 const mat=(color,extra={})=>{const key=color+JSON.stringify(extra);if(materialCache.has(key))return materialCache.get(key);const material=new THREE.MeshStandardMaterial({color,roughness:.82,...extra});materialCache.set(key,material);sharedMaterials.add(material);return material;};
 const M={sand:mat('#d9d3a8'),grass:mat('#aab782'),wood:mat('#9c754b'),darkwood:mat('#665d43'),white:mat('#f3eee0'),green:mat('#315b48'),orange:mat('#e97943'),metal:mat('#7d9291',{metalness:.45,roughness:.35}),black:mat('#263b36'),leaf:mat('#668951'),lightleaf:mat('#8ba267'),stone:mat('#9fa991'),yellow:mat('#edbc58')};
 function mesh(g,m,x=0,y=0,z=0,parent=environment){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
 const box=(w,h,d,m,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,p);
 const cyl=(r1,r2,h,m,x,y,z,p,n=24)=>mesh(new THREE.CylinderGeometry(r1,r2,h,n),m,x,y,z,p);
 function lineBetween(a,b,r,m,p=scene){const d=new THREE.Vector3().subVectors(b,a);const o=cyl(r,r,d.length(),m,0,0,0,p,10);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
 function textSprite(text,{color='#f3eee0',bg=null,scale=3,size=60}={}){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);}ctx.font=`bold ${size*.5}px Arial`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sp.scale.set(scale,scale*192/1024,1);return sp;}
 const waterMat=new THREE.ShaderMaterial({transparent:true,uniforms:{time:{value:0},detail:{value:1},color:{value:new THREE.Color('#53bac1')},deep:{value:new THREE.Color('#2b8e9d')}},vertexShader:`varying vec3 vWorld; uniform float time; void main(){vec3 p=position; p.y+=sin(p.x*2.7+time*2.)*cos(p.z*2.1+time*1.4)*.012;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying vec3 vWorld;uniform float time;uniform float detail;uniform vec3 color;uniform vec3 deep;void main(){float wave=sin(vWorld.x*.6+vWorld.z*.8+time)*.5+.5;vec3 col=mix(deep,color,.65+wave*.2);if(detail>1.5){float a=sin(vWorld.x*6.+sin(vWorld.z*4.+time)*1.8+time*.5);float b=sin(vWorld.z*6.5+sin(vWorld.x*3.-time*.6)*1.5);float caustic=pow(max(0.,1.-abs(a+b)*3.),3.);col+=caustic*.12;}gl_FragColor=vec4(col,.94);}`});
 sharedMaterials.add(waterMat);
 const oceanShape=new THREE.Shape();oceanShape.moveTo(-190,-190);oceanShape.lineTo(190,-190);oceanShape.lineTo(190,190);oceanShape.lineTo(-190,190);oceanShape.closePath();const coastHole=new THREE.Path();coastHole.moveTo(-56,-55);coastHole.lineTo(-56,55);coastHole.lineTo(56,55);coastHole.lineTo(56,-55);coastHole.closePath();oceanShape.holes.push(coastHole);
 const sea=mesh(new THREE.ShapeGeometry(oceanShape),waterMat,0,-1.3,0);sea.name='coastal-sea';sea.rotation.x=-Math.PI/2;sea.receiveShadow=false;
 const islandBase=box(112,2,110,M.sand,0,-7,0);islandBase.name='island-base';islandBase.receiveShadow=true;
 const yard=new THREE.Group();scene.add(yard);let ground;
 function shorePoint(a,hx,hz){const r=1+.045*Math.sin(a*3)+.025*Math.cos(a*7);return new THREE.Vector2(Math.cos(a)*hx*r,Math.sin(a)*hz*r);}
 function shoreShape(hx,hz){const shape=new THREE.Shape();for(let n=0;n<65;n++){const p=shorePoint(n/64*Math.PI*2,hx,hz);if(n===0)shape.moveTo(p.x,p.y);else shape.lineTo(p.x,p.y);}shape.closePath();return shape;}
 function makeGround(hx,hz,hole,organic=false){if(ground){ground.geometry.dispose();ground.parent.remove(ground);}const s=new THREE.Shape();s.moveTo(-56,-55);s.lineTo(56,-55);s.lineTo(56,55);s.lineTo(-56,55);s.closePath();if(hole){const p=new THREE.Path();if(organic){for(let n=64;n>=0;n--){const v=shorePoint(n/64*Math.PI*2,hx,hz);if(n===64)p.moveTo(v.x,v.y+4);else p.lineTo(v.x,v.y+4);}}else{p.moveTo(-hx,4-hz);p.lineTo(-hx,4+hz);p.lineTo(hx,4+hz);p.lineTo(hx,4-hz);}p.closePath();s.holes.push(p);}ground=mesh(new THREE.ShapeGeometry(s),M.grass,0,-.02,0);ground.rotation.x=-Math.PI/2;}
 makeGround(0,0,false);
 // The coast is deliberately built from warm, chunky, low-poly shapes.
 let seed=78;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
 function rock(x,z,r,parent=environment){const o=mesh(new THREE.DodecahedronGeometry(r,0),M.stone,x,r*.35,z,parent);o.scale.set(1,.65,.8);o.rotation.set(rand(),rand()*6,rand());return o;}
 function palm(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);environment.add(g);const trunk=cyl(.12*s,.2*s,3.6*s,M.wood,.25*s,1.8*s,0,g,8);trunk.rotation.z=-.13;for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const leaf=mesh(new THREE.SphereGeometry(1,7,4),i%2?M.leaf:M.lightleaf,Math.cos(a)*.85*s,3.65*s,Math.sin(a)*.85*s,g);leaf.scale.set(1.8*s,.09*s,.42*s);leaf.rotation.z=Math.cos(a)*-.25;leaf.rotation.y=-a;}cyl(.23*s,.23*s,.3*s,M.darkwood,.45*s,3.65*s,0,g,8);return g;}
 for(let i=0;i<38;i++){const a=rand()*Math.PI*2;const r=49+rand()*5;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(i%3===0)palm(x,z,.8+rand()*.7);else rock(x,z,.45+rand()*1.2);}
 for(let i=0;i<12;i++){const x=(rand()-.5)*90,z=-47-rand()*6;const hill=mesh(new THREE.ConeGeometry(3+rand()*6,5+rand()*7,5),i%2?M.leaf:M.lightleaf,x,1,z);hill.rotation.y=rand()*6;}
 // Small details make the yard feel occupied before it becomes a factory.
 const nearProps=[];for(let i=0;i<9;i++){const g=box(.65,.09,.32,M.sand,(i-4)*.85,.02,5.1+Math.sin(i)*.15);g.rotation.y=rand()*.25;nearProps.push(g);}
 function crate(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(.8,.65,.7,M.wood,0,.325,0,g);for(const yy of [.1,.55])box(.85,.07,.74,M.darkwood,0,yy,0,g);return g;}
 nearProps.push(crate(-13,8),crate(-13.6,8.4));const nearPalms=[palm(16,5,1.15),palm(-16,-10,1.2)];
 const stores={};
 // Flat lettering stays parallel to its backing instead of turning into it with the camera.
 function shopLabel(text,scale,size,color,x,y,z,parent,name){
  const sprite=textSprite(text,{scale,size,color}),material=new THREE.MeshBasicMaterial({map:sprite.material.map,transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:.01});
  const label=mesh(new THREE.PlaneGeometry(scale,scale*192/1024),material,x,y,z,parent);label.name=name;label.userData.ownsTexture=true;label.castShadow=false;sprite.material.dispose();return label;
 }
 function store(id,title,subtitle,color){const group=new THREE.Group();group.name='shop-'+id;scene.add(group);box(4.5,.17,3.8,M.wood,0,.09,0,group);for(const x of [-2,2])for(const z of [-1.5,1.5])box(.13,2.8,.13,M.darkwood,x,1.4,z,group);box(4.3,1.25,.22,M.green,0,.7,-1.6,group);box(4.5,.8,.7,M.white,0,.5,1.1,group);box(4.7,.12,.95,M.wood,0,.95,1.1,group);
 const roof=box(5,.16,4.2,mat(color),0,2.85,0,group);roof.rotation.x=.04;for(let i=0;i<8;i++)box(.25,.17,4.2,M.white,-2.17+i*.62,2.88,0,group);
 box(4.7,.55,.15,mat(color),0,2.51,2.05,group);shopLabel(title,4.2,57,'#f3eee0',0,2.55,2.15,group,'shop-title-'+id);shopLabel(subtitle,3.6,37,'#173a30',0,.63,1.48,group,'shop-subtitle-'+id);
 const light=mesh(new THREE.SphereGeometry(.13,10,8),M.yellow,1.7,2.25,1.7,group);const npc=new THREE.Group();npc.position.set(.4,.17,.15);group.add(npc);box(.56,.65,.33,M.green,0,.78,0,npc);mesh(new THREE.SphereGeometry(.23,12,10),mat('#d6a879'),0,1.33,0,npc);cyl(.28,.28,.13,M.orange,0,1.52,0,npc,14);
 stores[id]={group,front:new THREE.Vector3(),title,light};return group;}
 const toolStore=store('tools','THE TOOL SHACK','MORE POWER. LESS WATER.','#e97943');
 const skillStore=store('skills','THE SKILL LAB','WORK SMARTER. THEN HARDER.','#527d68');
 const autoStore=store('automation','AUTOMATION CO.','LET SOMETHING ELSE DO IT.','#d1ac58');
 for(let i=0;i<3;i++)cyl(.13,.17,.45,M.orange,-1.1+i*.5,1.25,1,toolStore,12);
 for(let i=0;i<3;i++){const book=box(.35,.42,.24,i%2?M.orange:M.yellow,-1+i*.4,1.18,1,skillStore);book.rotation.z=(i-1)*.1;}
 cyl(.25,.3,.5,M.metal,-1,1.2,1,autoStore);box(.4,.2,.35,M.green,-.3,1.1,1,autoStore);
 // First-person body anchor stays on the ground; hands and tools follow the camera.
 const player=new THREE.Group();scene.add(player);
 const held=new THREE.Group();held.name='held-tool';held.position.set(.34,-.34,-.63);held.scale.setScalar(.8);camera.add(held);
 const hand=box(.16,.19,.26,mat('#d9ac7b'),0,-.23,.1,held);hand.castShadow=false;
 let heldTool=0;function setTool(i){if(heldTool===i&&held.children.length>1)return;heldTool=i;disposeChildren(held);box(.16,.19,.26,mat('#d9ac7b'),0,-.23,.1,held).castShadow=false;if(i<3){box(.16,.32,.13,i===0?M.orange:M.metal,0,0,0,held);cyl(.06,.06,.13,M.metal,0,.2,0,held,12);if(i===2)lineBetween(new THREE.Vector3(0,.22,0),new THREE.Vector3(0,.3,-.45),.055,M.metal,held);}else if(i===3){lineBetween(new THREE.Vector3(),new THREE.Vector3(0,-.1,-.8),.04,M.wood,held);const bucket=cyl(.3,.23,.35,M.metal,0,-.1,-.9,held);bucket.rotation.x=.7;}else{const tube=cyl(.15,.18,.8,i>5?M.yellow:M.green,0,.08,-.35,held);tube.rotation.x=Math.PI/2;cyl(.22,.22,.15,M.metal,0,.08,-.77,held).rotation.x=Math.PI/2;box(.12,.35,.15,M.black,0,-.13,-.1,held);}}
 setTool(0);
 // Camera-mounted effects survive tool swaps without rebuilding flame geometry.
 const toolEffects=new THREE.Group();camera.add(toolEffects);toolEffects.position.copy(held.position);toolEffects.scale.copy(held.scale);
 const lighterFlame=new THREE.Group();lighterFlame.name='held-lighter-flame';lighterFlame.visible=false;toolEffects.add(lighterFlame);
 mesh(new THREE.ConeGeometry(.065,.25,7),new THREE.MeshBasicMaterial({color:'#ff8c28',transparent:true,opacity:.9,depthWrite:false}),0,.125,0,lighterFlame).castShadow=false;
 mesh(new THREE.ConeGeometry(.032,.17,6),new THREE.MeshBasicMaterial({color:'#fff1a0'}),0,.085,.012,lighterFlame).castShadow=false;
 mesh(new THREE.ConeGeometry(.035,.075,6),new THREE.MeshBasicMaterial({color:'#6fbfff'}),0,.035,.02,lighterFlame).castShadow=false;
 const targetPoint=new THREE.Vector3(0,0,-4);let stage=0,bounds={hx:1.6,hz:1.3},bottom=1.25,top=2.23;
 const container=new THREE.Group();scene.add(container);let surface,waterSide,relic,waterOutline,fullLine,levelMarker,gaugeFill;const flameGroups=[];let levelGauge,gaugeBottom,gaugeTop;let heat=0,manualBlend=0,workKick=0,wasWorking=false;const machinery=new THREE.Group();scene.add(machinery);const rotors=[];
 function disposeChildren(group){const disposed=new Set();while(group.children.length){const child=group.children[0];child.traverse(o=>{o.geometry?.dispose();if(o.material&&!sharedMaterials.has(o.material)&&!disposed.has(o.material)){disposed.add(o.material);if(o.isSprite||o.userData.ownsTexture)o.material.map?.dispose();o.material.dispose();}});group.remove(child);}}
 function freezeStatic(group,excluded=new Set()){
  group.traverse(o=>{if(!excluded.has(o)){o.updateMatrix();o.matrixAutoUpdate=false;}});
 }
 function makeWater(g,baseY,topY){surface=mesh(g,waterMat,0,topY,-4,container);surface.name='active-water';surface.rotation.x=-Math.PI/2;surface.castShadow=false;bottom=baseY;top=topY;}
 function raisedDeck(i,hx,hz,rim){
  const {deck}=accessLayout(i),ox=hx+deck,oz=hz+deck,s=new THREE.Shape();s.moveTo(-ox,-oz);s.lineTo(ox,-oz);s.lineTo(ox,oz);s.lineTo(-ox,oz);s.closePath();
  const hole=new THREE.Path();if(i>=4){for(let n=64;n>=0;n--){const v=shorePoint(n/64*Math.PI*2,hx+.2,hz+.2);if(n===64)hole.moveTo(v.x,v.y);else hole.lineTo(v.x,v.y);}}else{hole.moveTo(-hx-.2,-hz-.2);hole.lineTo(-hx-.2,hz+.2);hole.lineTo(hx+.2,hz+.2);hole.lineTo(hx+.2,-hz-.2);}hole.closePath();s.holes.push(hole);
  const deckMesh=mesh(new THREE.ShapeGeometry(s),M.white,0,rim,-4,container);deckMesh.rotation.x=-Math.PI/2;deckMesh.name='raised-basin-deck';
  for(const x of [-ox,ox])box(.2,rim,oz*2,M.stone,x,rim/2,-4,container);
  for(const z of [-4-oz,-4+oz])box(ox*2,rim,.2,mat('#b2b99b',{transparent:true,opacity:z>0&&i===3?.23:1,depthWrite:!(z>0&&i===3)}),0,rim/2,z,container);
 }
 function buildStage(i){stage=i;heat=0;manualBlend=0;workKick=0;wasWorking=false;disposeChildren(container);waterSide=null;flameGroups.length=0;let hx=1.6,hz=1.3;bottom=1.25;top=2.23;
 if(i<2){makeGround(0,0,false);box(3.6,.17,2.7,M.wood,0,.86,-4,container);for(const x of [-1.4,1.4])for(const z of [-5,-3])box(.13,.82,.13,M.darkwood,x,.41,z,container);
 const r=i===0?.64:.93;const y=1.2;const h=i===0?1.1:1.25;const cm=i===0?M.white:M.metal;
 cyl(r,r,.1,cm,0,y,-4,container,48);
 const wall=mesh(new THREE.CylinderGeometry(r,r,h,32,1,true,Math.PI*.4,Math.PI*1.2),cm.clone(),0,y+h/2,-4,container);wall.material.side=THREE.DoubleSide;
 const window=mesh(new THREE.CylinderGeometry(r,r,h,20,1,true,-Math.PI*.4,Math.PI*.8),mat('#d7f4ed',{transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide}),0,y+h/2,-4,container);window.castShadow=false;
 waterSide=mesh(new THREE.CylinderGeometry(r-.035,r-.035,1,32,1,true),mat('#39acb9',{transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}),0,y+h/2,-4,container);waterSide.name='water-level-window';waterSide.castShadow=false;
 const rim=mesh(new THREE.TorusGeometry(r,.055,8,48),cm,0,y+h,-4,container);rim.rotation.x=Math.PI/2;
 if(i===0){const handle=mesh(new THREE.TorusGeometry(.42,.105,8,24,Math.PI*1.6),M.white,r+.19,y+h*.58,-4,container);handle.rotation.z=-Math.PI*.8;}else for(const x of [-1.18,1.18])box(.48,.15,.24,M.black,x,y+.8,-4,container);
 makeWater(new THREE.CircleGeometry(r-.035,64),y+.07,y+h-.07);bounds={hx,hz};
 const plaque=textSprite(i===0?'THE FIRST 250 mL':'5 L OF AMBITION',{scale:2.2,size:48,color:'#f3eee0',bg:'#315b48'});
 box(2.3,.46,.06,M.darkwood,0,.54,-2.67,container);
 const label=mesh(new THREE.PlaneGeometry(2.2,.4125),new THREE.MeshBasicMaterial({map:plaque.material.map}),0,.54,-2.632,container);label.name='table-front-placard';label.userData.ownsTexture=true;label.castShadow=false;plaque.material.dispose();
 }else{hx=LAYOUT[i].hx;hz=LAYOUT[i].hz;bounds={hx,hz};makeGround(0,0,false);const floorY=LAYOUT[i].floor;const wallMat=i===2?M.white:i===3?mat('#c8e0d7'):M.sand;const wallTop=LAYOUT[i].rim;const wallH=wallTop-floorY;if(i>=3)raisedDeck(i,hx,hz,wallTop);
 if(i<4){
 box(hx*2,.18,hz*2,mat('#a9c7bd'),0,floorY-.09,-4,container).name='basin-floor';
 box(.2,wallH,hz*2+.4,wallMat,-hx-.1,floorY+wallH/2,-4,container);box(.2,wallH,hz*2+.4,wallMat,hx+.1,floorY+wallH/2,-4,container);box(hx*2,wallH,.2,wallMat,0,floorY+wallH/2,-4-hz-.1,container);
 box(hx*2,wallH,.12,mat('#d7f4ed',{transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide}),0,floorY+wallH/2,-4+hz+.1,container).name='basin-viewing-window';
 const sides=new THREE.BoxGeometry(hx*2-.05,1,hz*2-.05),indices=[];for(let face=0;face<6;face++)if(face!==2&&face!==3)for(let k=0;k<6;k++)indices.push(sides.index.getX(face*6+k));sides.setIndex(indices);
 waterSide=mesh(sides,mat('#39acb9',{transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}),0,0,-4,container);waterSide.name='water-level-window';waterSide.castShadow=false;
 for(const x of [-hx-.2,hx+.2])box(.35,.15,hz*2+.65,M.white,x,wallTop+.05,-4,container);for(const z of [-4-hz-.2,-4+hz+.2])box(hx*2+.8,.15,.35,M.white,0,wallTop+.05,z,container);
 }else{
 const floor=mesh(new THREE.ShapeGeometry(shoreShape(hx*.62,hz*.62)),mat('#d7c58f'),0,floorY,-4,container);floor.rotation.x=-Math.PI/2;floor.name='basin-floor';
 const vertices=[];for(let n=0;n<64;n++){const a=shorePoint(n/64*Math.PI*2,hx+.2,hz+.2),b=shorePoint((n+1)/64*Math.PI*2,hx+.2,hz+.2);vertices.push(a.x,wallTop-.025,-4-a.y,b.x,wallTop-.025,-4-b.y,a.x*.62,floorY,-4-a.y*.62,b.x,wallTop-.025,-4-b.y,b.x*.62,floorY,-4-b.y*.62,a.x*.62,floorY,-4-a.y*.62);}
 const bank=new THREE.BufferGeometry();bank.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));bank.computeVertexNormals();mesh(bank,mat(i===5?'#d8c48e':'#bcbb8c',{side:THREE.DoubleSide}),0,0,0,container);
 }
 if(i===2){for(const x of [-1.7,1.7])for(const z of [-4.9,-3.1])cyl(.12,.17,floorY,M.metal,x,floorY/2,z,container,10);lineBetween(new THREE.Vector3(-1.7,wallTop,-5.1),new THREE.Vector3(-1.7,wallTop+.5,-5.1),.07,M.metal,container);lineBetween(new THREE.Vector3(-1.7,wallTop+.5,-5.1),new THREE.Vector3(-1.7,wallTop+.5,-4.7),.07,M.metal,container);}
 if(i===3){for(const z of [-5,-4])lineBetween(new THREE.Vector3(hx-.5,floorY+.6,z),new THREE.Vector3(hx-.5,wallTop+.6,z),.06,M.metal,container);for(let y=floorY+.4;y<wallTop+.5;y+=.4)lineBetween(new THREE.Vector3(hx-.5,y,-5),new THREE.Vector3(hx-.5,y,-4),.045,M.metal,container);for(let n=0;n<5;n++)box(.3,.015,hz*2-.5,mat('#4c8e8f'),-5+n*2.5,floorY+.015,-4,container);}
 if(i>=4){for(let n=0;n<16;n++){const a=n/16*Math.PI*2;rock(Math.cos(a)*(hx+1),-4+Math.sin(a)*(hz+1),.5+rand()*.6,container).position.y+=wallTop;}if(i===5){const boat=new THREE.Group();boat.position.set(-9,floorY+.3,-9);container.add(boat);const hull=box(4,.65,1.5,M.white,0,0,0,boat);hull.rotation.z=.12;box(1.3,.8,1.2,M.orange,.5,.7,0,boat);lineBetween(new THREE.Vector3(0,.5,0),new THREE.Vector3(0,4,0),.05,M.wood,boat);}}
 makeWater(i>=4?new THREE.ShapeGeometry(shoreShape(hx,hz)):new THREE.PlaneGeometry(hx*2-.05,hz*2-.05,Math.min(64,hx*4),Math.min(48,hz*4)),waterRange(i).bottom,waterRange(i).top);
 }
 relic=new THREE.Group();relic.position.set(0,bottom+.1,-4);container.add(relic);if(i===2){mesh(new THREE.SphereGeometry(.25,12,8),M.yellow,0,.12,0,relic);mesh(new THREE.SphereGeometry(.15,12,8),M.yellow,.15,.35,0,relic);box(.13,.05,.08,M.orange,.31,.34,0,relic);}else if(i===5){const key=mesh(new THREE.TorusGeometry(.32,.07,8,20),M.yellow,0,.2,0,relic);key.rotation.x=Math.PI/2;box(.1,.1,.75,M.yellow,0,.2,.6,relic);box(.25,.1,.1,M.yellow,.1,.2,.8,relic);}else{const ring=mesh(new THREE.TorusGeometry(i===0?.14:.35,.045,8,20),M.yellow,0,.1,0,relic);ring.rotation.x=-Math.PI/2;box(.07,.07,i===0?.45:.8,M.metal,0,.1,.3,relic);}relic.visible=false;
 nearProps.forEach(p=>p.visible=i<3);nearPalms[0].position.x=Math.max(16,hx+7);nearPalms[1].position.x=-Math.max(16,hx+7);
 // High-contrast full line stays fixed; the white waterline and orange float descend.
 const outlineGeometry=i<2?new THREE.TorusGeometry(i===0?.61:.9,.018,4,48):i<4?new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-hx,0,-hz),new THREE.Vector3(hx,0,-hz),new THREE.Vector3(hx,0,hz),new THREE.Vector3(-hx,0,hz),new THREE.Vector3(-hx,0,-hz)]):new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,n)=>{const v=shorePoint(n/64*Math.PI*2,hx,hz);return new THREE.Vector3(v.x,0,-v.y);}));
 if(i<2){waterOutline=mesh(outlineGeometry,new THREE.MeshBasicMaterial({color:'#effffa'}),0,top+.01,-4,container);waterOutline.rotation.x=Math.PI/2;fullLine=mesh(outlineGeometry.clone(),new THREE.MeshBasicMaterial({color:'#f47543',transparent:true,opacity:.65}),0,top+.01,-4,container);fullLine.rotation.x=Math.PI/2;}
 else{waterOutline=new THREE.Line(outlineGeometry,new THREE.LineBasicMaterial({color:'#ecfffb'}));waterOutline.position.set(0,top+.01,-4);container.add(waterOutline);fullLine=new THREE.Line(outlineGeometry.clone(),new THREE.LineDashedMaterial({color:'#f47543',dashSize:.22,gapSize:.15,transparent:true,opacity:.7}));fullLine.position.set(0,top+.02,-4);fullLine.computeLineDistances();container.add(fullLine);}
 fullLine.name='original-full-line';
 const gx=i<2?1.2:i===2?hx+.6:accessLayout(i).entryX+1,gz=i<2?-3.5:-4+hz+(i>=3?.05:0);
 gaugeBottom=i>=3?LAYOUT[i].rim+1:bottom;gaugeTop=i>=3?gaugeBottom+1.6:top;
 levelGauge=new THREE.Group();container.add(levelGauge);levelGauge.position.set(gx,0,gz);
 levelGauge.name='water-level-gauge';levelGauge.userData.range={bottom:gaugeBottom,top:gaugeTop};
 if(i>=3)box(.07,1,.07,M.darkwood,0,LAYOUT[i].rim+.5,0,levelGauge);
 box(.45,gaugeTop-gaugeBottom+.2,.08,M.white,0,(gaugeTop+gaugeBottom)/2,-.04,levelGauge);
 box(.07,gaugeTop-gaugeBottom+.12,.07,M.darkwood,0,(gaugeTop+gaugeBottom)/2,0,levelGauge);
 gaugeFill=box(.12,1,.04,mat('#39acb9'),.12,0,.06,levelGauge);gaugeFill.name='gauge-fill';
 for(let k=0;k<=4;k++)box(.24,.025,.06,k===4?M.orange:M.green,0,gaugeBottom+(gaugeTop-gaugeBottom)*k/4,.02,levelGauge);
 levelMarker=mesh(new THREE.ConeGeometry(.13,.27,4),M.orange,-.24,gaugeTop,0,levelGauge);levelMarker.rotation.z=-Math.PI/2;levelMarker.name='water-level-float';
 const fullLabel=textSprite('FULL',{scale:1.1,size:72,color:'#b84620',bg:'#f3eee0'});fullLabel.name='gauge-full-label';fullLabel.position.set(0,gaugeTop+.25,0);levelGauge.add(fullLabel);if(i>=3){const emptyLabel=textSprite('EMPTY',{scale:1.1,size:65,color:'#315b48',bg:'#f3eee0'});emptyLabel.position.set(0,gaugeBottom-.18,0);levelGauge.add(emptyLabel);}
 // A burner lives directly beneath the small source, even before automation.
 if(i<2){cyl(i===0?.5:.76,i===0?.5:.76,.13,M.black,0,1.015,-4,container);addFlames(container,0,1.12,-4,i===0?.35:.6);}
 freezeStatic(container,new Set([surface,waterSide,waterOutline,levelMarker,gaugeFill,relic,...flameGroups]));freezeStatic(ground);
 ground.name='yard-ground';const sx=hx+7.2;stores.tools.group.position.set(-sx,0,-5);stores.skills.group.position.set(sx,0,-5);stores.automation.group.position.set(-sx,0,5);
 for(const s of Object.values(stores)){
  s.group.rotation.y=Math.atan2(-s.group.position.x,-4-s.group.position.z);s.sin=Math.sin(s.group.rotation.y);s.cos=Math.cos(s.group.rotation.y);
  s.front.set(s.group.position.x+s.sin*2.8,0,s.group.position.z+s.cos*2.8);s.group.updateMatrix();
 }
 player.position.set(i>=3?accessLayout(i).entryX:0,i>=3?LAYOUT[i].rim:0,-4+hz+(i<2?1.8:i>=3?1.7:1.4));yaw=0;pitch=i<2?-.32:i===2?-.5:-.35;renderer.shadowMap.needsUpdate=true;
 for(const palm of nearPalms)palm.updateMatrix();spectacle.buildStage(i,{bottom,top});setMachines(lastMachines);
 }
 let lastMachines=[0,0,0,0,0];
 const fireMaterial=new THREE.MeshBasicMaterial({color:'#ff9a35'});sharedMaterials.add(fireMaterial);
 function addFlames(parent,x,y,z,r){const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);for(let n=0;n<6;n++){const a=n/6*Math.PI*2;mesh(new THREE.ConeGeometry(.075,.25,5),fireMaterial,Math.cos(a)*r,0,Math.sin(a)*r,group).castShadow=false;}flameGroups.push(group);return group;}
 const machineNames=['GAS STOVE','BUCKET BOT','PUMP STATION','STEAM ENGINE','ORBITAL LENS'];
 function machineAnchor(type,slot=0){return new THREE.Vector3(stage<2?(type===0?0:(type-2)*.23):THREE.MathUtils.clamp((type-2)*bounds.hx*.25+slot*.6,-bounds.hx*.65,bounds.hx*.65),stage<2?0:bottom+.03,stage<2?-4:-4+bounds.hz*.35);}
 function setMachines(counts){lastMachines=[...counts];disposeChildren(machinery);rotors.length=0;while(flameGroups.length>(stage<2?1:0))flameGroups.pop();
  for(let type=0;type<counts.length;type++){if(!counts[type])continue;const count=Math.min(counts[type],type===0?1:3);for(let j=0;j<count;j++){
   const g=new THREE.Group();g.name=type===0?'boiler':'installed-machine';g.userData.machineType=type;g.position.copy(machineAnchor(type,j));machinery.add(g);
   if(type===0){
    if(stage<2){box(1.5,.16,1.25,M.white,0,.96,0,g);}
    else{box(1.2,.23,1.2,M.black,0,.13,0,g);cyl(.42,.48,1.1,M.orange,0,.85,0,g);addFlames(g,0,.32,0,.32);cyl(.47,.47,.1,M.metal,0,1.42,0,g);lineBetween(new THREE.Vector3(.45,1.1,0),new THREE.Vector3(1.3,1.1,0),.075,M.orange,g);lineBetween(new THREE.Vector3(1.3,1.1,0),new THREE.Vector3(1.3,.2,-.7),.075,M.orange,g);}
   }else{
    if(stage<2){g.position.y=.94;g.scale.setScalar(type===4?.1:.2);}
    if(type===1){box(.55,.7,.55,M.orange,0,.55,0,g);for(const xx of [-.32,.32])cyl(.16,.16,.16,M.black,xx,.18,0,g,10).rotation.z=Math.PI/2;const wheel=cyl(.3,.3,.12,M.metal,0,1.1,0,g);wheel.rotation.x=Math.PI/2;rotors.push(wheel);}
    else{box(.9,.3,.9,M.darkwood,0,.15,0,g);cyl(.38,.45,type===4?2.2:1.1,type===4?M.yellow:M.green,0,type===4?1.25:.85,0,g);const rot=mesh(new THREE.TorusGeometry(.27,.055,5,12),M.orange,.4,1,0,g);rot.rotation.y=Math.PI/2;rotors.push(rot);lineBetween(new THREE.Vector3(-.2,.7,0),new THREE.Vector3(-.6,.2,0),.09,M.metal,g);}
   }
   if(j===0){const label=textSprite(machineNames[type]+' · HEAT FEED',{scale:stage<2?1.9:2.6,size:42,color:'#e97943'});label.position.set(g.position.x,stage<2?.69:top+.45+(type%2)*.35,stage<2?-3.12:-4+bounds.hz-.15);machinery.add(label);}
  }}batchStatic(machinery,new Set([...rotors,...flameGroups,...machinery.children.filter(o=>o.name==='boiler')]));freezeStatic(machinery,new Set([...rotors,...flameGroups]));spectacle.buildMachines(counts);renderer.shadowMap.needsUpdate=true;
 }
 const placementPreview=new THREE.Group();placementPreview.name='automation-placement-preview';placementPreview.visible=false;scene.add(placementPreview);
 const previewMaterial=new THREE.MeshBasicMaterial({color:'#60e5ae',wireframe:true,transparent:true,opacity:.85,depthTest:false,depthWrite:false});
 const previewBody=mesh(new THREE.BoxGeometry(1,1,1),previewMaterial,0,0,0,placementPreview);previewBody.castShadow=false;previewBody.renderOrder=100;
 const previewLabel=textSprite('INSTALL UNDER THE WATER',{scale:2.5,size:48,color:'#137a50'});previewLabel.material.depthTest=false;previewLabel.renderOrder=101;placementPreview.add(previewLabel);
 let previewType=null;
 function previewPlacement(type){previewType=type;placementPreview.visible=type!==null;if(type===null)return;const point=machineAnchor(type,Math.min(lastMachines[type],2));if(stage<2){previewBody.position.set(point.x,.97,point.z);previewBody.scale.set(1.55,.3,1.3);}else{previewBody.position.copy(point);previewBody.position.y+=.7;previewBody.scale.set(1.25,1.4,1.25);}previewLabel.position.set(point.x,top+.7,point.z);}
 const effects=new THREE.Group();scene.add(effects);const particleLimit=36;const particles=Array.from({length:particleLimit},()=>({life:0,position:new THREE.Vector3(),velocity:new THREE.Vector3(),size:1}));
 const steam=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07,0),new THREE.MeshBasicMaterial({color:'#dcf4ed'}),particleLimit);steam.frustumCulled=false;steam.visible=false;steam.castShadow=false;steam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);effects.add(steam);const particleTransform=new THREE.Object3D();let emission=0,particleCursor=0,liveParticles=false,effectTime=0;
 const beamMat=new THREE.MeshBasicMaterial({color:'#f0c96b',transparent:true,opacity:.5});const beam=mesh(new THREE.CylinderGeometry(.05,.13,1,10),beamMat,0,0,0,effects);beam.visible=false;
 const impactMaterial=new THREE.MeshBasicMaterial({color:'#fff2ae',transparent:true,opacity:.7,depthWrite:false});
 const manualImpact=mesh(new THREE.TorusGeometry(.5,.025,4,32),impactMaterial,0,0,-4,effects);manualImpact.name='manual-water-impact';manualImpact.rotation.x=Math.PI/2;manualImpact.visible=false;manualImpact.castShadow=false;
 const marker=new THREE.Group();scene.add(marker);const arrow=mesh(new THREE.ConeGeometry(.3,.6,4),M.orange,0,0,0,marker);arrow.rotation.z=Math.PI;marker.visible=false;
 let destination=null,yaw=0,pitch=-.32,dragging=false,lastPointer={x:0,y:0},inputEnabled=true;
 let lastLook=-Infinity;function mouseLook(dx,dy){if(!inputEnabled)return;lastLook=performance.now();const factor=.0025*preferences.sensitivity;yaw-=dx*factor;pitch=THREE.MathUtils.clamp(pitch-dy*factor*(preferences.invertY?-1:1),-1.45,1.35);}
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{if(!inputEnabled)return;if(e.button===2){dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}else if(e.button===0)captureLook();});
 canvas.addEventListener('pointermove',e=>{if(document.pointerLockElement===canvas)mouseLook(e.movementX,e.movementY);else if(dragging){mouseLook(e.clientX-lastPointer.x,e.clientY-lastPointer.y);lastPointer.x=e.clientX;lastPointer.y=e.clientY;}});
 canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
 function captureLook(){if(!inputEnabled||document.pointerLockElement===canvas)return;try{const result=canvas.requestPointerLock?.();result?.catch?.(()=>{});}catch{}}
 function releaseLook(){inputEnabled=false;dragging=false;if(document.pointerLockElement===canvas)document.exitPointerLock?.();}
 function enableLook(){inputEnabled=true;}
 const resolution=new AdaptiveResolution(),frameStats=new FrameStats();let renderRatio=1,graphicsKey='';
 function applySettings(next){preferences=next;if(camera.fov!==next.fov){camera.fov=next.fov;camera.updateProjectionMatrix();}const key=next.quality+':'+(next.adaptiveResolution!==false);if(key===graphicsKey)return;graphicsKey=key;const high=next.quality==='high';const base=Math.min(devicePixelRatio,high?1.5:next.quality==='low'?.75:1);resolution.configure(base,next.quality==='low'?.5:high?.7:.6,next.adaptiveResolution!==false,performance.now());renderRatio=base;renderer.setPixelRatio(renderRatio);renderer.shadowMap.enabled=high;renderer.shadowMap.needsUpdate=high;waterMat.uniforms.detail.value=high?2:next.quality==='low'?0:1;resize();}
 function sampleFrame(ms,now,active=true,targetMs=1000/60){if(active)frameStats.record(ms);const next=resolution.sample(ms,now,active,targetMs);if(next!==null){renderRatio=next;renderer.setPixelRatio(renderRatio);}}
 const performanceInfo={fps:0,p95:0,resolution:100,drawCalls:0};
 function getPerformance(now){const stats=frameStats.read(now);performanceInfo.fps=stats.fps;performanceInfo.p95=stats.p95;performanceInfo.resolution=Math.round(renderRatio/resolution.base*100);performanceInfo.drawCalls=renderer.info?.render?.calls||0;return performanceInfo;}
 const storeList=Object.values(stores),storeEntries=Object.entries(stores),waterDestination=new THREE.Vector3();const frameState={nearWater:true,store:null,destinationDistance:0,heat:0,levelDrop:0,exposedArea:0,machineCount:0,commissioning:0};let currentFraction=1;
 const keys=new Set();const vec=new THREE.Vector3(),candidate=new THREE.Vector3(),slideX=new THREE.Vector3(),slideZ=new THREE.Vector3(),beamStart=new THREE.Vector3(),beamEnd=new THREE.Vector3(),beamDirection=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);let walking=false;
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
 function nearWater(){const radius=Math.max(bounds.hx,bounds.hz)+4.4;return player.position.distanceToSquared(targetPoint)<radius*radius;}
 function closestStore(){let best=null,dist=3.2;for(const [id,s]of storeEntries){const d=player.position.distanceTo(s.front);if(d<dist){dist=d;best=id;}}return best;}
 function setDestination(id){destination=id;marker.visible=!!id;}
 function destPosition(){if(!destination)return null;if(destination==='trophies')return spectacle.trophyPosition;if(destination==='water')return waterDestination.set(0,0,-4+bounds.hz+2);return stores[destination]?.front;}
 function tryStep(x,z){const height=walkableHeight(stage,x,z,currentFraction,player.position.y);if(height===null)return false;for(const s of storeList){const dx=x-s.group.position.x,dz=z-s.group.position.z;if(Math.abs(dx*s.cos-dz*s.sin)<2.5&&Math.abs(dx*s.sin+dz*s.cos)<1.9&&height>-.5)return false;}player.position.set(x,height,z);return true;}
 function update(dt,time,fraction,working,autoOn,canMove=true){currentFraction=fraction;
 if(previewType!==null){previewPlacement(previewType);previewMaterial.color.set(nearWater()?'#60e5ae':'#f2a55f');previewMaterial.opacity=.65+Math.sin(time*5)*.15;}
 waterMat.uniforms.time.value=time;surface.position.y=bottom+(top-bottom)*fraction;surface.scale.setScalar(stage>=4?.62+.38*fraction:1);surface.visible=fraction>.00001;waterOutline.position.y=surface.position.y+.015;waterOutline.scale.setScalar(stage>=4?.62+.38*fraction:1);waterOutline.visible=surface.visible;levelMarker.position.y=gaugeBottom+(gaugeTop-gaugeBottom)*fraction;gaugeFill.scale.y=Math.max(.001,(gaugeTop-gaugeBottom)*fraction);gaugeFill.position.y=gaugeBottom+gaugeFill.scale.y/2;gaugeFill.visible=fraction>.00001;
 if(waterSide){waterSide.scale.y=Math.max(.001,surface.position.y-bottom);waterSide.position.y=bottom+waterSide.scale.y/2;waterSide.visible=surface.visible;}
 heat=THREE.MathUtils.lerp(heat,(working&&heldTool<3||autoOn&&lastMachines[0]>0)&&fraction>0?1:0,Math.min(1,dt*3));
 for(const flames of flameGroups){flames.visible=heat>.02;flames.scale.y=heat*(.9+Math.sin(time*19)*.13);}
 relic.visible=fraction<.18;relic.rotation.y=time*.4;
 walking=false;
 if(canMove){vec.set(0,0,0);if(keys.has(preferences.bindings.forward))vec.z-=1;if(keys.has(preferences.bindings.backward))vec.z+=1;if(keys.has(preferences.bindings.left))vec.x-=1;if(keys.has(preferences.bindings.right))vec.x+=1;
 if(vec.lengthSq()){vec.normalize().applyAxisAngle(up,yaw);const speed=(keys.has(preferences.bindings.sprint)?8:5.2)*dt;candidate.copy(player.position).addScaledVector(vec,speed);walking=tryStep(candidate.x,candidate.z);if(!walking){walking=tryStep(candidate.x,player.position.z);walking=tryStep(player.position.x,candidate.z)||walking;}}}
 const view=spectacle.update(dt,time,fraction,autoOn,preferences.quality,player.position);
 const manualActive=working&&fraction>0;
 if(manualActive&&!wasWorking)workKick=.045;wasWorking=manualActive;workKick=Math.max(0,workKick-dt*.3);
 manualBlend=THREE.MathUtils.lerp(manualBlend,manualActive?1:0,Math.min(1,dt*12));
 const scoop=heldTool===3,stroke=Math.sin(time*(scoop?8:18));
 held.position.set(.34+(scoop?Math.sin(time*8)*.025*manualBlend:0),-.34+(scoop?stroke*.055*manualBlend:0),-.63+workKick+manualBlend*.015);
 held.rotation.set((scoop?-.12+stroke*.22:stroke*.035)*manualBlend,0,(scoop?Math.cos(time*8)*.07:Math.sin(time*6)*.012)*manualBlend);
 toolEffects.position.copy(held.position);toolEffects.rotation.copy(held.rotation);lighterFlame.visible=manualActive&&heldTool<3;
 lighterFlame.position.set(0,heldTool===2?.3:.265,heldTool===2?-.49:0);
 const flamePower=heldTool===2?1.9:heldTool===1?1.45:1.15;
 lighterFlame.scale.set((1+Math.sin(time*31)*.1)*flamePower,(.9+Math.sin(time*23)*.17+Math.sin(time*47)*.07)*flamePower,(1+Math.cos(time*29)*.08)*flamePower);
 lighterFlame.rotation.z=Math.sin(time*17)*.1;
 manualImpact.visible=manualActive;
 if(manualActive){const phase=time*(scoop?1.3:1.7)%1,radius=stage<2?(stage===0?.5:.8):Math.min(bounds.hx*.25,3),inward=heldTool===4||heldTool===5;manualImpact.position.y=surface.position.y+.035;manualImpact.scale.setScalar(.15+(inward?1-phase:phase)*radius*2);impactMaterial.opacity=(1-phase)*.7;impactMaterial.color.set(heldTool>=6?'#ffd26b':heldTool<3?'#fff2ae':'#c0fff3');}
 camera.position.set(player.position.x,player.position.y+2.95,player.position.z);camera.rotation.set(pitch,yaw,0,'YXZ');
 const pos=destPosition();if(pos){marker.position.copy(pos);marker.position.y=2.8+Math.sin(time*3)*.18;marker.rotation.y=time;}
 for(let i=0;i<rotors.length;i++){if(autoOn){rotors[i].rotation.z+=dt*(3+i);rotors[i].scale.setScalar(1+Math.sin(time*6+i)*.04);}}
 effectTime+=dt;
 if(effectTime>=1/30){const effectDt=effectTime;effectTime=0;const emitting=(working||autoOn)&&fraction>0;emission+=emitting?effectDt*(preferences.quality==='low'?(manualActive?12:6):(manualActive?30:16)):0;
 while(emission>=1){emission--;liveParticles=true;const p=particles[particleCursor++%particleLimit];p.life=.7+rand()*.7;p.size=.6+rand();p.position.set((rand()-.5)*Math.min(bounds.hx,3),surface.position.y+.05,-4+(rand()-.5)*Math.min(bounds.hz,2));p.velocity.set((rand()-.5)*.3,.5+rand()*.6,(rand()-.5)*.3);}
 if(liveParticles){let alive=0;for(let i=0;i<particles.length;i++){const p=particles[i];p.life=Math.max(0,p.life-effectDt);if(p.life>0){alive++;p.position.addScaledVector(p.velocity,effectDt);}particleTransform.position.copy(p.position);particleTransform.scale.setScalar(p.life>0?p.size*Math.min(1,p.life*3):0);particleTransform.updateMatrix();steam.setMatrixAt(i,particleTransform.matrix);}steam.instanceMatrix.needsUpdate=true;liveParticles=alive>0;}steam.visible=liveParticles;
 }
 beam.visible=manualActive&&heldTool>=4;if(beam.visible){const a=beamStart;held.getWorldPosition(a);const b=beamEnd.set(0,surface.position.y,-4);const v=beamDirection.subVectors(b,a);beam.position.copy(a).add(b).multiplyScalar(.5);const width=(heldTool>5?4:heldTool===5?1.8:1.3)*(1+Math.sin(time*12)*.08);beam.scale.set(width,v.length(),width);beam.quaternion.setFromUnitVectors(up,v.normalize());beam.material.color.set(heldTool>5?'#ffd77a':'#8ce4df');}
 renderer.render(scene,camera);
 frameState.nearWater=nearWater();frameState.store=closestStore();frameState.destinationDistance=pos?Math.round(player.position.distanceTo(pos)):0;frameState.heat=heat;frameState.levelDrop=top-surface.position.y;frameState.exposedArea=view.exposedArea;frameState.machineCount=view.machineCount;frameState.commissioning=view.pulse;return frameState;
 }
 function batchStatic(group,excluded=new Set()){
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),batches=new Map();
  function collect(node){if(excluded.has(node))return;if(node.isMesh&&node.material&&!Array.isArray(node.material)&&!node.material.isShaderMaterial){const list=batches.get(node.material)||[];list.push(node);batches.set(node.material,list);}else for(const child of node.children)collect(child);}
  for(const child of group.children)collect(child);
  for(const [material,objects]of batches){if(objects.length<2)continue;const geometries=objects.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));return g;});const merged=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!merged)continue;for(const o of objects){o.parent.remove(o);o.geometry.dispose();}const combined=new THREE.Mesh(merged,material);combined.castShadow=true;combined.receiveShadow=true;combined.updateMatrix();combined.matrixAutoUpdate=false;group.add(combined);}
 }
 const staticMeshCount=()=>{let count=0;environment.traverse(o=>{if(o.isMesh)count++;});return count;};
 const optimization={before:staticMeshCount()};batchStatic(environment,new Set([sea,ground,islandBase,...nearProps,...nearPalms]));for(const s of Object.values(stores))batchStatic(s.group,new Set(s.group.children.filter(c=>c.name.startsWith('shop-title-')||c.name.startsWith('shop-subtitle-'))));optimization.after=staticMeshCount();
 freezeStatic(environment);for(const s of Object.values(stores))freezeStatic(s.group);
 const spectacle=createSpectacle({scene,mesh,box,cyl,lineBetween,textSprite,M,mat,batchStatic,freezeStatic});
 buildStage(0);applySettings(preferences);
 return {scene,camera,renderer,keys,player,buildStage,setTool,setMachines,setDestination,nearWater,closestStore,update,applySettings,captureLook,releaseLook,enableLook,optimization,previewPlacement,setProgress:spectacle.setTrophies,commissioning:spectacle.commissioning,sampleFrame,getPerformance,isLooking:(now)=>dragging||now-lastLook<200};
}
