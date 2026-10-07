import { AnyEngine } from './engine';
import { canPlaceCinquillo } from './games/cinquillo';
import { captures15 } from './games/social-cards';
import { analyzeMelds, meldGroups, meldValue } from './games/melds';

export type BotPlayer = { id: string; name: string; isHost: false; isBot: true };
export const BOT_IDS = Array.from({length: 7}, (_, i) => `bot-${i + 1}`);
const CONTRACTS = [[2,0],[1,1],[0,2],[3,0],[2,1],[1,2],[0,3]];

// Keep combinations that belong to this hand's contract, including promising pairs.
function contractPotential(hand: any[], handNumber: number): number {
  const groups = meldGroups(hand, 'continental').map(g => ({cards:g.cards, kind:g.kind, value:100 + g.cards.length}));
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) {
    const a = hand[i], b = hand[j];
    if (a.suit === 'joker' || b.suit === 'joker') continue;
    if (a.rank === b.rank) groups.push({cards:[a,b],kind:'set',value:10});
    const distance = Math.abs(ranks.indexOf(a.rank) - ranks.indexOf(b.rank));
    if (a.suit === b.suit && distance && Math.min(distance,13-distance) <= 3) groups.push({cards:[a,b],kind:'run',value:10});
  }
  const memo = new Map<string,number>();
  const candidates = groups.map(g => ({...g, mask:g.cards.reduce((n,c) => n | (1 << hand.findIndex(x => x.id === c.id)),0)}));
  const search = (sets: number, runs: number, used: number): number => {
    const key = `${sets}/${runs}/${used}`;
    if (memo.has(key)) return memo.get(key)!;
    let best = 0;
    for (const g of candidates) {
      if ((g.mask & used) || (g.kind === 'set' ? !sets : !runs)) continue;
      best = Math.max(best,g.value + search(sets - (g.kind === 'set' ? 1 : 0),runs - (g.kind === 'run' ? 1 : 0),used | g.mask));
    }
    memo.set(key,best);return best;
  };
  const [sets,runs] = CONTRACTS[handNumber - 1];
  return search(sets,runs,0) + hand.filter(c => c.suit === 'joker').length * 30;
}
export function fillBotSeats(players: {id: string}[], maxPlayers: number): BotPlayer[] {
  return BOT_IDS.filter(id => !players.some(p => p.id === id)).slice(0, Math.max(0, maxPlayers - players.length))
    .map(id => ({id, name: `IA ${id.slice(4)}`, isHost: false, isBot: true}));
}

