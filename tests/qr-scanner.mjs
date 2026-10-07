import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile('apps/web/qr-scanner.js','utf8');
function setup({native,decode=()=>null,media,play,draw}={}) {
 const frames=new Map(),reads=[],constraints=[],errors=[],values=[];let seq=0,now=0,stops=0;
 const track={stop(){stops++;},getCapabilities:()=>({focusMode:['continuous']}),async applyConstraints(value){constraints.push(value);}};
 const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
 const video={videoWidth:3840,videoHeight:2160,readyState:2,setAttribute(){},muted:false,srcObject:null,play:play||(()=>Promise.resolve()),pause(){}};
 const context={drawImage(...args){draw?.(...args);},getImageData(x,y,width,height){reads.push({width,height});return {data:new Uint8ClampedArray(4)};}};
 const window={};
 vm.runInNewContext(source,{window,navigator:{mediaDevices:{getUserMedia:media|| (async c=>{constraints.push(c);return stream;})}},document:{createElement:()=>({width:0,height:0,getContext:()=>context})},BarcodeDetector:native,jsQR:decode,DOMException,requestAnimationFrame(fn){frames.set(++seq,fn);return seq;},cancelAnimationFrame(id){frames.delete(id);}});
 return {api:window.CONTINUUM.QrScanner,video,stream,track,frames,reads,constraints,errors,values,get stops(){return stops;},start:options=>window.CONTINUUM.QrScanner.start(video,value=>values.push(value),error=>errors.push(error),options),async tick(){const [id,fn]=frames.entries().next().value;frames.delete(id);await fn(now+=200);}};
}

let nativeCalls=0,softwareCalls=0;
class Native {
 static async getSupportedFormats(){return ['qr_code'];}
 constructor(options){assert.equal(options.formats.join(','),'qr_code');}
 async detect(video){nativeCalls++;assert.equal(video.videoWidth,3840);return [{rawValue:'https://fercho-93.github.io/Elteto/?join=ABCD2345'}];}
}
let env=setup({native:Native,decode:()=>{softwareCalls++;}}),scanner=await env.start();await env.tick();
assert.equal(nativeCalls,1);assert.equal(softwareCalls,0);assert.equal(env.values.length,1);scanner.stop();assert.equal(env.stops,1);assert.equal(env.frames.size,0);

// Unsupported QR formats, empty results and native exceptions all use jsQR.
for(const behavior of ['unsupported','empty','throws']){
 class Detector {static async getSupportedFormats(){return behavior==='unsupported'?['ean_13']:['qr_code'];}async detect(){if(behavior==='throws')throw Error('Unsupported source');return [];}}
 env=setup({native:Detector,decode:(bytes,width,height,options)=>{assert.equal(options.inversionAttempts,'attemptBoth');assert.ok(Math.max(width,height)<=1280);return {data:'ABCD2345'};}});
 scanner=await env.start();await env.tick();assert.deepEqual(env.values,['ABCD2345']);scanner.stop();
}
// Bounded frames, sharper centre crop, and no permanently dead loop after draw errors.
let draws=0;env=setup({draw(){if(draws++===0)throw Error('Frame not ready');}});scanner=await env.start();
for(let i=0;i<4;i++)await env.tick();assert.equal(env.errors.length,1);assert.equal(env.reads.length,3);assert.ok(env.reads.every(r=>Math.max(r.width,r.height)<=1280));assert.ok(env.reads.some(r=>r.width===r.height));assert.ok(env.frames.size);scanner.stop();

// Cancel while camera permission is still pending; close its eventual stream.
let release;const pending=new Promise(r=>release=r);env=setup({media:()=>pending});const abort=new AbortController();const starting=env.start({signal:abort.signal});
await Promise.resolve();await Promise.resolve();abort.abort();release(env.stream);await assert.rejects(starting,e=>e.name==='AbortError');assert.equal(env.stops,1);assert.equal(env.video.srcObject,null);assert.equal(env.frames.size,0);

// A pending native read must neither deliver nor schedule anything after cancellation.
let finishRead;class Slow {static async getSupportedFormats(){return ['qr_code'];}detect(){return new Promise(r=>finishRead=r);}}
env=setup({native:Slow});scanner=await env.start();const reading=env.tick();assert.equal(env.frames.size,0);scanner.stop();finishRead([{rawValue:'ABCD2345'}]);await reading;assert.equal(env.values.length,0);assert.equal(env.frames.size,0);

// Permission denial is not retried, and failed video playback releases the camera.
let attempts=0;env=setup({media:async()=>{attempts++;throw new DOMException('Denied','NotAllowedError');}});await assert.rejects(env.start(),e=>e.name==='NotAllowedError');assert.equal(attempts,1);
env=setup({play:async()=>{throw Error('Playback failed');}});await assert.rejects(env.start(),/Playback failed/);assert.equal(env.stops,1);assert.equal(env.video.srcObject,null);

// Unsupported resolution constraints retry without the resolution request.
attempts=0;let retryStream;env=setup({media:async constraints=>{if(attempts++===0)throw new DOMException('Resolution','OverconstrainedError');assert.equal(constraints.video.width,undefined);return retryStream;}});retryStream=env.stream;scanner=await env.start();assert.equal(attempts,2);assert.ok(env.constraints.some(c=>c.advanced?.[0].focusMode==='continuous'));scanner.stop();
console.log('QR: native/fallback decoding, bounded frames, recovery, autofocus, cancellation races and camera cleanup: OK');
