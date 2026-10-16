// Regular-polygon Parchís boards: one arm of 3×8 cells per side around a central polygon.
// Every arm keeps the classic 17 track squares, so the square board reproduces the 68-square
// layout and the triangle, pentagon and hexagon extend it without changing any rule.
import {PARCHIS_COLORS,PARCHIS_ARM,parchisLayout,parchisSquare} from './game-core/index.js';

export const CELL_ACROSS=1.6,CELL_ALONG=.8875,ROWS=8;
const ARM_WIDTH=3*CELL_ACROSS,ARM_LENGTH=ROWS*CELL_ALONG,FRAME=.45,PAPER=.15;
// Single pawn, two pawns sharing a square and the number label, in cell units.
export const PAWN=.8,PAIR=.5,LANE_PAIR=.7,NUMBER_FONT=.3;
const add=(a,b,k=1)=>[a[0]+b[0]*k,a[1]+b[1]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const unit=angle=>[Math.cos(angle),Math.sin(angle)];
export const PARCHIS_NAMES={yellow:'Amarillo',green:'Verde',red:'Rojo',blue:'Azul',orange:'Naranja',purple:'Morado'};
export const NEST_FONT=.3,nestLabelWidth=name=>name.length*NEST_FONT*.72;
export const numberWidth=label=>String(label).length*NUMBER_FONT*.56;

// A point is inside a convex polygon (either winding) when it keeps at least `margin` of
// clearance from every edge line.
export function insideConvex(polygon,[x,y],margin=0){
 let area=0;for(let i=0;i<polygon.length;i++){const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length];area+=ax*by-bx*ay;}
 const turn=Math.sign(area);
 return polygon.every(([ax,ay],i)=>{const [bx,by]=polygon[(i+1)%polygon.length];return turn*((bx-ax)*(y-ay)-(by-ay)*(x-ax))/Math.hypot(bx-ax,by-ay)>=margin-1e-9;});
}
export function circleInsideConvex(polygon,center,radius){return insideConvex(polygon,center,radius);}
// Axis-aligned box (upright text) against a circle: the circle clears it when the nearest box
// point lies outside the radius.
export function circleClearsBox([cx,cy],radius,{x,y,width,height}){
 const nx=Math.max(x,Math.min(cx,x+width)),ny=Math.max(y,Math.min(cy,y+height));
 return Math.hypot(cx-nx,cy-ny)>=radius;
}
// The same test for a box rotated so its width runs along `axis`.
export function circleClearsRotated([cx,cy],radius,{center:[x,y],axis,width,height}){
 const dx=cx-x,dy=cy-y,along=dx*axis[0]+dy*axis[1],across=-dx*axis[1]+dy*axis[0];
 return circleClearsBox([along,across],radius,{x:-width/2,y:-height/2,width,height});
}
// Text rotation in degrees that never reads upside down.
export const upright=angle=>{let deg=angle*180/Math.PI;while(deg>90)deg-=180;while(deg<=-90)deg+=180;return deg;};
export function boxInsideConvex(polygon,{x,y,width,height},margin=0){
 return [[x,y],[x+width,y],[x+width,y+height],[x,y+height]].every(p=>insideConvex(polygon,p,margin));
}

