// Reglamento propio de cada juego, escrito en datos y cargado solo cuando alguien lo abre.
// Formato de cada archivo: ver rulebooks/README.md.
const loaders = {
  'cinquillo': () => import('./cinquillo.js'),
  'mus': () => import('./mus.js'),
  'texas-holdem': () => import('./texas-holdem.js'),
  'parchis': () => import('./parchis.js'),
  'damas-espanolas': () => import('./damas-espanolas.js'),
  'oca': () => import('./oca.js'),
  'brisca': () => import('./brisca.js'),
  'tute': () => import('./tute.js'),
  'chinchon': () => import('./chinchon.js'),
  'escoba': () => import('./escoba.js'),
  'pocha': () => import('./pocha.js'),
  'julepe': () => import('./julepe.js'),
  'guinote': () => import('./guinote.js'),
  'butifarra': () => import('./butifarra.js'),
  'remigio': () => import('./remigio.js'),
  'continental': () => import('./continental.js'),
  'siete-y-medio': () => import('./siete-y-medio.js'),
  'burro': () => import('./burro.js'),
  'mentiroso': () => import('./mentiroso.js'),
  'domino': () => import('./domino.js'),
};
export const RULEBOOK_IDS = Object.keys(loaders);
export async function loadRulebook(id) {
  const load = loaders[String(id).replace(/_/g, '-')];
  if (!load) throw new Error('Este juego todavía no tiene reglamento.');
  return (await load()).default;
}
