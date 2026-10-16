import {escapeHtml as esc} from './table-view.js';
const stored=k=>{try{return localStorage.getItem(k);}catch{return null;}};
const save=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
export const pokerPrefs={sound:stored('elteto.pokerSound')==='1',blinds:stored('elteto.pokerBB')==='1'};
export function pokerStackText(n,view){return pokerPrefs.blinds?`${(n/view.bigBlindAmount).toLocaleString('es-ES',{maximumFractionDigits:1})} BB`:Number(n).toLocaleString('es-ES');}
export function pokerControls(view){
 let html=view.options.map((o,i)=>{const amount=o.action.amountInput;if(!amount)return `<button data-action="catalog-choice" data-index="${i}" class="poker-action poker-action-${o.action.type}">${esc(o.label)}</button>`;
 const verb=view.currentBet?'Subir':'Apostar';
 return `<div class="poker-bet-inline"><label class="poker-bet-field"><span>Hasta</span><input id="catalog-amount-${i}" data-poker-amount type="number" min="${amount.min}" max="${amount.max}" step="1" value="${amount.value}" inputmode="numeric" enterkeyhint="done" aria-describedby="poker-bet-hint-${i}"></label><button class="poker-action poker-action-raise" data-action="catalog-choice" data-index="${i}">${verb}</button><small class="poker-bet-hint" id="poker-bet-hint-${i}" data-poker-added="${i}" role="status"></small></div>`;}).join('');
 if(view.canShowCards)html+=`<button class="poker-action" data-action="catalog-poker-show">Enseñar cartas</button>`;
 return html;
}
// La cantidad es el total de tu apuesta en la ronda. Solo se acepta un entero dentro de lo que permiten las reglas
// (el mínimo y el máximo los calcula el motor); si no, el botón queda desactivado y se explica por qué.
export function pokerAmountState(input,view){
 const min=Number(input.min),max=Number(input.max),value=Number(input.value),valid=input.value.trim()!==''&&Number.isInteger(value)&&value>=min&&value<=max;
 const added=value-(view.street?.[view.playerId]||0);
 const message=valid?`Añades ${added.toLocaleString('es-ES')} fichas${value===max?' · todas tus fichas':''}`:`Escribe una cantidad entre ${min.toLocaleString('es-ES')} y ${max.toLocaleString('es-ES')}${value>max?' (tus fichas)':''}`;
 return {valid,message};
}
export function syncPokerAmounts(app,view){for(const input of app.querySelectorAll('[data-poker-amount]')){const index=input.id.split('-').at(-1),state=pokerAmountState(input,view),button=app.querySelector(`.poker-bet-inline [data-action="catalog-choice"][data-index="${index}"]`);if(button)button.disabled=!state.valid;const text=app.querySelector(`[data-poker-added="${index}"]`);if(text){text.textContent=state.message;text.classList.toggle('is-invalid',!state.valid);}input.setAttribute('aria-invalid',String(!state.valid));}}
let audio;
export function pokerSound(kind){if(!pokerPrefs.sound||document.visibilityState==='hidden')return;try{audio||=new (window.AudioContext||window.webkitAudioContext)();if(audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=kind==='win'?660:kind==='cards'?440:240;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.13);}catch{}}
export function handlePokerUI(app,button,view,send){
 const action=button.dataset.action;
   if(action==='catalog-choice'&&button.closest('.poker-bet-inline')){const input=app.querySelector('#catalog-amount-'+button.dataset.index);if(!input||!pokerAmountState(input,view).valid){syncPokerAmounts(app,view);return true;}}
 if(action==='poker-splash-continue'){const next=view.options.find(option=>option.action?.type==='next-hand');if(next)send({...next.action});return true;}
 if(action==='poker-splash-close'){app.pokerSplashClosed=`${view.handNumber}:${view.phase}`;app.querySelector('.poker-celebration')?.remove();return true;}
 if(action==='poker-sound-toggle'){pokerPrefs.sound=!pokerPrefs.sound;save('elteto.pokerSound',pokerPrefs.sound?'1':'0');button.setAttribute('aria-pressed',String(pokerPrefs.sound));button.textContent='Sonido: '+(pokerPrefs.sound?'activado':'desactivado');if(pokerPrefs.sound)try{audio||=new (window.AudioContext||window.webkitAudioContext)();void audio.resume().then(()=>pokerSound('cards'));}catch{}return true;}
 if(action==='poker-bb-toggle'){pokerPrefs.blinds=!pokerPrefs.blinds;save('elteto.pokerBB',pokerPrefs.blinds?'1':'0');button.textContent='Saldo: '+(pokerPrefs.blinds?'ciegas grandes':'fichas');for(const el of app.querySelectorAll('.poker-stack b'))el.textContent=pokerStackText(Number(el.closest('.poker-stack').dataset.chips),view);return true;}
 if(action==='poker-info'){const dialog=app.querySelector('.poker-player-info'),id=button.dataset.player;for(const entry of dialog.querySelectorAll('[data-info-player]'))entry.hidden=entry.dataset.infoPlayer!==id;dialog.showModal();return true;}
 if(action==='poker-info-close'){app.querySelector('.poker-player-info').close();return true;}
  if(action==='catalog-poker-select-show'){button.classList.toggle('is-selected');button.setAttribute('aria-pressed',String(button.classList.contains('is-selected')));return true;}
 if(action==='catalog-poker-show'){const cards=[...app.querySelectorAll('.catalog-hand .is-selected')].map(el=>el.dataset.cardId);send({type:'show-cards',cards:cards.length?cards:view.myHand.map(c=>c.id)});return true;}
 return false;
}
