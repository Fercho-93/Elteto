import * as T from './vendor/three.module.min.js';
import { cardSvg } from './card-art.js';
import { mascotForSeat } from './table-view.js';
import { SPANISH_RANKS, FRENCH_RANKS, SPANISH_SUITS } from './game-core/index.js';

const FELT_Y=1.35, CARD_W=.64, CARD_H=.92, CARD_T=.012;
const sphere=new T.SphereGeometry(1,20,14), box=new T.BoxGeometry(1,1,1);
const materials=new Map();
function material(color,roughness=.55) {
 const key=color+':'+roughness;
 if(!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color,roughness}));
 return materials.get(key);
}
function shape(parent,color,pos,scale,geometry=sphere) {
 const m=new T.Mesh(geometry,material(color)); m.position.set(...pos);m.scale.set(...scale);
 m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function tube(parent,points,color,r=.05) {
 const geo=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),18,r,8,false);
 return shape(parent,color,[0,0,0],[1,1,1],geo);
}
function eyes(g,y=1.95,z=.43,angry=false,wink=false) {
 for(const side of [-1,1]) {
  if(wink&&side===1){tube(g,[[.08,y-.01,z],[.2,y+.035,z],[.3,y-.01,z]],'#191329',.025);continue;}
  shape(g,'#fff6df',[side*.19,y,z],[.115,.145,.048]);
  shape(g,'#191329',[side*.17,y-.015,z+.042],[.059,.083,.025]);
  const brow=shape(g,'#29192f',[side*.19,y+.19,z],[.16,.03,.045]);brow.rotation.z=angry?side*.23:side*-.13;
 }
 tube(g,[[-.13,y-.27,z],[0,y-.31,z+.02],[.13,y-.25,z]],'#32172e',.023);
}
function leaves(g,y) {
 for(let i=0;i<5;i++) {const a=i*Math.PI*2/5;const leaf=shape(g,'#64bd0d',[Math.sin(a)*.23,y,Math.cos(a)*.17],[.12,.07,.33]);leaf.rotation.y=a;leaf.rotation.z=Math.sin(a)*.4;}
 tube(g,[[0,y,0],[0,y+.26,0],[-.12,y+.34,0]],'#359207',.075);
}
function chair(g) {
 shape(g,'#773c1f',[0,.9,-.16],[.82,.14,.72],box);
 shape(g,'#124735',[0,1.6,-.46],[.87,1.35,.13],box);
 for(const x of [-.48,.48]) {
  shape(g,'#955124',[x,1.6,-.46],[.12,1.55,.14],box);
  shape(g,'#9d5928',[x,1.1,.12],[.10,.14,.9],box);
  for(const z of [-.4,.4]) shape(g,'#663117',[x,.44,z],[.10,.88,.10],box);
 }
 shape(g,'#b57432',[0,2.34,-.46],[1.04,.12,.14],box);
}
function mascot(index) {
 const g=new T.Group();chair(g);
 const colors=['#8619d2','#f78c29','#f5c929','#fff6e2','#58ae13','#f77f9a','#f14724','#00a6e3','#854526','#a66632'];
 const c=colors[index];
 if(index===0) {shape(g,c,[0,1.73,0],[.47,.78,.39]);leaves(g,2.46);eyes(g,1.95,.39,true);}
 if(index===1) {for(const x of [-.21,.21]) shape(g,c,[x,1.72,0],[.37,.56,.38]);leaves(g,2.28);eyes(g,1.94,.38);shape(g,'#dd3651',[0,1.63,.40],[.10,.045,.03]);}
 if(index===2) {
  tube(g,[[-.25,1.03,0],[-.10,1.47,0],[.02,1.98,0],[-.12,2.3,0]],c,.25);
  for(const side of [-1,1]) tube(g,[[0,1.35,0],[side*.35,1.1,.06],[side*.46,.97,.08]],'#ffe15e',.11);
  shape(g,'#64351c',[0,2.35,0],[.63,.08,.42]);shape(g,'#743c20',[0,2.51,0],[.35,.27,.29]);
  const star=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.055:.12;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)star.moveTo(x,y);else star.lineTo(x,y);}star.closePath();
  shape(g,'#ffcf31',[0,2.54,.29],[1,1,1],new T.ExtrudeGeometry(star,{depth:.025,bevelEnabled:false}));eyes(g,1.98,.23,true);
 }
 if(index===3) {
  shape(g,'#fff7ee',[0,1.8,0],[.96,.72,.10],box);
  shape(g,'#f12135',[0,1.82,.08],[.28,.28,.03]);eyes(g,1.88,.115);
  shape(g,'#955828',[-.53,1.63,0],[.05,1.5,.05],box);shape(g,'#f2b636',[-.53,2.43,0],[.10,.10,.10]);
 }
 if(index===4) {
  shape(g,'#184e10',[0,1.73,0],[.50,.76,.36]);shape(g,'#b1e842',[0,1.73,.10],[.43,.66,.32]);
  shape(g,'#8e4d26',[0,1.47,.43],[.25,.25,.09]);eyes(g,2.05,.39,false,true);
  const hoop=new T.Mesh(new T.TorusGeometry(.13,.035,8,24),material('#c5cad3',.23));hoop.position.set(.48,1.99,0);g.add(hoop);
 }
 if(index===5) {
  shape(g,c,[0,1.64,0],[.57,.45,.38]);shape(g,'#ffacc0',[0,1.7,.28],[.48,.37,.12]);
  for(const x of [-.17,.17]) shape(g,'#702031',[x,1.72,.39],[.10,.15,.03]);
  for(const x of [-.48,.48]) shape(g,c,[x,1.91,-.03],[.19,.19,.13]);
 }
 if(index===6) {
  shape(g,'#ffe5b6',[0,1.53,0],[.40,.52,.34]);
  shape(g,c,[0,2.13,0],[.70,.44,.47]);
  for(const [x,y,z] of [[-.38,2.34,.21],[.30,2.41,.2],[.04,2.51,-.1],[.57,2.18,.19]]) shape(g,'#fff5d5',[x,y,z],[.14,.09,.09]);
  for(const x of [-.67,.67]) shape(g,'#fff0d9',[x,2.35,-.04],[.14,.14,.12]);eyes(g,1.68,.32,true);
 }
 if(index===7) {
  shape(g,c,[0,1.65,0],[.44,.55,.37]);
  const cone=shape(g,c,[-.10,2.15,0],[.35,.66,.32],new T.ConeGeometry(1,1,20));cone.rotation.z=.3;eyes(g,1.84,.36,true);
 }
 if(index===8) {
  for(let i=0;i<4;i++) shape(g,c,[0,1.25+i*.30,0],[.55-i*.10,.26,.38-i*.07]);
  shape(g,c,[-.06,2.40,0],[.12,.23,.10]);eyes(g,1.82,.35);
  for(const x of [-.2,.2]) shape(g,'#111525',[x,1.86,.43],[.18,.11,.04],box);
  shape(g,'#161722',[0,1.87,.44],[.12,.035,.035],box);
  tube(g,[[-.32,1.57,.31],[-.2,1.39,.44],[.2,1.39,.44],[.32,1.57,.31]],'#eac443',.047);
  tube(g,[[.07,1.35,.48],[-.06,1.35,.48],[-.07,1.28,.48],[.07,1.24,.48],[.07,1.17,.48],[-.07,1.17,.48]],'#eac443',.023);
  tube(g,[[0,1.4,.49],[0,1.13,.49]],'#eac443',.016);
 }
 if(index===9) {
  for(const x of [-.25,.25]) {
   const nut=new T.Group();nut.position.x=x;g.add(nut);shape(nut,c,[0,1.65,0],[.31,.52,.34]);eyes(nut,1.79,.32,true);nut.scale.x=.85;
  }
  for(const x of [-.15,0,.15]) {const spark=shape(g,'#ffc429',[x,2.25,0],[.09,.36,.06],new T.ConeGeometry(1,1,8));spark.rotation.z=-x*2;}
 }
 // Both hands wrap the lower corners of the physical fan; hands sit in front.
 const handColor=index===3||index===6?'#fff1d3':c;
 for(const side of [-1,1]) {
  tube(g,[[side*.37,1.65,.08],[side*.46,1.22,.32],[side*.27,1.13,.57]],handColor,.095);
  shape(g,handColor,[side*.25,1.15,.57],[.115,.10,.10]);
  for(let f=0;f<3;f++) shape(g,handColor,[side*(.23+f*.027),1.20,.62],[.028,.067,.025]);
 }
 return g;
}

