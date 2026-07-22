/**
 * Interacciones de la landing de profesional. Vanilla, sin dependencias.
 * Respeta prefers-reduced-motion: si está activo, no anima nada.
 */
window.__proClientLoaded = true;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal al scroll: 24px de subida, una sola vez por elemento.
const reveals = document.querySelectorAll('.reveal');
const revealAll = () => reveals.forEach((el) => el.classList.add('in'));

if (reduced || !('IntersectionObserver' in window)) {
  revealAll();
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  );
  reveals.forEach((el) => io.observe(el));

  // Failsafe: nada puede quedar invisible. Si el observer no dispara por lo que
  // sea, a los 1.2 s se revela todo. En un navegador normal el observer gana.
  setTimeout(revealAll, 1200);
}

// Los cupos disponibles pulsan suave al entrar en viewport.
if (!reduced && 'IntersectionObserver' in window) {
  const pulseIo = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('pulse');
          pulseIo.unobserve(e.target);
        }
      }
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll('[data-pulse]').forEach((el) => pulseIo.observe(el));
}

// CTA persistente: aparece pasado el 25% de scroll. Barra TiendaPana: pasado el 60%.
const stickyCta = document.querySelector('.sticky-cta');
const tpBar = document.querySelector('.tp-bar');
const hero = document.querySelector('[data-section="hero"]');

function onScroll() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? window.scrollY / max : 0;

  const tpShown = pct >= 0.6;
  if (stickyCta) {
    // No taparse con el hero: solo desde que el hero salió de vista.
    const heroGone = hero ? hero.getBoundingClientRect().bottom < 0 : pct > 0.25;
    stickyCta.classList.toggle('show', pct >= 0.25 && heroGone && pct < 0.97);
    // Sube sobre la barra TiendaPana cuando ambas están visibles. La altura
    // real se mide para no depender de un valor fijo (cambia con safe-area).
    if (tpShown && tpBar) {
      stickyCta.style.setProperty('--tp-height', `${tpBar.offsetHeight}px`);
    }
    stickyCta.classList.toggle('above-tp', tpShown);
  }
  if (tpBar) {
    tpBar.classList.toggle('show', tpShown);
  }
}

let ticking = false;
window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);
onScroll();