const cache=new Map();
export function parchisGeometry(sides=4){
 if(cache.has(sides))return cache.get(sides);
 const layout=parchisLayout(sides),alpha=Math.PI/sides,apothem=ARM_WIDTH/(2*Math.tan(alpha)),inner=ARM_WIDTH/(2*Math.sin(alpha)),outer=(apothem+ARM_LENGTH)/Math.cos(alpha);
 // Arm 0 points down; play runs anticlockwise on screen, like the classic square board.
 const arms=Array.from({length:sides},(_,k)=>{const angle=Math.PI/2-k*2*alpha,u=unit(angle),v=[u[1],-u[0]];return {angle,u,v,color:layout.colors[k]};});
 const at=(k,across,along)=>add(add([0,0],arms[k].u,apothem+along),arms[k].v,across);
 const cell=(k,column,row)=>{
  const across=(column-1)*CELL_ACROSS,along=(row+.5)*CELL_ALONG,{u,v}=arms[k];
  return {arm:k,column,row,center:at(k,across,along),u,v,corners:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>at(k,across+a*CELL_ACROSS/2,along+b*CELL_ALONG/2))};
 };
 // Track square i: the leaving side of arm k (outer → inner), the next arm's entering side
 // (inner → outer) and that arm's tip. Numbers sit on the outer edge, pawns towards the lane.
 const track=Array.from({length:layout.cells},(_,i)=>{
  const k=Math.floor(i/PARCHIS_ARM),j=i%PARCHIS_ARM,next=(k+1)%sides;
  const c=j<8?cell(k,2,7-j):j<16?cell(next,0,j-8):cell(next,1,7),side=c.column===0?-1:1;
  const width=numberWidth(i+1),height=NUMBER_FONT*.74,label=add(c.center,c.v,side*(CELL_ACROSS/2-.3));
  return {...c,index:i,side,number:{x:label[0],y:label[1],box:{x:label[0]-width/2,y:label[1]-height/2,width,height}}};
 });
 const lanes=Object.fromEntries(arms.map((arm,k)=>[arm.color,Array.from({length:7},(_,n)=>({...cell(k,1,6-n),side:0}))]));
 const vertex=k=>{const b=unit(arms[k].angle-alpha);return {bisector:b,point:[b[0]*inner,b[1]*inner],corner:[b[0]*outer,b[1]*outer]};};
 // Each home is the kite between its own arm and the next one; four pawns sit on its incircle.
 const nests=Object.fromEntries(arms.map((arm,k)=>{
  const {bisector,point,corner}=vertex(k),next=arms[(k+1)%sides],polygon=[point,add(point,arm.u,ARM_LENGTH),corner,add(point,next.u,ARM_LENGTH)];
  const distance=ARM_LENGTH/(Math.sin(alpha)+Math.cos(alpha)),radius=distance*Math.sin(alpha),center=add(point,bisector,distance);
  const size=Math.min(1.4,radius*.5),gap=size*.6,across=[-bisector[1],bisector[0]];
  const slots=[0,1,2,3].map(piece=>add(add(center,bisector,piece<2?-gap:gap),across,piece%2?gap:-gap));
  const name=PARCHIS_NAMES[arm.color].toUpperCase(),labelWidth=nestLabelWidth(name),labelHeight=NEST_FONT*.74;
  // The label runs along the outer rim of the circle, beyond the pawns, read the right way up.
  let label=null;
  for(let reach=radius*.95;reach>size*1.1&&!label;reach-=.02){
   const [x,y]=add(center,bisector,reach),corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>add(add([x,y],across,a*labelWidth/2),bisector,b*labelHeight/2));
   if(corners.every(p=>insideConvex(polygon,p,.1))&&slots.every(s=>circleClearsRotated(s,size/2+.08,{center:[x,y],axis:across,width:labelWidth,height:labelHeight})))label={x,y,rotate:upright(Math.atan2(across[1],across[0])),corners,name,width:labelWidth,height:labelHeight};
  }
  return [arm.color,{polygon,center,radius,size,slots,label}];
 }));
 // The centre is split into one triangle per colour; finished pawns line up inside it.
 const goals=Object.fromEntries(arms.map((arm,k)=>{
  const a=at(k,-ARM_WIDTH/2,0),b=at(k,ARM_WIDTH/2,0),polygon=[[0,0],a,b];
  let size=.7,slots=[];
  for(;size>.2;size-=.02){
   const height=size/2+.1;slots=[0,1,2,3].map(piece=>at(k,(piece-1.5)*size*1.12,-height));
   if(slots.every(s=>circleInsideConvex(polygon,s,size/2+.03)))break;
  }
  return [arm.color,{polygon,size,slots}];
 }));
 const scale=(r,d)=>arms.map((_,k)=>{const b=vertex(k).bisector;return [b[0]*(r+d/Math.cos(alpha)),b[1]*(r+d/Math.cos(alpha))];});
 const frame=scale(outer,FRAME),paper=scale(outer,PAPER),board=scale(outer,0),xs=frame.map(p=>p[0]),ys=frame.map(p=>p[1]);
 const viewBox={x:Math.min(...xs)-.05,y:Math.min(...ys)-.05,width:Math.max(...xs)-Math.min(...xs)+.1,height:Math.max(...ys)-Math.min(...ys)+.1};
 const geometry={sides,layout,arms,apothem,track,lanes,nests,goals,frame,paper,board,center:arms.map((_,k)=>at(k,ARM_WIDTH/2,0)),viewBox};
 cache.set(sides,geometry);return geometry;
}

// Where a pawn of `color` with `progress` stands, given how many pawns share the spot and
// its position among them. Returns board units plus its drawn diameter.
export function pawnSpot(sides,color,progress,piece,shared=1,order=0){
 const g=parchisGeometry(sides);
 if(progress<0){const nest=g.nests[color];return {point:nest.slots[piece],size:nest.size,where:'nest'};}
 if(progress===g.layout.goal){const goal=g.goals[color];return {point:goal.slots[piece],size:goal.size,where:'goal'};}
 const square=parchisSquare(color,progress,sides),c=square===null?g.lanes[color][progress-g.layout.shared]:g.track[square];
 if(!c)return {point:[0,0],size:PAWN,where:'track'};
 const where=square===null?'lane':'track';
 if(where==='lane'){
  if(shared<2)return {point:c.center,size:PAWN,where};
  return {point:add(c.center,c.v,(order?1:-1)*CELL_ACROSS/4),size:LANE_PAIR,where};
 }
 // On a track square the pawn area is the part of the cell away from the number.
 const toward=c.side;
 if(shared<2)return {point:add(c.center,c.v,-toward*.31),size:PAWN,where};
 const along=(CELL_ALONG/2-PAIR/2-.02)*(order?1:-1),across=order?-.09:-.5;
 return {point:add(add(c.center,c.v,toward*across),c.u,along),size:PAIR,where};
}
export {PARCHIS_COLORS};
