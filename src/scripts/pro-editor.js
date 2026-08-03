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
  meta.before_after = collectBeforeAfter();
  meta.services = collectServices();
  return meta;
}

/** Servicios del layout visual. Sin etiqueta, la fila no cuenta. */
function collectServices() {
  const rows = document.querySelectorAll('[data-service]');
  const out = [];
  rows.forEach((row) => {
    const label = row.querySelector('[data-svc-label]')?.value.trim();
    const icon = row.querySelector('[data-svc-icon]')?.value || 'estrella';
    if (label) out.push({ label, icon });
  });
  return out.length ? out : null;
}

// Dos botones de guardar: el del encabezado (escritorio) y el de la barra fija
// (móvil). El estado se escribe en ambos para que se vea desde donde se tocó.
const statusEls = ['save-status', 'save-status-mobile']
  .map((id) => document.getElementById(id))
  .filter(Boolean);
const setStatus = (txt) => statusEls.forEach((el) => (el.textContent = txt));
const iframe = document.getElementById('preview');

async function save() {
  setStatus('Guardando…');
  const creds = document.querySelector('[data-creds]').value.split('\n').map((s) => s.trim()).filter(Boolean);
  copy.proof.credentials = creds;

  const record = { ...collectMeta(), slug: SLUG, copy, copy_source: 'mixto' };
  try {
    const res = await fetch('/api/pro/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setStatus('Guardado ✓');
    localStorage.removeItem(LS_KEY);
    if (iframe) iframe.src = `/p/${SLUG}?v=0&t=${Date.now()}`;
    setTimeout(() => setStatus(''), 2500);
  } catch (e) {
    setStatus(`Error: ${e.message}`);
  }
}

['save-btn', 'save-btn-mobile'].forEach((id) =>
  document.getElementById(id)?.addEventListener('click', save)
);
document.getElementById('reload-preview')?.addEventListener('click', () => {
  if (iframe) iframe.src = `/p/${SLUG}?v=0&t=${Date.now()}`;
});

// Ctrl/Cmd+S guarda.
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
});

// ============================================================
// Subida de imágenes: comprime en el cliente a WebP y sube al bucket.
// ============================================================

/** Redimensiona a maxWidth y comprime a WebP q82. */
function compressImage(file, maxWidth = 1400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir'))),
        'image/webp',
        0.82
      );
    };
    img.onerror = () => reject(new Error('Imagen inválida'));
    img.src = url;
  });
}

async function uploadFile(file, statusEl) {
  if (statusEl) statusEl.textContent = 'Comprimiendo…';
  const blob = await compressImage(file);
  if (statusEl) statusEl.textContent = 'Subiendo…';
  const fd = new FormData();
  fd.append('file', new File([blob], 'imagen.webp', { type: 'image/webp' }));
  fd.append('folder', `pro-${SLUG}`);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const json = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error || 'Error subiendo');
  return json.url;
}

/** Pinta la miniatura de un contenedor [data-preview] a partir de una URL. */
function paintPreview(previewEl, clearBtn, url) {
  if (url) {
    previewEl.classList.remove('empty');
    previewEl.innerHTML = `<img src="${url}" alt="" />`;
    if (clearBtn) clearBtn.hidden = false;
  } else {
    previewEl.classList.add('empty');
    previewEl.innerHTML = '';
    if (clearBtn) clearBtn.hidden = true;
  }
}

/**
 * Conecta un campo de imagen: input file → comprime → sube → guarda la URL en el
 * input oculto y pinta la miniatura. `hidden` es el input que lleva la URL
 * (con data-meta para los principales, o sin él para antes/después).
 */
function wireImageField(root, hidden) {
  const file = root.querySelector('[data-file]');
  const preview = root.querySelector('[data-preview]');
  const clear = root.querySelector('[data-clear]');
  const status = root.querySelector('[data-status]');

  paintPreview(preview, clear, hidden.value);

  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    try {
      const url = await uploadFile(f, status);
      hidden.value = url;
      paintPreview(preview, clear, url);
      if (status) status.textContent = 'Listo ✓';
      scheduleAutosave();
      setTimeout(() => { if (status) status.textContent = ''; }, 2000);
    } catch (e) {
      if (status) status.textContent = `Error: ${e.message}`;
    } finally {
      file.value = '';
    }
  });

  if (clear) {
    clear.addEventListener('click', () => {
      hidden.value = '';
      paintPreview(preview, clear, '');
      scheduleAutosave();
    });
  }
}

