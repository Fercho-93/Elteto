// Que la mesa siempre se vea entera, sin desplazarse dentro del tapete.
// The felt has the height the screen leaves it; when a table holds more than fits
// (many players, a long line of cards), its contents shrink just enough instead of
// being cut off. The dock shrinks only the hand, never the action buttons, and gives
// room back to the felt before the table has to shrink a lot.
const MIN_TABLE=0.45,MIN_HAND=0.6,COMFORT=0.85;
function setZoom(targets,scale){for(const el of targets){if(scale>=0.999)el.style.removeProperty('zoom');else el.style.zoom=String(+scale.toFixed(3));}}
// Shrink targets until box no longer overflows; returns the scale used.
function fit(box,targets,min,start=1){
 if(!box||!targets.length)return 1;
 setZoom(targets,start);
 const style=getComputedStyle(box),pad=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
 let scale=start;
 for(let i=0;i<6;i++){
  if(box.scrollHeight-box.clientHeight<=1||scale<=min)break;
  const room=box.clientHeight-pad,content=box.scrollHeight-pad;
  scale=Math.max(min,scale*Math.min(0.97,room/content));
  setZoom(targets,scale);
 }
 return scale;
}
const flowChildren=el=>[...el.children].filter(child=>getComputedStyle(child).position!=='absolute');
export function fitTable(root){
 for(const screen of root.querySelectorAll('.catalog-screen')){
  const surface=screen.querySelector(':scope > .catalog-surface'),dock=screen.querySelector(':scope > .catalog-dock');
  const hand=dock?[...dock.querySelectorAll(':scope > .catalog-hand')]:[];
  let handScale=fit(dock,hand,MIN_HAND);
  if(!surface)continue;
  const kids=flowChildren(surface);
  let tableScale=fit(surface,kids,MIN_TABLE);
  // A cramped felt borrows height from the hand: smaller private cards, larger table.
  while(tableScale<COMFORT&&hand.length&&handScale>MIN_HAND){
   handScale=Math.max(MIN_HAND,handScale*0.9);setZoom(hand,handScale);
   tableScale=fit(surface,kids,MIN_TABLE);
  }
 }
}
let pending=0;
export function watchTableFit(root){
 if(typeof addEventListener!=='function')return;
 addEventListener('resize',()=>{cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>fitTable(root));});
}
