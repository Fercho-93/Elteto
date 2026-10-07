// Retain decoded deck images across synchronous table redraws, including WebKit.
// The pool contains only faces already rendered for this player's own public/private view.
const pools=new WeakMap();
const deckImages=app=>[...app.querySelectorAll('img')].filter(img=>img.src.includes('/assets/decks/'));
export function prepareCardPaint(app){
 const pool=pools.get(app)||new Map();
 const current=new Map();
 for(const img of deckImages(app)){if(img.complete&&!img.naturalWidth)continue;let faces=current.get(img.src);if(!faces){faces=[];current.set(img.src,faces);}faces.push(img);}
 // Prefer the exact faces already on screen over unused duplicates in the cache.
 for(const [url,faces] of current)pool.set(url,[...faces,...(pool.get(url)||[]).filter(img=>!faces.includes(img))]);
 return pool;
}
export function restoreCardPaint(app,pool){
 for(const image of deckImages(app)){
  image.decoding='sync';const previous=pool.get(image.src)?.shift();if(!previous||previous===image||previous.complete&&!previous.naturalWidth)continue;
  for(const attribute of [...previous.attributes])if(attribute.name!=='src'&&!image.hasAttribute(attribute.name))previous.removeAttribute(attribute.name);
  for(const attribute of image.attributes)if(attribute.name!=='src')previous.setAttribute(attribute.name,attribute.value);
  image.replaceWith(previous);
 }
 for(const [url,faces] of pool){for(const image of faces)image.remove();if(!faces.length)pool.delete(url);else pool.set(url,faces.slice(0,2));}
 pools.set(app,pool);
}
