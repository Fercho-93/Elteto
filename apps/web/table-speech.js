const contexts=new WeakMap();
const singular={'2':'dos','3':'tres','4':'cuatro','5':'cinco','6':'seis','7':'siete','8':'ocho','9':'nueve','10':'sota','11':'caballo','12':'rey'};
const ranks={'2':'doses','3':'treses','4':'cuatros','5':'cincos','6':'seises','7':'sietes','8':'ochos','9':'nueves','10':'sotas','11':'caballos','12':'reyes'};
export function speechText(speech){
 if(speech.kind==='pass')return 'Paso · me lo creo';
 if(speech.kind==='challenge')return '¡Mentiroso!';
 return `${speech.count} ${(speech.count===1?singular:ranks)[speech.rank]||`de valor ${speech.rank}`}`;
}
export function finishTableSpeech(app,view,name){
 if(view.boardKind!=='bluff'){contexts.delete(app);return;}
 const gameKey=`${view.id}:${view.players.join('|')}:${view.handNumber}`;
 if(!view.lastSpeech){contexts.set(app,{key:gameKey,signature:null,started:0});return;}
 const panel=app.querySelector('.catalog-screen .players-panel'),speech=view.lastSpeech,seat=[...panel.querySelectorAll('.rival-seat')].find(el=>el.dataset.playerId===speech.player);if(!seat)return;
 const key=`${view.id}:${view.players.join('|')}:${view.handNumber}`,signature=String(speech.sequence),previous=contexts.get(app),fresh=previous?.key===key&&previous.signature!==signature;
 const state=previous?.key===key&&previous.signature===signature?previous:{key,signature,started:performance.now()-(fresh?0:480)};contexts.set(app,state);
 const bubble=document.createElement('div');bubble.className='player-speech';bubble.dataset.speaker=speech.player;bubble.dataset.speechSequence=signature;bubble.setAttribute('role','status');bubble.setAttribute('aria-label',`${name(speech.player)} dice: ${speechText(speech)}`);bubble.textContent=speechText(speech);panel.append(bubble);
 const origin=panel.getBoundingClientRect(),token=seat.querySelector('.rival-token').getBoundingClientRect(),width=bubble.getBoundingClientRect().width,centre=token.x+token.width/2-origin.x,left=Math.max(2,Math.min(origin.width-width-2,centre-width/2));
 bubble.style.left=left+'px';bubble.style.top=token.bottom-origin.y-3+'px';bubble.style.setProperty('--speech-pointer',Math.max(12,Math.min(width-12,centre-left))+'px');
 const elapsed=performance.now()-state.started;
 if(elapsed<480&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const animation=bubble.animate([{opacity:0,transform:'translateY(8px) scale(.86)'},{opacity:1,transform:'translateY(-2px) scale(1.025)',offset:.72},{opacity:1,transform:'none'}],{duration:480,easing:'cubic-bezier(.2,.7,.3,1)'});animation.currentTime=elapsed;}
}
