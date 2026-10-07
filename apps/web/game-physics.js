// Shared presentation timings; dice results and legal moves come from the engine.
export const DICE_DURATION=1650,PAWN_STEP=300,CHECKER_STEP=700,PIECE_TRANSFER=850,CAPTURE_FADE=280;
export const gooseSteps=route=>route.slice(1).map((n,i)=>Math.abs(n-route[i])===1?PAWN_STEP:PIECE_TRANSFER);
export const routeDuration=steps=>steps.reduce((sum,step)=>sum+step,0);
// Travel, settle briefly on each square, then continue. Never interpolate through a corner.
export function settledFrames(points,frame,steps){
 const duration=routeDuration(steps),frames=[{...frame(points[0]),offset:0,easing:'cubic-bezier(.22,.08,.22,1)'}];let elapsed=0;
 for(let i=1;i<points.length;i++){
  frames.push({...frame(points[i]),offset:(elapsed+steps[i-1]*.84)/duration,easing:'linear'});
  elapsed+=steps[i-1];frames.push({...frame(points[i]),offset:elapsed/duration,easing:'cubic-bezier(.22,.08,.22,1)'});
 }
 return frames;
}
export function gooseFlights(before,after,roll=after.lastRoll){
 if(!roll)return [];
 const route=roll.route||[roll.from,roll.to],steps=gooseSteps(route),duration=routeDuration(steps);
 return [{player:roll.player,route,steps,duration,delay:DICE_DURATION},...after.players.filter(p=>p!==roll.player&&before.positions[p]!==after.positions[p]).map(player=>({player,route:[before.positions[player],after.positions[player]],steps:[PIECE_TRANSFER],duration:PIECE_TRANSFER,delay:DICE_DURATION+duration}))];
}