export function publicCardLayout(view) {
 const ranks=view.ruleset==='legacy-french-52'?FRENCH_RANKS:SPANISH_RANKS;
 const suits=view.ruleset==='legacy-french-52'?['picas','corazones','diamantes','treboles']:SPANISH_SUITS;
 const out=[];
 for(const [row,suit] of suits.entries()) {
  const entry=view.table?.[suit];if(!entry) continue;
  const legacy=view.ruleset==='legacy-french-52';
  for(let i=entry.low;i<=entry.high;i++) out.push({key:`${suit}:${ranks[i]}`,card:{suit,rank:ranks[i]},x:(i-(ranks.length-1)/2)*(legacy?.50:.71),y:FELT_Y+CARD_T/2+.003,z:(row-1.5)*(legacy?.77:1.0),scale:legacy?.656:1});
 }
 return out;
}

class TableScene {
 constructor() {
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;
  this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.domElement.className='table-canvas';this.renderer.domElement.setAttribute('aria-hidden','true');
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(36,1,.1,100);
  this.scene.add(new T.HemisphereLight('#fff0d0','#382444',2.1));
  const key=new T.DirectionalLight('#ffefd5',3);key.position.set(-4,9,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9});key.shadow.bias=-.001;this.scene.add(key);
  const rim=new T.DirectionalLight('#b0d7ff',1.1);rim.position.set(4,5,-5);this.scene.add(rim);
  this.world=new T.Group();this.scene.add(this.world);this.players=new Map();this.textures=new Map();this.angle=0;this.elevation=0;
  this.meshes=new T.Group();this.world.add(this.meshes);this.moves=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.resize=new ResizeObserver(()=>this.fit());
  this.inView=true;this.intersection=new IntersectionObserver(entries=>{this.inView=entries[0]?.isIntersecting??true;if(this.inView)this.draw();else this.stop();});
  this.visibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=null;}else this.draw();};
  document.addEventListener('visibilitychange',this.visibility);
  this.motion=()=>this.draw();this.reduced.addEventListener('change',this.motion);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.host?.classList.remove('scene-ready');this.host?.setAttribute('data-scene','fallback');this.stop();});
  this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.lost=false;this.host?.classList.add('scene-ready');this.host?.setAttribute('data-scene','webgl');this.draw();});
 }
 texture(card) {
  const id=card?`${card.suit}:${card.rank}`:'back';if(this.textures.has(id))return this.textures.get(id);
  const canvas=document.createElement('canvas');canvas.width=200;canvas.height=280;const ctx=canvas.getContext('2d');
  ctx.fillStyle=card?'#fff4db':'#602078';ctx.fillRect(0,0,200,280);
  if(!card) {
   ctx.strokeStyle='#e4bbdf';ctx.lineWidth=3;ctx.strokeRect(8,8,184,264);
   ctx.lineWidth=1;for(let x=-280;x<200;x+=18){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+280,280);ctx.stroke();ctx.beginPath();ctx.moveTo(x+280,0);ctx.lineTo(x,280);ctx.stroke();}
   ctx.fillStyle='#f8df9c';ctx.beginPath();ctx.ellipse(100,140,35,48,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#602078';ctx.font='bold 28px Georgia';ctx.textAlign='center';ctx.fillText('E',100,150);
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.textures.set(id,texture);
  if(card){const image=new Image();image.onload=()=>{ctx.drawImage(image,0,0,200,280);texture.needsUpdate=true;this.draw();};image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(cardSvg(card));}
  return texture;
 }
 card(card) {
  const face=new T.MeshStandardMaterial({map:this.texture(card),roughness:.8});
  const back=new T.MeshStandardMaterial({map:this.texture(null),roughness:.8});
  const edge=material('#e1d1b4');
  const mesh=new T.Mesh(new T.BoxGeometry(CARD_W,CARD_T,CARD_H),[edge,edge,face,back,edge,edge]);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
 }
 table() {
  const geo=new T.CylinderGeometry(1,1,1,80);
  shape(this.world,'#713316',[0,1.14,0],[5.1,.30,3.30],geo);
  shape(this.world,'#bf7b34',[0,1.31,0],[5.05,.065,3.25],geo);
  shape(this.world,'#145b39',[0,FELT_Y-.025,0],[4.82,.05,3.02],geo);
  const trim=new T.Mesh(new T.TorusGeometry(1,.012,8,80),material('#eab655',.30));trim.rotation.x=-Math.PI/2;trim.scale.set(4.89,3.09,1);trim.position.y=FELT_Y;this.world.add(trim);
  for(const x of [-3.1,3.1])for(const z of [-1.8,1.8])shape(this.world,'#753917',[x,.56,z],[.22,1.1,.22],box);
  const floor=shape(this.world,'#25132c',[0,-.1,0],[24,.1,22],box);floor.castShadow=false;
  for(let i=-6;i<=6;i++) for(let j=-5;j<=5;j++) if((i+j)%2===0) {const tile=shape(this.world,'#301937',[i*1.8,-.043,j*1.8],[1.78,.008,1.78],box);tile.castShadow=false;}
 }
 clear(group) {
  group.traverse(o=>{if(o.isMesh){if(o.geometry!==sphere&&o.geometry!==box)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(![...materials.values()].includes(m))m.dispose();}});
  group.clear();
 }
 attach(host,view,playerId,gameId) {
  this.host=host;host.prepend(this.renderer.domElement);host.classList.toggle('scene-ready',!this.lost);this.resize.disconnect();this.resize.observe(host);this.intersection.disconnect();this.intersection.observe(host);this.inView=true;
  const token=gameId+':'+playerId+':'+view.players.join('|');
  if(this.token!==token) {
   this.clear(this.world);this.players.clear();this.table();this.meshes=new T.Group();this.world.add(this.meshes);this.token=token;this.oldKeys=null;
   const own=view.players.indexOf(playerId),n=view.players.length;
   view.players.forEach((id,index)=>{
    const relative=(index-own+n)%n;if(!relative)return; // First-person seat is behind the camera.
    const a=n===2?0:-Math.PI/2+(relative-1)*Math.PI/(n-2);
    const x=Math.sin(a)*5.55,z=-Math.cos(a)*3.95;
    const g=mascot(mascotForSeat(view.players,index));g.position.set(x,0,z);g.rotation.y=Math.atan2(-x,-z);g.scale.setScalar(1.3);this.world.add(g);
    const fan=new T.Group();g.add(fan);this.players.set(id,{g,fan,phase:index*1.3,anchor:new T.Vector3(x,3.65,z)});
   });
  }
  const before=this.view;this.view=view;this.playerId=playerId;
  for(const [id,p] of this.players) {
   const count=view.handSizes?.[id]||0;
   if(p.count!==count) {
    this.clear(p.fan);p.count=count;
    for(let i=0;i<count;i++) {
     // Opponent geometry contains backs only: no opponent rank/suit is supplied.
     const card=this.card(null),a=(i-(count-1)/2)*Math.min(.10,.95/Math.max(1,count));card.scale.set(.656,1,.656);
     card.position.set(Math.sin(a)*.23,1.34, .50+Math.cos(a)*.03+i*.001);
     card.rotation.set(-Math.PI/2,0,-a);p.fan.add(card);
    }
   }
   if(before&&before.log?.at(-1)!==view.log?.at(-1)&&before.turnPlayer===id)p.reaction=performance.now();
  }
  this.clear(this.meshes);this.moves=[];
  const layouts=gameId==='cinquillo'?publicCardLayout(view):[];
  const keys=new Set(layouts.map(p=>p.key));
  for(const item of layouts) {
   const m=this.card(item.card);m.scale.set(item.scale,1,item.scale);m.position.set(item.x,item.y,item.z);m.userData.tableKey=item.key;this.meshes.add(m);
   if(this.oldKeys&&!this.oldKeys.has(item.key)&&!this.reduced.matches) {
    const p=this.players.get(before?.turnPlayer);
    const start=p?new T.Vector3(p.g.position.x*.85,1.8,p.g.position.z*.85):new T.Vector3(0,2.1,3.1);
    this.moves.push({m,start,end:m.position.clone(),at:performance.now()});
   }
  }
  if(gameId==='mus') {
   if(view.revealedHands) {
    view.players.forEach((id,row)=>view.revealedHands[id].forEach((c,i)=>{const m=this.card(c);m.position.set((i-1.5)*.72+(row%2?1.6:-1.6),FELT_Y+.010,(Math.floor(row/2)-.5)*1.1);this.meshes.add(m);}));
   } else {
    for(let i=0;i<8;i++){const m=this.card(null);m.rotation.z=Math.PI; m.position.set(0,FELT_Y+.010+i*.014,0);this.meshes.add(m);}
   }
  }
  this.oldKeys=keys;this.fit();this.draw();
  host.dataset.scene=this.lost?'fallback':'webgl';host.dataset.publicCards=String(layouts.length+(view.revealedHands?Object.values(view.revealedHands).reduce((n,h)=>n+h.length,0):0));host.dataset.rivalCards=String([...this.players.values()].reduce((n,p)=>n+p.count,0));
 }
 fit() {
  if(!this.host)return;const w=this.host.clientWidth,h=this.host.clientHeight;
  this.renderer.setSize(w,h,false);this.camera.aspect=w/h;
  const distance=Math.max(12.5,17.5/this.camera.aspect),a=this.angle;
  this.camera.position.set(Math.sin(a)*distance,(8.5+this.elevation)*distance/12.5,Math.cos(a)*distance);
  this.camera.lookAt(0,1.2,0);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.projectLabels();
 }
 projectLabels() {
  if(!this.host)return;
  for(const seat of this.host.querySelectorAll('.table-seat')) {
   const p=this.players.get(seat.dataset.playerId);
   if(!p){seat.style.setProperty('--seat-x','50%');seat.style.setProperty('--seat-y','95%');continue;}
   const point=p.anchor.clone().project(this.camera);
   const x=T.MathUtils.clamp((point.x*.5+.5)*this.host.clientWidth,48,this.host.clientWidth-48);
   seat.style.setProperty('--seat-x',`${x/this.host.clientWidth*100}%`);seat.style.setProperty('--seat-y',`${T.MathUtils.clamp(-point.y*.5+.5,.04,.91)*100}%`);
  }
 }
 cameraStep(direction) {
  if(direction==='reset'){this.angle=0;this.elevation=0;}else this.angle=T.MathUtils.clamp(this.angle+direction*.13,-.39,.39);
  this.fit();this.draw();this.host.dataset.camera=String(this.angle);
 }
 draw() {
  if(this.disposed||this.lost||document.hidden||!this.inView)return;cancelAnimationFrame(this.frame);const now=performance.now();this.lastFrame=now;
  for(const p of this.players.values()) {
   const breathe=this.reduced.matches?0:Math.sin(now*.0016+p.phase)*.012;
   p.g.position.y=breathe;
   if(p.reaction&&!this.reduced.matches){const t=(now-p.reaction)/500;p.g.rotation.x=t<1?Math.sin(t*Math.PI)*.07:0;}
  }
  for(const move of this.moves) {
   const t=T.MathUtils.clamp((now-move.at)/480,0,1),ease=1-(1-t)**3;
   move.m.position.lerpVectors(move.start,move.end,ease);move.m.position.y+=Math.sin(t*Math.PI)*.50;move.m.rotation.y=(1-t)*-.25;
  }
  this.renderer.render(this.scene,this.camera);
  if(!this.reduced.matches)this.tick();
 }
 tick() {this.frame=requestAnimationFrame(time=>{if(time-this.lastFrame>=33)this.draw();else this.tick();});}
 stop() {cancelAnimationFrame(this.frame);this.frame=null;}
 dispose() {
  this.disposed=true;this.stop();this.resize.disconnect();this.intersection.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.reduced.removeEventListener('change',this.motion);
  this.clear(this.world);for(const tex of this.textures.values())tex.dispose();this.renderer.dispose();this.renderer.forceContextLoss();
 }
}
let current=null;
export function mountTable3D(host,view,playerId,gameId) {
 try{current ||= new TableScene();current.attach(host,view,playerId,gameId);return true;}
 catch(error){current?.dispose();current=null;host.classList.remove('scene-ready');host.dataset.scene='fallback';host.querySelector('.table-canvas')?.remove();return false;}
}
export function moveTableCamera(direction) {current?.cameraStep(direction);}
// Called when leaving a game; rerenders reuse one GPU context and camera.
export function disposeTable3D() {current?.dispose();current=null;}
