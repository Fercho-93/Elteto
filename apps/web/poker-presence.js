import {pokerAbsentAction} from './game-core/index.js';
export function pokerTurnKey(state){return JSON.stringify([state.handNumber,state.phase,state.turn,state.currentBet,state.street,state.paid,state.log?.at(-1)]);}
// A grace period belongs to one particular turn. Rejoining cancels it before any action.
export class PokerAbsenceRunner {
 constructor(get,apply,{delay=12000,clock=()=>Date.now(),onError=()=>{}}={}){this.onError=onError;this.get=get;this.apply=apply;this.delay=delay;this.clock=clock;this.key=null;this.busy=false;}
 start(){this.timer=setInterval(()=>void this.tick().catch(this.onError),1000);this.timer.unref?.();}
 stop(){clearInterval(this.timer);this.key=null;}
 candidate(){const ctx=this.get();if(!ctx||ctx.engine?.id!=='texas-holdem'||!ctx.state||ctx.state.finished)return null;
  const playerId=ctx.state.players[ctx.state.turn],player=ctx.players.find(p=>p.id===playerId);
  if(!player?.away||!ctx.players.some(p=>!p.away))return null;
  const action=pokerAbsentAction(ctx.state);return action?{playerId,action,key:pokerTurnKey(ctx.state)}:null;
 }
 async tick(){if(this.busy)return;const move=this.candidate();if(!move){this.key=null;return;}
  if(move.key!==this.key){this.key=move.key;this.since=this.clock();return;}
  if(this.clock()-this.since<this.delay)return;
  this.busy=true;try{await this.apply(move);}finally{this.busy=false;this.key=null;}
 }
}
