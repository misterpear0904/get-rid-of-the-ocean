import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld} from './dist/world.js';
globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.devicePixelRatio=1;
globalThis.addEventListener=()=>{};globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
const rendererFactory=()=>({shadowMap:{},setPixelRatio(){},setSize(){},render(scene,camera){scene.updateMatrixWorld();camera.updateMatrixWorld();}});
const world=createWorld({addEventListener(){},setPointerCapture(){}},{rendererFactory});const results=[];
for(const [stage,active]of [[0,false],[0,true],[5,true]]){world.buildStage(stage);world.setMachines(active?[1,1,1,1,1]:[0,0,0,0,0]);for(let i=0;i<180;i++)world.update(1/60,i/60,.6,active,active,true);globalThis.gc?.();const times=[];for(let i=0;i<1200;i++){const start=performance.now();world.update(1/60,(i+180)/60,.6,active,active,true);times.push(performance.now()-start);}times.sort((a,b)=>a-b);results.push({stage,active,medianMs:times[600],p95Ms:times[1140],p99Ms:times[1188]});}
await mkdir('qa',{recursive:true});await writeFile(`qa/performance-${process.argv[2]||'current'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
