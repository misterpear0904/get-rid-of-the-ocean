import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
for(const f of ['three.core.js','three.module.js'])await copyFile(`node_modules/three/build/${f}`,`dist/vendor/${f}`);
await copyFile('node_modules/three/LICENSE','dist/vendor/THREE-LICENSE.txt');
await writeFile('dist/vendor/BufferGeometryUtils.js',(await readFile('node_modules/three/examples/jsm/utils/BufferGeometryUtils.js','utf8')).replace(/from 'three'/g,"from './three.module.js'"));
console.log('Three.js copied locally. No runtime CDN required.');
