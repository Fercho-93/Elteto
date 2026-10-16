// Un único "volver" para todo Elteto: el botón visible, el gesto o botón atrás de Android,
// el deslizamiento desde el borde en iPhone y el botón atrás del navegador hacen lo mismo.
// Mientras haya algo a lo que volver dentro de la app (un diálogo abierto o una pantalla
// que no es la principal) dejamos una entrada "guardia" en el historial. Al consumirla
// resolvemos la vuelta dentro de Elteto en lugar de abandonar la página.
const GUARD = 'eltetoBack';
const EDGE = 24, SWIPE = 72;

export function installBackNavigation({ resolve }) {
  let guarded = history.state?.[GUARD] === true, silentPops = 0, queued = false;
  const openDialog = () => [...document.querySelectorAll('dialog[open]')].at(-1) || null;
  const step = () => {
    const dialog = openDialog();
    return dialog ? () => dialog.close() : resolve();
  };
  function sync() {
    queued = false;
    const needed = Boolean(step());
    if (needed && !guarded) { history.pushState({ [GUARD]: true }, '', location.href); guarded = true; }
    else if (!needed && guarded) { guarded = false; silentPops++; history.back(); }
  }
  const schedule = () => { if (!queued) { queued = true; queueMicrotask(sync); } };
  function back() {
    const run = step();
    if (!run) return false;
    run();
    schedule();
    return true;
  }
  addEventListener('popstate', () => {
    const onGuard = history.state?.[GUARD] === true;
    if (silentPops && !onGuard) { silentPops--; return; }
    guarded = onGuard;
    if (!onGuard) back();
    schedule();
  });
  // Las pantallas se pintan con innerHTML y los diálogos se abren desde varios módulos:
  // observar ambos cambios mantiene la guardia al día sin tocar cada render.
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app'), { childList: true });
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  // En iPhone, una web añadida a la pantalla de inicio no tiene gesto de volver del sistema.
  if (navigator.standalone === true) installEdgeSwipe(back, () => Boolean(step()));
  window.EltetoNav = { back, canGoBack: () => Boolean(step()) };
  schedule();
  return window.EltetoNav;
}

function installEdgeSwipe(back, canGoBack) {
  let start = null;
  const hint = document.createElement('div');
  hint.className = 'edge-back-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = '←';
  document.body.append(hint);
  const reset = () => { start = null; hint.classList.remove('active', 'ready'); hint.style.removeProperty('--pull'); };
  addEventListener('touchstart', event => {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || touch.clientX > EDGE || !canGoBack()) return;
    start = { x: touch.clientX, y: touch.clientY, id: touch.identifier, dx: 0 };
  }, { passive: true });
  addEventListener('touchmove', event => {
    if (!start) return;
    const touch = [...event.touches].find(item => item.identifier === start.id);
    if (!touch) return;
    const dx = touch.clientX - start.x, dy = Math.abs(touch.clientY - start.y);
    if (dy > 24 && dy > dx) { reset(); return; }
    start.dx = dx;
    const pull = Math.max(0, Math.min(dx / SWIPE, 1));
    hint.style.setProperty('--pull', pull);
    hint.classList.toggle('active', dx > 8);
    hint.classList.toggle('ready', pull === 1);
  }, { passive: true });
  addEventListener('touchend', () => { if (start && start.dx >= SWIPE) back(); reset(); });
  addEventListener('touchcancel', reset);
}