// Campos principales (hero, historia, logo): el input oculto lleva data-meta.
document.querySelectorAll('[data-imgfield]').forEach((root) => {
  const hidden = root.querySelector('input[type="hidden"][data-meta]');
  if (hidden) wireImageField(root, hidden);
});

// ============================================================
// Antes / Después
// ============================================================
const baList = document.getElementById('ba-list');
const initialBA = JSON.parse(document.getElementById('ba-data').textContent || '[]');

function makeBAImg(labelText, url) {
  const wrap = document.createElement('div');
  wrap.className = 'imgfield';
  wrap.setAttribute('data-imgfield', '');
  wrap.innerHTML =
    `<span class="imgfield__label">${labelText}</span>` +
    `<input type="hidden" data-ba-url value="${url ? url.replace(/"/g, '&quot;') : ''}" />` +
    `<div class="imgfield__preview" data-preview></div>` +
    `<div class="imgfield__row">` +
      `<label class="imgfield__btn">Subir<input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif" hidden data-file /></label>` +
      `<button type="button" class="imgfield__clear" data-clear>Quitar</button>` +
    `</div>` +
    `<span class="imgfield__status" data-status></span>`;
  const hidden = wrap.querySelector('[data-ba-url]');
  wireImageField(wrap, hidden);
  return { wrap, hidden };
}

function addBARow(pair = { before: '', after: '', label: '' }) {
  const row = document.createElement('div');
  row.className = 'ba-row';
  row.setAttribute('data-ba-row', '');

  const imgs = document.createElement('div');
  imgs.className = 'ba-row__imgs';
  const before = makeBAImg('Antes', pair.before);
  const after = makeBAImg('Después', pair.after);
  before.hidden.setAttribute('data-ba-before', '');
  after.hidden.setAttribute('data-ba-after', '');
  imgs.append(before.wrap, after.wrap);

  const foot = document.createElement('div');
  foot.className = 'ba-row__foot';
  const label = document.createElement('input');
  label.setAttribute('data-ba-label', '');
  label.placeholder = 'Descripción opcional (ej: Blanqueamiento, 2 sesiones)';
  label.value = pair.label || '';
  label.addEventListener('input', scheduleAutosave);
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'ba-row__del';
  del.textContent = 'Eliminar par';
  del.addEventListener('click', () => { row.remove(); syncBAButton(); scheduleAutosave(); });
  foot.append(label, del);

  row.append(imgs, foot);
  baList.appendChild(row);
  syncBAButton();
}

/** Dos pares como techo: el tercero ya no suma prueba, solo alarga la página. */
const MAX_BA = 2;
const baAddBtn = document.getElementById('ba-add');

function syncBAButton() {
  baAddBtn.style.display =
    document.querySelectorAll('[data-ba-row]').length >= MAX_BA ? 'none' : '';
}

initialBA.slice(0, MAX_BA).forEach((p) => addBARow(p));
syncBAButton();
baAddBtn.addEventListener('click', () => {
  if (document.querySelectorAll('[data-ba-row]').length >= MAX_BA) return;
  addBARow();
});

/** Solo pares con ambas imágenes cargadas. */
function collectBeforeAfter() {
  const pairs = [];
  document.querySelectorAll('[data-ba-row]').forEach((row) => {
    const before = row.querySelector('[data-ba-before]')?.value.trim() || '';
    const after = row.querySelector('[data-ba-after]')?.value.trim() || '';
    const label = row.querySelector('[data-ba-label]')?.value.trim() || '';
    if (before && after) {
      const pair = { before, after };
      if (label) pair.label = label;
      pairs.push(pair);
    }
  });
  return pairs.slice(0, MAX_BA);
}
