/**
 * Editor de ranuras con preview en vivo.
 *
 * Construye los campos desde la estructura del copy, así que agregar una ranura
 * al schema no obliga a tocar aquí más que el mapa de abajo. Contador por campo,
 * autoguardado a localStorage, guardado a Supabase y recarga del preview.
 */
const copy = JSON.parse(document.getElementById('copy-data').textContent);
const LIMITS = JSON.parse(document.getElementById('slot-limits').textContent);
const SLUG = window.__PRO_SLUG__;
const LS_KEY = `pro-editor:${SLUG}`;

// Mapa de secciones → ranuras. El orden es el del esqueleto persuasivo.
const SECTIONS = [
  { title: 'S1 · Hero', fields: [
    ['hero.callout', 'Callout', 'area'],
    ['hero.headline', 'Headline', 'area'],
    ['hero.subheadline', 'Subheadline', 'area'],
    ['hero.cta_label', 'CTA (se repite en toda la página)', 'input'],
  ]},
  { title: 'S3 · Calificación', list: 'qualify.yes', label: 'Para ti si…', limit: 'qualify.yes' },
  { title: 'S3 · Calificación (no)', list: 'qualify.no', label: 'No es para ti si…', limit: 'qualify.no' },
  { title: 'S4 · Historia', fields: [
    ['story.backstory', 'Dónde estaba', 'area'],
    ['story.wall', 'El muro', 'area'],
    ['story.epiphany', 'La epifanía', 'area'],
    ['story.plan', 'El plan', 'area'],
    ['story.result', 'El resultado (con número)', 'area'],
  ]},
  { title: 'S5 · Nueva Oportunidad', fields: [
    ['opportunity.name', 'Nombre del método', 'input'],
    ['opportunity.old_way', 'Lo viejo', 'area'],
    ['opportunity.new_way', 'Lo nuevo', 'area'],
    ['opportunity.why_different', 'Por qué es distinto', 'area'],
  ]},
  { title: 'S6 · Los Tres Secretos', objList: 'secrets', itemFields: [
    ['title', 'Objeción', 'area'], ['body', 'Cuerpo', 'area'], ['proof', 'Prueba', 'area'],
  ], limits: { title: 'secrets[].title', body: 'secrets[].body', proof: 'secrets[].proof' } },
  { title: 'S7 · El Stack', fields: [
    ['offer.program_name', 'Nombre del programa', 'input'],
    ['offer.total_label', 'Ancla de valor total', 'area'],
    ['offer.price_display', 'Precio (vacío = null)', 'input'],
  ], objList: 'offer.items', itemFields: [
    ['title', 'Título', 'input'], ['description', 'Descripción', 'area'], ['value_label', 'Valor', 'input'],
  ], limits: { title: 'offer.items[].title', description: 'offer.items[].description', value_label: 'offer.items[].value_label' } },
  { title: 'S8 · Testimonios (muestra)', objList: 'proof.testimonials', itemFields: [
    ['quote', 'Cita (experiencia, nunca resultado)', 'area'], ['author', 'Autor', 'input'], ['context', 'Contexto', 'input'],
  ], limits: { quote: 'proof.testimonials[].quote', author: '', context: 'proof.testimonials[].context' } },
  { title: 'S8 · Métricas (muestra)', objList: 'proof.metrics', itemFields: [
    ['number', 'Número', 'input'], ['label', 'Etiqueta', 'input'],
  ], limits: {} },
  { title: 'S9 · Costo de no actuar', fields: [['inaction.headline', 'Titular', 'area'], ['inaction.close', 'Cierre', 'area']],
    list: 'inaction.items', label: 'Costos cuantificados', limit: 'inaction.items' },
  { title: 'S10 · Garantía', fields: [['guarantee.title', 'Título', 'input'], ['guarantee.body', 'Cuerpo (integridad, no resultado)', 'area']] },
  { title: 'S10 · FAQ', objList: 'faqs', itemFields: [['q', 'Pregunta', 'area'], ['a', 'Respuesta', 'area']], limits: {} },
  { title: 'S11 · Cierre', fields: [['closing.headline', 'Titular', 'area']] },
];

const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), copy);
const set = (path, val) => {
  const keys = path.split('.');
  const last = keys.pop();
  const obj = keys.reduce((o, k) => (o[k] ??= {}), copy);
  obj[last] = val;
};

const container = document.getElementById('copy-fields');

function fieldEl(path, label, kind, limitKey) {
  const limit = LIMITS[limitKey ?? path];
  const wrap = document.createElement('div');
  wrap.className = 'slot-field';
  const top = document.createElement('div');
  top.className = 'slot-field__top';
  const lab = document.createElement('span');
  lab.className = 'slot-field__label';
  lab.textContent = label;
  top.appendChild(lab);
  let count;
  if (limit) {
    count = document.createElement('span');
    count.className = 'slot-field__count';
    top.appendChild(count);
  }
  wrap.appendChild(top);

  const input = kind === 'input' ? document.createElement('input') : document.createElement('textarea');
  if (kind !== 'input') input.rows = 2;
  input.value = getValue(path);
  const update = () => {
    setValue(path, input.value);
    if (count) {
      count.textContent = `${input.value.length}/${limit}`;
      count.classList.toggle('over', input.value.length > limit);
    }
    scheduleAutosave();
  };
  input.addEventListener('input', update);
  wrap.appendChild(input);
  if (count) { count.textContent = `${input.value.length}/${limit}`; count.classList.toggle('over', input.value.length > limit); }
  return wrap;
}

