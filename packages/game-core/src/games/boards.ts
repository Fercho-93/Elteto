import {buildDominoSet,shuffle} from '../deck';
import {Action,State,base,check,choices,finish,finishHand,integer,makeEngine,mapPlayers,next,note,publicView,random,requireTurn} from './shared';

type Tile={id:string;left:number;right:number};
function dominoDeal(s:State){s.stock=[];s.hands=mapPlayers(s.players,()=>[]);const tiles=shuffle(buildDominoSet(),()=>random(s));s.tiles=mapPlayers(s.players,()=>tiles.splice(0,7));s.chain=[];s.passes=0;s.phase='play';s.turn=(s.handNumber-1)%4;}
function dominoOptions(s:State,p:string){const out:any[]=[];for(const t of s.tiles[p] as Tile[]){if(!s.chain.length)out.push({label:`${t.left} · ${t.right}`,action:{type:'place',tile:t.id,side:'right'}});else for(const side of ['left','right']){const end=side==='left'?s.chain[0].left:s.chain[s.chain.length-1].right;if(t.left===end||t.right===end)out.push({label:`${t.left} · ${t.right} · ${side==='left'?'izquierda':'derecha'}`,action:{type:'place',tile:t.id,side}});}}return out.length?out:choices(['Pasar',{type:'pass'}]);}
function dominoEnd(s:State,seat?:number){const sums=[0,0];s.players.forEach((p,i)=>sums[i%2]+=(s.tiles[p] as Tile[]).reduce((n,t)=>n+t.left+t.right,0));let team=seat===undefined?(sums[0]===sums[1]?-1:sums[0]<sums[1]?0:1):seat%2;if(team>=0){for(let i=team;i<4;i+=2)s.scores[s.players[i]]+=sums[0]+sums[1];note(s,`Pareja ${team?'B':'A'}: +${sums[0]+sums[1]}.`);}else note(s,'Tranca empatada: nadie puntúa.');finishHand(s,team<0?undefined:s.players[team]);if(team>=0&&s.scores[s.players[team]]>=150)finish(s,s.players[team]);}
export const dominoEngine=makeEngine('domino',(p,seed)=>{const s=base('domino',p,seed);dominoDeal(s);return s;},(s,p,a)=>{
 requireTurn(s,p);if(s.phase==='result'){check(a.type==='next-hand');s.handNumber++;dominoDeal(s);return;}
 check(dominoOptions(s,p).some(o=>JSON.stringify(o.action)===JSON.stringify(a)),'Coloca una ficha que encaje.');
 if(a.type==='pass'){s.passes++;note(s,`${p} pasa.`);if(s.passes===4)dominoEnd(s);else next(s);return;}
 const i=s.tiles[p].findIndex((t:Tile)=>t.id===a.tile),tile={...s.tiles[p].splice(i,1)[0]};
 if(s.chain.length){const end=a.side==='left'?s.chain[0].left:s.chain[s.chain.length-1].right;if((a.side==='left'?tile.right:tile.left)!==end)[tile.left,tile.right]=[tile.right,tile.left];}
 if(a.side==='left')s.chain.unshift(tile);else s.chain.push(tile);s.passes=0;note(s,`${p}: ${tile.left} · ${tile.right}.`);
 if(!s.tiles[p].length)dominoEnd(s,s.turn);else next(s);
},(s,p)=>publicView(s,p,{boardKind:'domino',chain:s.chain,myTiles:s.tiles[p],handSizes:mapPlayers(s.players,id=>s.tiles[id].length),unit:'fichas',target:150,teamLabels:mapPlayers(s.players,(_,i)=>`Pareja ${i%2?'B':'A'}`),instruction:s.phase==='result'?'Mano terminada.':'Encaja una ficha en uno de los extremos.',options:s.players[s.turn]!==p||s.finished?[]:s.phase==='result'?choices(['Siguiente mano',{type:'next-hand'}]):dominoOptions(s,p)}));

