/* Comportamiento cliente compartido de todos los demos. Vanilla JS, sin frameworks. */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nf = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 });

/* ============================================================
   1. Animaciones de entrada (.rise) con stagger por data-stagger
   ============================================================ */
function setupRise() {
  const els = document.querySelectorAll('.rise');
  if (!els.length) return;
  if (reducedMotion) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseInt(el.dataset.stagger || '0', 10);
        setTimeout(() => el.classList.add('in'), delay);
        io.unobserve(el);
      });
    },
    { threshold: 0.1 }
  );
  els.forEach((el) => io.observe(el));
}

/* ============================================================
   2. Conversor BCV: countup del monto en Bs + toggle USD/Bs
   ============================================================ */
function setupBcv() {
  const prices = document.querySelectorAll('[data-bcv-price]');
  if (!prices.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const bsEl = el.querySelector('[data-bs-target]');
        if (!bsEl) return;
        const target = parseFloat(bsEl.dataset.bsTarget);
        if (!isFinite(target)) return;
        if (reducedMotion) {
          bsEl.textContent = 'Bs ' + nf.format(target);
          return;
        }
        const start = performance.now();
        const duration = 700;
        function tick(now) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          bsEl.textContent = 'Bs ' + nf.format(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.3 }
  );

  prices.forEach((el) => {
    io.observe(el);

    // Toggle USD <-> Bs como valor principal al tocar el precio
    const main = el.querySelector('[data-bcv-main]');
    if (!main) return;
    main.addEventListener('click', (e) => {
      // Dentro de una tarjeta el precio vive en un <a>: el toggle no debe navegar.
      e.preventDefault();
      e.stopPropagation();
      const usd = parseFloat(el.dataset.usd);
      const rate = parseFloat(el.dataset.rate);
      if (!isFinite(usd) || !isFinite(rate)) return;
      const showingUsd = el.dataset.showing !== 'bs';
      if (showingUsd) {
        main.textContent = 'Bs ' + nf.format(Math.round(usd * rate));
        el.dataset.showing = 'bs';
      } else {
        main.textContent = '$ ' + nf.format(usd);
        el.dataset.showing = 'usd';
      }
    });
  });
}

/* ============================================================
   3. Barra de cierre TiendaPana: aparece al 60% de scroll
   ============================================================ */
function setupClosingBar() {
  const bar = document.getElementById('tp-closing-bar');
  if (!bar) return;
  let shown = false;
  function check() {
    if (shown) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    if (window.scrollY / scrollable >= 0.6) {
      shown = true;
      bar.classList.add('visible');
      window.removeEventListener('scroll', check);
    }
  }
  window.addEventListener('scroll', check, { passive: true });
  check();
}

/* ============================================================
   4. Menú móvil
   ============================================================ */
function setupMobileMenu() {
  const btn = document.getElementById('menu-toggle');
  const panel = document.getElementById('mobile-menu');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const open = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(!open));
  });
}

/* ============================================================
   5. Filtros del buscador (100% cliente, sobre el grid cargado)
   ============================================================ */
function setupSearch() {
  const form = document.getElementById('search-bar');
  const grid = document.getElementById('property-grid');
  if (!form || !grid) return;
  const cards = Array.from(grid.querySelectorAll('[data-property]'));
  const empty = document.getElementById('search-empty');

  // Genérico entre nichos: cada <select> declara data-attr (clave del dataset
  // de la tarjeta) y data-mode: eq (igualdad), max (tope numérico), min (mínimo numérico).
  function apply() {
    const filters = Array.from(form.querySelectorAll('select[data-attr]'))
      .map((sel) => ({ attr: sel.dataset.attr, mode: sel.dataset.mode || 'eq', value: sel.value }))
      .filter((f) => f.value !== '');

    let visible = 0;
    cards.forEach((card) => {
      const d = card.dataset;
      const ok = filters.every((f) => {
        if (f.mode === 'max') return parseFloat(d[f.attr] || '0') <= parseFloat(f.value);
        if (f.mode === 'min') return parseFloat(d[f.attr] || '0') >= parseFloat(f.value);
        return d[f.attr] === f.value;
      });
      card.classList.toggle('hidden', !ok);
      if (ok) visible++;
    });
    if (empty) empty.classList.toggle('hidden', visible > 0);
  }

  form.querySelectorAll('select').forEach((s) => s.addEventListener('change', apply));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    apply();
  });
  const reset = document.getElementById('search-reset');
  if (reset) {
    reset.addEventListener('click', () => {
      form.querySelectorAll('select').forEach((s) => (s.value = ''));
      apply();
    });
  }
}

/* ============================================================
   6. Galería del detalle: miniaturas + lightbox con swipe
   ============================================================ */
function setupGallery() {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;
  const mainImg = gallery.querySelector('#gallery-main img');
  const thumbs = Array.from(gallery.querySelectorAll('[data-thumb]'));
  const urls = thumbs.length ? thumbs.map((t) => t.dataset.thumb) : [mainImg.src];
  let current = 0;

  thumbs.forEach((t, i) => {
    t.addEventListener('click', () => {
      current = i;
      mainImg.src = urls[i];
      thumbs.forEach((x, j) => x.classList.toggle('ring-2', j === i));
    });
  });

  // Lightbox
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const lbImg = lb.querySelector('img');

  function openLb(i) {
    current = i;
    lbImg.src = urls[current];
    lb.classList.remove('hidden');
    lb.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    lb.classList.add('hidden');
    lb.classList.remove('flex');
    document.body.style.overflow = '';
  }
  function step(dir) {
    current = (current + dir + urls.length) % urls.length;
    lbImg.src = urls[current];
  }

  gallery.querySelector('#gallery-main').addEventListener('click', () => openLb(current));
  lb.querySelector('[data-lb-close]').addEventListener('click', closeLb);
  lb.querySelector('[data-lb-prev]').addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
  lb.querySelector('[data-lb-next]').addEventListener('click', (e) => { e.stopPropagation(); step(1); });
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLb();
  });
  document.addEventListener('keydown', (e) => {
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  // Swipe en móvil
  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) step(dx > 0 ? -1 : 1);
    touchX = null;
  }, { passive: true });
}

setupRise();
setupBcv();
setupClosingBar();
setupMobileMenu();
setupSearch();
setupGallery();
