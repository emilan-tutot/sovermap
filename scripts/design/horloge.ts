// The virtual clock of the films and of the fixed images, installed in every page before its own scripts: each
// call of window.__avancer(ms) advances requestAnimationFrame, performance.now, CSS animations and transitions and
// view transitions by exactly ms, then waits two real frames, so that an image taken next shows that state.
export const HORLOGE = `
window.__name = (f) => f;
window.__sovermapQualiteFixe = true;
// Pointer moves handled by the page: each move of a drag is waited for before its image (Edge may otherwise merge two
// moves that arrive within the same real frame, and the film would show one step twice, then none).
window.__mouvements = 0;
window.addEventListener("pointermove", () => { window.__mouvements += 1; }, { capture: true, passive: true });
(() => {
  const rafReel = window.requestAnimationFrame.bind(window);
  const origine = performance.now();
  let virtuel = 0;
  const file = new Map();
  let suivant = 1;
  const maintenant = () => origine + virtuel;
  Object.defineProperty(performance, "now", { value: maintenant, configurable: true });
  window.requestAnimationFrame = (rappel) => { const id = suivant++; file.set(id, rappel); return id; };
  window.cancelAnimationFrame = (id) => { file.delete(id); };
  // Each CSS animation, transition or view transition is held and moved by hand, then finished properly at its end
  // (a paused animation never finishes: a view transition would stay over the page).
  const suivies = new WeakMap();
  window.__avancer = (ms) => {
    virtuel += ms;
    const appels = [...file.values()];
    file.clear();
    for (const rappel of appels) { try { rappel(maintenant()); } catch (e) { console.error(e); } }
    for (const a of document.getAnimations()) {
      if (a.playState === "finished") continue;
      let t = 0;
      if (!suivies.has(a)) { a.pause(); }
      else { t = suivies.get(a) + ms; }
      suivies.set(a, t);
      const fin = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
      if (Number.isFinite(fin) && t >= fin) a.finish();
      else a.currentTime = t;
    }
    // Two real frames: the state drawn above is on the surface when the image is taken.
    return new Promise((fin) => rafReel(() => rafReel(fin)));
  };
})();
`;
