// Física de las cartas sobre la mesa. Solo se anima lo público: la mano propia nunca se mueve.
// Una carta lanzada sube en arco (se acerca a la cámara y su sombra se separa), gira hasta
// asentarse y aterriza con un pequeño aplastamiento. Las de un rival viajan boca abajo y se
// voltean a mitad de camino. Robar o repartir lanza dorsos desde el mazo hacia cada jugador.
export const CARD_FLIGHT=760,OWN_FLIGHT=560,DRAW_FLIGHT=520,DRAW_STAGGER=110,DEAL_STAGGER=70;
const ease=f=>1-Math.pow(1-f,2.4);
const centre=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
const LAND=.8;
/** Fotogramas de una carta que sale de `origin` y se posa en `destination` (rectángulos de pantalla). */
export function tossFrames(origin,destination,{flip=false,spin=-12}={}){
 const o=centre(origin),d=centre(destination),dx=o.x-d.x,dy=o.y-d.y,distance=Math.hypot(dx,dy);
 const start=Math.max(.4,Math.min(1.25,origin.width/Math.max(1,destination.width))),lift=Math.min(70,14+distance*.18);
 const offsets=flip?[0,.2,.38,.47,.56,LAND,.9,1]:[0,.25,.5,LAND,.9,1];
 return offsets.map(offset=>{
  if(offset===1)return {offset,transform:'none',opacity:1};
  const k=offset>=LAND?1:ease(offset/LAND),arc=Math.sin(Math.PI*k);
  const scale=(start+(1-start)*k)*(1+.1*arc);
  let sx=scale,sy=scale;
  if(flip&&offset===.47)sx*=.06;
  if(offset===.9){sx*=1.04;sy*=.96;}
  const x=dx*(1-k),y=dy*(1-k)-lift*arc,rotation=spin*(1-k);
  return {offset,transform:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${rotation.toFixed(1)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`,boxShadow:offset>=LAND?(offset===.9?'0 1px 2px #0008':'0 3px 5px #0005'):`0 ${(4+16*arc).toFixed(1)}px ${(6+18*arc).toFixed(1)}px #0006`,opacity:offset===0?.85:1};
 });
}
/** Dorso que tapa la cara mientras la carta de un rival vuela; desaparece en el volteo. */
export function flipCover(card,back,duration,elapsed,delay=0){
 const cover=document.createElement('span');cover.className='card-flight-back';cover.setAttribute('aria-hidden','true');cover.innerHTML=back;card.append(cover);
 const animation=cover.animate([{opacity:1},{opacity:1,offset:.46},{opacity:0,offset:.48},{opacity:0}],{duration,delay,fill:'both'});
 animation.currentTime=elapsed;animation.onfinish=()=>cover.remove();
}
/** Dorso suelto que viaja del mazo a un jugador. Se recrea en cada redibujado conservando su progreso. */
export function drawGhost(app,draw,back,now){
 const elapsed=now-draw.started;if(elapsed>=draw.delay+DRAW_FLIGHT)return false;
 const el=document.createElement('div');el.className='catalog-card card-draw-ghost';el.setAttribute('aria-hidden','true');el.innerHTML=back;
 const from=draw.from,to=draw.to;Object.assign(el.style,{left:from.x+'px',top:from.y+'px',width:from.width+'px',height:from.height+'px'});app.append(el);
 const o=centre(from),d=centre(to),dx=d.x-o.x,dy=d.y-o.y,lift=Math.min(50,10+Math.hypot(dx,dy)*.12),end=Math.max(.45,Math.min(1,to.height/from.height*.8));
 const frames=[0,.5,.85,1].map(offset=>{const k=ease(offset),arc=Math.sin(Math.PI*k);return {offset,transform:`translate(${(dx*k).toFixed(1)}px,${(dy*k-lift*arc).toFixed(1)}px) rotate(${(draw.spin*(1-k)+6*k).toFixed(1)}deg) scale(${(1+(end-1)*k+.08*arc).toFixed(3)})`,opacity:offset===1?0:1};});
 const animation=el.animate(frames,{duration:DRAW_FLIGHT,delay:draw.delay,easing:'linear',fill:'both'});
 animation.currentTime=elapsed;animation.onfinish=()=>el.remove();
 return true;
}
/** Dónde cae una carta robada: la zona de tu mano o el retrato del rival. */
export function drawTarget(app,player,self){
 if(player===self){const hand=app.querySelector('.catalog-hand');if(hand){const r=hand.getBoundingClientRect();if(r.width&&r.height)return new DOMRect(r.x+r.width/2-20,r.y+r.height/2-30,40,60);}}
 const seat=[...app.querySelectorAll('.rival-seat')].find(el=>el.dataset.playerId===player);
 const token=seat?.querySelector('.rival-token')||seat;return token?.getBoundingClientRect()||null;
}
