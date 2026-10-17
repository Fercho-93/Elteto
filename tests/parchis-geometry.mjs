import assert from 'node:assert/strict';
import {parchisGeometry,pawnSpot,insideConvex,insidePolygon,circleInsideConvex,circleClearsBox,boxInsideConvex,PAWN,PAIR,LANE_PAIR} from '../dist/parchis-geometry.js';
import {parchisLayout,parchisSquare} from '../dist/game-core/index.js';
// Separating-axis test for two convex quadrilaterals (cells may only touch, never overlap).
const overlap=(a,b)=>{for(const poly of [a,b])for(let i=0;i<poly.length;i++){const [x1,y1]=poly[i],[x2,y2]=poly[(i+1)%poly.length],n=[y2-y1,x1-x2];const pa=a.map(p=>p[0]*n[0]+p[1]*n[1]),pb=b.map(p=>p[0]*n[0]+p[1]*n[1]);if(Math.max(...pa)<=Math.min(...pb)+1e-6||Math.max(...pb)<=Math.min(...pa)+1e-6)return false;}return true;};
const shapes={3:'triángulo',4:'cuadrado',5:'pentágono',6:'hexágono'};
for(const sides of [3,4,5,6]){
 const g=parchisGeometry(sides),layout=parchisLayout(sides),cells=[...g.track.map(c=>c.corners),...Object.values(g.lanes).flat().map(c=>c.corners)];
 assert.equal(g.track.length,17*sides);assert.equal(cells.length,24*sides);
 // Every cell lies on the board, and no two cells overlap.
 for(const c of cells)for(const p of c)assert.ok(insidePolygon(g.outline,p),`${sides}: cell outside board`);
 for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++)assert.ok(!overlap(cells[i],cells[j]),`${sides}: cells ${i} and ${j} overlap`);
 // Consecutive squares touch (an edge or the corner at the centre), so the route never jumps.
 for(let i=0;i<g.track.length;i++){const a=g.track[i].corners,b=g.track[(i+1)%g.track.length].corners;assert.ok(a.some(p=>b.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-6)),`${sides}: ${i}→${i+1} not adjacent`);}
 for(const color of layout.colors){
  const lane=g.lanes[color],start=g.track[layout.starts[color]],last=g.track[parchisSquare(color,layout.shared-1,sides)];
  // The start is on the colour's own arm, the route ends on that arm's tip and the lane follows it.
  assert.equal(start.arm,layout.colors.indexOf(color));assert.equal(last.arm,start.arm);assert.equal(last.column,1);assert.equal(last.row,7);
  assert.equal(lane[0].arm,start.arm);assert.equal(lane[0].row,6);assert.equal(lane[6].row,0);
  const nest=g.nests[color],goal=g.goals[color];
  assert.ok(nest.label,`${sides} ${color}: nest label has room`);for(const p of nest.label.corners)assert.ok(insideConvex(nest.shape,p,.05),`${sides} ${color}: label leaves its home`);
  for(const s of nest.slots){assert.ok(circleInsideConvex(nest.shape,s,nest.size/2),`${sides} ${color}: nest pawn outside home`);assert.ok(Math.hypot(s[0]-nest.center[0],s[1]-nest.center[1])+nest.size/2<=nest.radius+1e-6);assert.ok(nest.radius>=2.3,`${sides}: home keeps room for its four pawns (${nest.radius})`);}
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){assert.ok(Math.hypot(nest.slots[a][0]-nest.slots[b][0],nest.slots[a][1]-nest.slots[b][1])>=nest.size);assert.ok(Math.hypot(goal.slots[a][0]-goal.slots[b][0],goal.slots[a][1]-goal.slots[b][1])>=goal.size);}
  for(const s of goal.slots)assert.ok(circleInsideConvex(goal.polygon,s,goal.size/2),`${sides} ${color}: goal pawn outside centre`);
  assert.ok(goal.size>=.4,`${sides}: goal pawns too small (${goal.size})`);
  // Each progress value maps to a spot inside its own cell, singly and in pairs.
  for(let progress=0;progress<layout.goal;progress++){
   const square=parchisSquare(color,progress,sides),c=square===null?lane[progress-layout.shared]:g.track[square];
   for(const [shared,order] of [[1,0],[2,0],[2,1]]){
    const spot=pawnSpot(sides,color,progress,0,shared,order);
    assert.ok(circleInsideConvex(c.corners,spot.point,spot.size/2-1e-9),`${sides} ${color} ${progress} ${shared}/${order} outside its cell`);
    if(square!==null)assert.ok(circleClearsBox(spot.point,spot.size/2,c.number.box),`${sides} ${color} ${progress}: pawn covers number ${square+1}`);
   }
   const a=pawnSpot(sides,color,progress,0,2,0),b=pawnSpot(sides,color,progress,0,2,1);assert.ok(Math.hypot(a.point[0]-b.point[0],a.point[1]-b.point[1])>=a.size-1e-9,`${sides}: stacked pawns overlap`);
  }
 }
 // No arm sticks out of the board: each home arc starts exactly where its neighbouring arm ends.
 for(const color of layout.colors){const nest=g.nests[color];assert.ok(Math.abs(nest.reach-parchisGeometry(sides).nests[color].reach)<1e-9&&Math.abs(nest.reach-7.1)<1e-9,`${sides} ${color}: home reaches the arm tips (${nest.reach})`);}
 for(const c of g.track)assert.ok(boxInsideConvex(c.corners,c.number.box),`${sides}: number ${c.index+1} leaves its square`);
 assert.ok(g.viewBox.width>0&&g.viewBox.height>0);
 console.log(`Parchís ${shapes[sides]}: ${g.track.length} casillas sin solapes, ${sides*7} de pasillo, ${sides} casas y metas, números y fichas en su sitio: OK`);
}
assert.deepEqual([PAWN>PAIR,LANE_PAIR<PAWN],[true,true]);
