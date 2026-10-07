import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await readFile('dist/'+file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.QR_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.evaluate(()=>{if(!navigator.mediaDevices)Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{}});});
 // Real QR pixels, production encoder and decoder. Only the camera source is simulated.
 for(const mode of ['normal','portrait','small-4k','rotated','off-centre','inverted','offline']){
  const result=await page.evaluate(async mode=>{
   Object.defineProperty(window,'BarcodeDetector',{configurable:true,value:undefined});
   const text=mode==='offline'?'z'+Array.from({length:800},(_,i)=>'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'[(i*43+i*i)%64]).join(''):'https://fercho-93.github.io/Elteto/?join=ABCD2345';
   const qr=document.createElement('canvas');CONTINUUM.QrEncode.draw(qr,text);
   const frame=document.createElement('canvas');frame.width=mode==='small-4k'?3840:mode==='portrait'?1080:1920;frame.height=mode==='small-4k'?2160:mode==='portrait'?1920:1080;
   const ctx=frame.getContext('2d');ctx.fillStyle='#bbb';ctx.fillRect(0,0,frame.width,frame.height);
   const size=mode==='offline'?700:mode==='small-4k'?360:480,x=mode==='off-centre'?20:(frame.width-size)/2,y=mode==='off-centre'?20:(frame.height-size)/2;
   ctx.imageSmoothingEnabled=false;
   if(mode==='rotated'){ctx.translate(frame.width/2,frame.height/2);ctx.rotate(Math.PI/2);ctx.drawImage(qr,-size/2,-size/2,size,size);}else ctx.drawImage(qr,x,y,size,size);
   if(mode==='inverted'){const pixels=ctx.getImageData(0,0,frame.width,frame.height);for(let i=0;i<pixels.data.length;i+=4)for(let j=0;j<3;j++)pixels.data[i+j]=255-pixels.data[i+j];ctx.putImageData(pixels,0,0);}
   let stops=0;const track={stop(){stops++;}},stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
   Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,writable:true,value:async()=>stream});
   Object.assign(frame,{videoWidth:frame.width,videoHeight:frame.height,readyState:2,play:async()=>{},pause(){}});
   let resolve,reject;const found=new Promise((yes,no)=>{resolve=yes;reject=no;}),failures=[];
   const scanner=await CONTINUUM.QrScanner.start(frame,resolve,e=>failures.push(e.message));
   const timeout=setTimeout(()=>reject(Error('QR timeout: '+mode)),10000);
   try{return {text,actual:await found,failures};}finally{clearTimeout(timeout);scanner.stop();if(stops!==1)throw Error('Camera not stopped');}
  },mode);
  assert.equal(result.actual,result.text,mode);assert.deepEqual(result.failures,[]);
 }
 // Cancellation must work even though the overlay is a sibling of #app.
 await page.getByRole('button',{name:/Unirme a partida/}).click();await page.locator('#join-name').fill('Nombre escrito');
 await page.evaluate(()=>{window.__stops=0;window.__requested=false;navigator.mediaDevices.getUserMedia=()=>{window.__requested=true;return new Promise(resolve=>window.__releaseCamera=()=>resolve({getTracks:()=>[{stop(){window.__stops++;}}],getVideoTracks:()=>[]}));};});
 await page.getByRole('button',{name:'Abrir cámara',exact:true}).click();await page.waitForFunction(()=>window.__requested);
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.evaluate(()=>window.__releaseCamera());
 await page.waitForFunction(()=>window.__stops===1);assert.equal(await page.locator('.scan-overlay').count(),0);
 // A denied permission gives a visible message and leaves the form intact.
 await page.evaluate(()=>navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');});
 await page.getByRole('button',{name:'Abrir cámara',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('permiso de cámara'));assert.equal(await page.locator('.scan-overlay').count(),0);
 // Fast native detection can finish before start() returns its stop handle.
 await page.route('**/online-room.js',route=>route.fulfill({contentType:'text/javascript',body:`export class OnlineSession { static async join(code,name,onChange){window.__joined={code,name};onChange({kind:'lobby',gameId:'cinquillo',roomCode:code,roomName:'Mesa QR',playerId:'guest',isHost:false,players:[{id:'guest',name}]});return {playerId:'guest'};} }`}));
 await page.evaluate(()=>{window.__lateStops=0;CONTINUUM.QrScanner.start=async(video,onFrame)=>{onFrame('https://fercho-93.github.io/Elteto/?join=ABCD2345');onFrame('https://fercho-93.github.io/Elteto/?join=BCDE2345');return {stop(){window.__lateStops++;}};};});
 await page.getByRole('button',{name:'Abrir cámara',exact:true}).click();await page.waitForFunction(()=>window.__joined);
 assert.deepEqual(await page.evaluate(()=>window.__joined),{code:'ABCD2345',name:'Nombre escrito'});assert.equal(await page.evaluate(()=>window.__lateStops),1);assert.equal(await page.locator('.scan-overlay').count(),0);
 assert.deepEqual(errors,[]);console.log(`${kind}: 7 real QR images, cancellation, permission feedback, typed name and fast QR-to-room handoff: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