const geese=[5,9,14,18,23,27,32,36,41,45,50,54,59];
export const ocaEngine=makeEngine('oca',(p,seed)=>{const s=base('oca',p,seed);s.positions=mapPlayers(p,()=>1);s.penalties=mapPlayers(p,()=>0);s.prison=null;s.roll=0;return s;},(s,p,a)=>{
 requireTurn(s,p);check(a.type==='roll');
 if(s.prison===p){note(s,`${p} espera en prisión.`);next(s);return;}
 if(s.penalties[p]>0){s.penalties[p]--;note(s,`${p} pierde turno (${s.penalties[p]} pendientes).`);next(s);return;}
 s.roll=1+Math.floor(random(s)*6);const old=s.positions[p];let at=old+s.roll;if(at>63)at=126-at;
 s.positions[p]=at;note(s,`${p}: ${s.roll} → ${at}.`);
 if(at===63){finish(s,p);return;}
 let repeat=false;
 if(geese.includes(at)){s.positions[p]=geese[geese.indexOf(at)+1]??63;repeat=true;}
 else if(at===6){s.positions[p]=12;}
 else if(at===26||at===53){s.positions[p]=at===26?53:26;}
 else if([19,31,42].includes(at))s.penalties[p]=2;
 else if(at===52){if(s.prison){s.positions[s.prison]=old;s.prison=null;}s.prison=p;}
 else if(at===58)s.positions[p]=1;
 const occupant=s.players.find(id=>id!==p&&s.positions[id]===s.positions[p]&&s.positions[p]!==1);if(occupant)s.positions[occupant]=old;
 if(s.positions[p]===63){finish(s,p);return;}if(!repeat)next(s);
},(s,p)=>publicView(s,p,{boardKind:'oca',positions:s.positions,penalties:s.penalties,prison:s.prison,roll:s.roll,unit:'casilla',handSizes:s.positions,instruction:s.prison===p?'Espera a que otro jugador llegue a prisión.':s.penalties[p]?`Pierdes ${s.penalties[p]} turno(s).`:'Llega al 63 con una tirada exacta.',options:!s.finished&&s.players[s.turn]===p?choices([s.prison===p||s.penalties[p]?'Pasar turno':'Tirar dado',{type:'roll'}]):[]}));