// getValue/setValue soportan índices tipo secrets.0.title
function getValue(path) {
  return path.split('.').reduce((o, k) => (o == null ? '' : o[k]), copy) ?? '';
}
function setValue(path, val) {
  const keys = path.split('.');
  const last = keys.pop();
  const obj = keys.reduce((o, k) => (o[k] ??= {}), copy);
  obj[last] = val;
}

for (const sec of SECTIONS) {
  const det = document.createElement('details');
  det.className = 'sec';
  const sum = document.createElement('summary');
  sum.className = 'sec__h';
  sum.textContent = sec.title;
  det.appendChild(sum);
  const body = document.createElement('div');
  body.className = 'sec__b';
  body.style.display = 'grid';
  body.style.gap = '10px';

  if (sec.fields) {
    for (const [path, label, kind] of sec.fields) body.appendChild(fieldEl(path, label, kind));
  }
  if (sec.list) {
    const arr = get(sec.list) ?? [];
    arr.forEach((_, i) => body.appendChild(fieldEl(`${sec.list}.${i}`, `${sec.label} ${i + 1}`, 'area', sec.limit)));
  }
  if (sec.objList) {
    const arr = get(sec.objList) ?? [];
    arr.forEach((_, i) => {
      const card = document.createElement('div');
      card.style.border = '1px solid #EEE';
      card.style.borderRadius = '6px';
      card.style.padding = '10px';
      card.style.display = 'grid';
      card.style.gap = '8px';
      const h = document.createElement('div');
      h.style.fontSize = '11px'; h.style.color = '#888'; h.style.fontWeight = '600';
      h.textContent = `#${i + 1}`;
      card.appendChild(h);
      for (const [key, label, kind] of sec.itemFields) {
        card.appendChild(fieldEl(`${sec.objList}.${i}.${key}`, label, kind, sec.limits?.[key]));
      }
      body.appendChild(card);
    });
  }

  det.appendChild(body);
  container.appendChild(det);
}

// ---------- Autoguardado a localStorage ----------
let autosaveTimer = null;
function scheduleAutosave() {
  if (autosaveTimer) return;
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ copy, meta: collectMeta(), at: Date.now() }));
    } catch {}
  }, 1500);
}

// Borrador local sin guardar: se ofrece con un banner, nunca con un confirm()
// bloqueante en carga. Fernando decide si restaura o descarta.
try {
  const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  if (saved?.copy) {
    const when = saved.at ? new Date(saved.at).toLocaleTimeString('es-VE') : '';
    const bar = document.createElement('div');
    bar.style.cssText =
      'position:sticky;top:0;z-index:20;background:#FEF3C7;border:1px solid #FCD34D;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;display:flex;gap:12px;align-items:center;justify-content:space-between';
    bar.innerHTML =
      `<span>Hay un borrador local sin guardar${when ? ` (${when})` : ''}.</span>` +
      `<span><button id="draft-restore" style="text-decoration:underline;font-weight:600">Restaurar</button> · <button id="draft-discard" style="text-decoration:underline">Descartar</button></span>`;
    document.querySelector('main')?.prepend(bar);
    bar.querySelector('#draft-restore').addEventListener('click', () => {
      Object.assign(copy, saved.copy);
      localStorage.removeItem(LS_KEY);
      location.reload();
    });
    bar.querySelector('#draft-discard').addEventListener('click', () => {
      localStorage.removeItem(LS_KEY);
      bar.remove();
    });
  }
} catch {}

// ---------- Recolección y guardado ----------
function collectMeta() {
  const meta = {};
  document.querySelectorAll('[data-meta]').forEach((el) => {
    const key = el.getAttribute('data-meta');
    let v = el.value.trim();
    if (['followers', 'monthly_capacity', 'slots_remaining'].includes(key)) {
      meta[key] = v ? Number(v) : null;
    } else {
      meta[key] = v || null;
    }
  });
  const slotsEl = document.querySelector('[data-meta-json="slots"]');
  if (slotsEl) {
    try { meta.slots = JSON.parse(slotsEl.value || '[]'); } catch { meta.slots = null; }
  }
  return meta;
}

const saveStatus = document.getElementById('save-status');
const iframe = document.getElementById('preview');

async function save() {
  saveStatus.textContent = 'Guardando…';
  const creds = document.querySelector('[data-creds]').value.split('\n').map((s) => s.trim()).filter(Boolean);
  copy.proof.credentials = creds;

  const record = { ...collectMeta(), slug: SLUG, copy, copy_source: 'mixto' };
  try {
    const res = await fetch('/api/pro/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    saveStatus.textContent = 'Guardado ✓';
    localStorage.removeItem(LS_KEY);
    iframe.src = `/p/${SLUG}?v=0&t=${Date.now()}`;
    setTimeout(() => (saveStatus.textContent = ''), 2500);
  } catch (e) {
    saveStatus.textContent = `Error: ${e.message}`;
  }
}

document.getElementById('save-btn').addEventListener('click', save);
document.getElementById('reload-preview').addEventListener('click', () => {
  iframe.src = `/p/${SLUG}?v=0&t=${Date.now()}`;
});

// Ctrl/Cmd+S guarda.
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
});
