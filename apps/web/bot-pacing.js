import {publicTurnEvent,TURN_INTRO,TURN_RESULT} from './turn-events.js';
// The authority leaves time for every client to read the preceding public move.
export class BotPacing {
 constructor(){this.previous=null;this.until=0;}
 observe(view,runner,now=Date.now()){
  const event=publicTurnEvent(this.previous,view);this.previous=view;
  if(event){this.until=now+TURN_INTRO+event.motion+TURN_RESULT+800;runner.stop();}
 }
 delay(minimum,now=Date.now()){return Math.max(minimum,this.until-now);}
}
