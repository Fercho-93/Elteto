// Transparent generated atlas. Measured row boundaries keep neighboring feet
// and steam puffs outside each avatar's window.
const WIDTH = 1983, HEIGHT = 793;
const ROW_SPLITS = [410, 402, 410, 410, 412];
export function renderAvatarArtwork(character, context = 'portrait') {
  const column = character % 5, x = column * WIDTH / 5;
  const y = character < 5 ? 0 : ROW_SPLITS[column];
  const width = WIDTH / 5, height = character < 5 ? ROW_SPLITS[column] : HEIGHT - y;
  const clip = `avatar-${context}-${character}`;
  return `<svg viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><image href="./assets/elteto-avatars-v3.png" width="${WIDTH}" height="${HEIGHT}" clip-path="url(#${clip})"/></svg>`;
}