type Move={path:number[];captures:number[];kings:number};
const rc=(i:number)=>[Math.floor(i/8),i%8];
const cell=(r:number,c:number)=>r>=0&&r<8&&c>=0&&c<8?r*8+c:-1;
export function checkersMoves(board:number[],side:number):Move[]{
 const captures:Move[]=[],quiet:Move[]=[];
 function walk(at:number,piece:number,path:number[],taken:number[],kings:number){let advanced=false;const [r,c]=rc(at),directions=Math.abs(piece)===2?[-1,1]:[side===1?-1:1];
  for(const dr of directions)for(const dc of [-1,1]){let r2=r+dr,c2=c+dc,hit=-1;
   while(cell(r2,c2)>=0){const j=cell(r2,c2),v=j===path[0]?0:board[j];
    if(taken.includes(j))break;
    if(v){if(v*side>0||hit>=0)break;hit=j;}
    else if(hit>=0){advanced=true;walk(j,piece,[...path,j],[...taken,hit],kings+(Math.abs(board[hit])===2?1:0));if(Math.abs(piece)===1)break;}
    else if(Math.abs(piece)===1)break;
    if(Math.abs(piece)===1&&hit>=0){r2+=dr;c2+=dc;if(cell(r2,c2)>=0&&board[cell(r2,c2)]===0){advanced=true;walk(cell(r2,c2),piece,[...path,cell(r2,c2)],[...taken,hit],kings+(Math.abs(board[hit])===2?1:0));}break;}
    r2+=dr;c2+=dc;
   }
  }
  if(!advanced&&taken.length)captures.push({path,captures:taken,kings});
 }
 board.forEach((piece,i)=>{if(piece*side<=0)return;walk(i,piece,[i],[],0);const [r,c]=rc(i);for(const dr of Math.abs(piece)===2?[-1,1]:[side===1?-1:1])for(const dc of [-1,1])for(let k=1;k<8;k++){const j=cell(r+dr*k,c+dc*k);if(j<0||board[j])break;quiet.push({path:[i,j],captures:[],kings:0});if(Math.abs(piece)===1)break;}});
 if(!captures.length)return quiet;const most=Math.max(...captures.map(m=>m.captures.length)),quality=Math.max(...captures.filter(m=>m.captures.length===most).map(m=>m.kings));return captures.filter(m=>m.captures.length===most&&m.kings===quality);
}
function boardKey(s:State){return s.board.join(',')+':'+s.turn;}
export const checkersEngine=makeEngine('damas_espanolas',(p,seed)=>{const s=base('damas_espanolas',p,seed);s.board=Array.from({length:64},(_,i)=>(Math.floor(i/8)+i%8)%2===0?(i<24?-1:i>=40?1:0):0);s.quiet=0;s.endgame=0;s.repetitions={[boardKey(s)]:1};s.drawOffer=null;return s;},(s,p,a)=>{
 if(a.type==='accept-draw'){check(s.drawOffer&&s.drawOffer!==p);finish(s);return;}
 requireTurn(s,p);if(a.type==='offer-draw'){check(s.drawOffer!==p);s.drawOffer=p;return;}
 check(a.type==='move'&&Array.isArray(a.path));const move=checkersMoves(s.board,s.turn===0?1:-1).find(m=>m.path.join(',')===a.path.join(','));check(move,'Debes realizar una jugada legal y completar todas las capturas.');
 const from=move.path[0],to=move.path[move.path.length-1],piece=s.board[from];s.board[from]=0;move.captures.forEach(i=>s.board[i]=0);s.board[to]=(piece===1&&to<8)||(piece===-1&&to>=56)?piece*2:piece;s.quiet=move.captures.length||Math.abs(piece)===1?0:s.quiet+1;s.drawOffer=null;note(s,`${p}: ${from+1} → ${to+1}${move.captures.length?` · ${move.captures.length} capturas`:''}.`);next(s);
 if(!checkersMoves(s.board,s.turn===0?1:-1).length){finish(s,p);return;}
 const key=boardKey(s);s.repetitions[key]=(s.repetitions[key]||0)+1;
 const pieces=s.board.filter((n:number)=>n),white=pieces.filter((n:number)=>n===2).length,black=pieces.filter((n:number)=>n===-2).length;
 const endgame=pieces.length===4&&((white===3&&black===1)||(white===1&&black===3))&&s.board.some((n:number,i:number)=>n===(white===3?2:-2)&&Math.floor(i/8)===i%8);
 s.endgame=endgame?s.endgame+1:0;if(s.quiet>=40||s.repetitions[key]>=3||s.endgame>=26)finish(s);
},(s,p)=>{const mine=s.players[s.turn]===p,moves=mine&&!s.finished?checkersMoves(s.board,s.turn===0?1:-1):[];return publicView(s,p,{boardKind:'checkers',board:s.board,moves,unit:'fichas',handSizes:mapPlayers(s.players,(_,i)=>s.board.filter((n:number)=>n*(i===0?1:-1)>0).length),instruction:moves.some(m=>m.captures.length)?'Captura obligatoria: selecciona el recorrido.':'Selecciona una ficha y su destino.',options:s.finished?[]:[...(mine&&!s.drawOffer?choices(['Ofrecer tablas',{type:'offer-draw'}]):[]),...(s.drawOffer&&s.drawOffer!==p?choices(['Aceptar tablas',{type:'accept-draw'}]):[])]});});