// Deliberately receives only a player's redacted view, never the host state or deck.
export function chooseBotAction(engine: AnyEngine, v: any, playerId: string, random = Math.random): any | null {
  if (v.finished) return null;
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  const hand = v.myHand || [];
  if (engine.id === 'mus' && v.phase === 'discard') {
    if (!v.awaitingDiscardFrom.includes(playerId)) return null;
    const card = hand.find((c: any) => !['1','3','12'].includes(c.rank)) || hand[0];
    return {type: 'discard', cards: [card]};
  }
  if (v.turnPlayer !== playerId) return null;
  if (engine.id === 'cinquillo') {
    if (v.handWinner) return {type: 'next-hand'};
    const cards = hand.filter((c: any) => canPlaceCinquillo(v.table, c, v.ruleset));
    return cards.length ? {type: 'play', card: pick(cards)} : {type: 'pass'};
  }
  if (engine.id === 'mus') {
    if (v.phase === 'showdown') return {type: 'next-hand'};
    if (v.phase === 'mus') return {type: 'mus', wantsMus: false};
    return v.betting?.pendingBet ? {type: 'accept'} : {type: 'pass'};
  }
  if (engine.id === 'parchis') {
    if (['start','roll'].includes(v.phase)) return {type: 'roll'};
    const moves = v.legalMoves || [];
    return moves.length ? {type: 'move', piece: pick<any>(moves).piece} : null;
  }
  if (v.validCards?.length) return {type: 'play', card: pick(v.validCards)};
  if (v.moves?.length) return {type: 'move', path: pick<any>(v.moves).path};
  if (engine.id === 'escoba' && v.phase === 'play') {
    const moves = hand.flatMap((c: any) => {
      const value = Number(c.rank) > 7 ? Number(c.rank) - 2 : Number(c.rank);
      const captures = captures15(v.table, 15 - value);
      return (captures.length ? captures : [[]]).map(table => ({type: 'capture', card: c.id, table}));
    });
    return moves.sort((a: any, b: any) => b.table.length - a.table.length)[0];
  }
  if (engine.id === 'mentiroso') {
    if (v.phase === 'respond') return {type: random() < .12 ? 'challenge' : 'trust'};
    const rank = v.rankOptions.includes(hand[0].rank) ? hand[0].rank : pick(v.rankOptions);
    const honest = hand.filter((c: any) => c.rank === rank || c.rank === '1');
    return {type: 'play-facedown', cards: (honest.length ? honest : [hand[0]]).map((c: any) => c.id), rank};
  }
  if (engine.id === 'julepe' && v.phase === 'discard') return {type: 'discard', cards: hand.slice(5).map((c: any) => c.id)};
  const options = (v.options || []).map((o: any) => o.action);
  const action = (type: string) => options.find((a: any) => a.type === type);
  if (engine.id === 'texas-holdem' && v.phase !== 'result') {
    if (action('all-in') && random() < .13) return action('all-in');
    return action('check') || action('call') || action('all-in') || action('fold');
  }
  if (engine.id === 'siete-y-medio' && !['bet','result'].includes(v.phase)) return (v.total < 5 && action('hit')) || action('stand');
  if (['chinchon','remigio','continental'].includes(engine.id)) {
    const id = engine.id;
    const needsContract = id === 'continental' && !v.exposed[playerId]?.length;
    if (v.phase === 'draw') {
      if (v.discard) {
        if (needsContract && contractPotential([...hand,v.discard],v.handNumber) > contractPotential(hand,v.handNumber)) return {type:'draw',source:'discard'};
        const before = analyzeMelds(hand, id).points;
        if (!needsContract && analyzeMelds([...hand, v.discard], id).points < before) return {type:'draw',source:'discard'};
      }
      return {type:'draw',source:'stock'};
    }
    if (v.phase === 'discard') {
      if (id === 'continental' && action('meld')) {
        const groups = meldGroups(hand, id);
        const search = (sets: number, runs: number, used: string[]): string[] | null => {
          if (!sets && !runs) return used;
          const kind = sets ? 'set' : 'run';
          for (const g of groups) {
            if (g.kind !== kind || g.cards.some(c => used.includes(c.id))) continue;
            const found = search(sets - (kind === 'set' ? 1 : 0), runs - (kind === 'run' ? 1 : 0), [...used, ...g.cards.map(c => c.id)]);
            if (found) return found;
          }
          return null;
        };
        const [sets, runs] = CONTRACTS[v.handNumber - 1];
        const cards = search(sets, runs, []);
        if (cards) return {type:'meld',cards};
      }
      if (action('extend')) return action('extend');
      const candidates = hand.map((c: any) => {
        const rest = hand.filter((x: any) => x.id !== c.id);
        return {card:c, analysis:analyzeMelds(rest,id), potential:needsContract ? contractPotential(rest,v.handNumber) : 0};
      }).sort((a: any,b: any) => b.potential - a.potential || a.analysis.points - b.analysis.points || meldValue(b.card,id) - meldValue(a.card,id));
      const best = candidates[0];
      if (id !== 'continental' && best.analysis.points <= (id === 'chinchon' ? 5 : 0)) return {type:'close',card:best.card.id};
      // Occasionally change plans so recycled decks do not repeat the same hands forever.
      return {type:'discard',card:random() < .1 ? pick<any>(hand).id : best.card.id};
    }
    if (['show','layoff'].includes(v.phase)) return action('extend') || action('continue');
    if (v.phase === 'claim') return action('continue');
  }
  const safe = options.filter((a: any) => !a.selection && !a.singleCard && !['offer-draw','declare-capote','take-pinta','replace-joker'].includes(a.type));
  return safe.length ? pick(safe) : null;
}

export function nextBotMove(engine: AnyEngine, state: any, botIds: string[], random = Math.random) {
  if (!state || engine.isOver(state)) return null;
  for (const playerId of botIds) {
    const action = chooseBotAction(engine, engine.view(state, playerId), playerId, random);
    if (action) return {playerId, action};
  }
  return null;
}

export const botTurnDelay=(gameId:string)=>gameId==='oca'?5200:['parchis','damas_espanolas','damas-espanolas'].includes(gameId)?3600:gameId==='mentiroso'?2900:2400;

// One delayed move at a time. The host can resume from the saved state.
export class BotRunner {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  constructor(private next: () => ReturnType<typeof nextBotMove>, private apply: (move: NonNullable<ReturnType<typeof nextBotMove>>) => unknown | Promise<unknown>, private onError: (error: unknown) => void, private delay: number | (() => number) = 2400) {}
  schedule() {
    if (this.timer) return;
    const generation = this.generation;
    this.timer = setTimeout(async () => {
      this.timer = null;
      try {
        const move = this.next();
        if (!move) return;
        await this.apply(move);
        if (generation === this.generation) this.schedule();
      } catch (error) { this.onError(error); }
    }, typeof this.delay === 'function' ? this.delay() : this.delay);
  }
  stop() { this.generation++; if (this.timer) clearTimeout(this.timer); this.timer = null; }
}
