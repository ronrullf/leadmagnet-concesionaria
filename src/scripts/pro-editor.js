/**
 * Editor de la landing-demo de outreach.
 *
 * Los campos se construyen desde el mapa de abajo, así que agregar una ranura
 * al schema no obliga a tocar el resto. Contador por campo, autoguardado a
 * localStorage, guardado a Supabase y recarga del preview.
 */
const copy = JSON.parse(document.getElementById('copy-data').textContent);
const LIMITS = JSON.parse(document.getElementById('slot-limits').textContent);
const SLUG = window.__PRO_SLUG__;
const LS_KEY = `pro-editor:${SLUG}`;

/**
 * Las listas se rellenan con ranuras vacías antes de pintar la UI. Sin esto,
 * un copy que la IA devolvió corto no deja dónde escribir a mano lo que falta,
 * y las validaciones duras (3 badges, 4 pruebas) serían imposibles de cumplir.
 */
const SLOTS_MINIMOS = {
  'hero.badges': 3,
  'comoFunciona.pasos': 3,
  'incluye.items': 5,
  faq: 4,
  placeholders: 3,
};

function rellenarRanuras() {
  const vacio = { 'comoFunciona.pasos': { titulo: '', texto: '' },
                  faq: { pregunta: '', respuesta: '', origenComentario: '' } };
  for (const [path, min] of Object.entries(SLOTS_MINIMOS)) {
    const keys = path.split('.');
    const last = keys.pop();
    const obj = keys.reduce((o, k) => (o[k] ??= {}), copy);
    obj[last] = Array.isArray(obj[last]) ? obj[last] : [];
    while (obj[last].length < min) {
      obj[last].push(vacio[path] ? { ...vacio[path] } : '');
    }
  }
}
rellenarRanuras();

// Mapa de secciones → ranuras. El orden es el del blueprint de outreach.
const SECTIONS = [
  { title: '1 · Hero — lo único que él ve en 5 segundos', fields: [
    ['hero.headline', 'Headline (máx 12 palabras · el resultado que quieren SUS pacientes)', 'area'],
    ['hero.headlineOrigen', 'Caption suyo del que salió (trazabilidad)', 'area'],
    ['hero.subheadline', 'Subheadline (sin X, sin Y, sin Z)', 'area'],
    ['hero.visual.alt', 'Descripción del visual (accesibilidad)', 'input'],
    ['hero.cta.texto', 'Texto del botón (primera persona)', 'input'],
    ['hero.cta.mensaje', 'Mensaje precargado a SU WhatsApp', 'area'],
  ], list: 'hero.badges', label: 'Badge', limit: '' },

  { title: '2 · Franja de prueba — solo números verificables', fields: [
    ['franjaPrueba.estrellas', 'Estrellas en Google (vacío = no se muestra)', 'input'],
    ['franjaPrueba.resenas', 'Cantidad de reseñas', 'input'],
    ['franjaPrueba.etiqueta', 'Etiqueta ("8 años en Valencia")', 'input'],
  ]},

  { title: '4 · El problema — espejo del dolor del paciente', fields: [
    ['problema.headline', 'Titular', 'area'],
    ['problema.parrafo', 'Párrafo (máx 3 líneas)', 'area'],
  ]},

  { title: '5 · Cómo funciona — 3 o 4 pasos, jamás 5', fields: [
    ['comoFunciona.headline', 'Titular', 'area'],
  ], objList: 'comoFunciona.pasos', itemFields: [
    ['titulo', 'Título del paso', 'input'], ['texto', 'Detalle', 'area'],
  ], limits: {} },

  { title: '6 · Qué incluye', fields: [
    ['incluye.headline', 'Titular', 'area'],
  ], list: 'incluye.items', label: 'Ítem', limit: '' },

  { title: '7 · Riesgo cero — solo si él ya lo ofrece en público', fields: [
    ['riesgo.headline', 'Titular', 'input'],
    ['riesgo.texto', 'Texto', 'area'],
  ]},

  { title: '8 · Quién te atiende', fields: [
    ['profesional.bio', 'Bio (credencial pública, sin inventar)', 'area'],
  ]},

  { title: '9 · Preguntas — sacadas de comentarios reales', objList: 'faq', itemFields: [
    ['pregunta', 'Pregunta', 'area'],
    ['respuesta', 'Respuesta', 'area'],
    ['origenComentario', 'Comentario del que salió', 'area'],
  ], limits: {} },

  { title: '10 · Cierre — repite el headline del hero', fields: [
    ['cierre.headline', 'Titular', 'area'],
    ['cierre.cta.texto', 'Texto del botón', 'input'],
    ['cierre.cta.mensaje', 'Mensaje precargado', 'area'],
  ]},

  { title: 'Rótulos de placeholder — máximo 3', list: 'placeholders', label: 'Rótulo', limit: '' },
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
  meta.muro_pruebas = collectMuroPruebas();
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

async function save({ forzar = false } = {}) {
  setStatus('Guardando…');

  const record = { ...collectMeta(), slug: SLUG, copy, copy_source: 'mixto', forzar };
  try {
    const res = await fetch('/api/pro/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
    });
    const data = await res.json();

    // El servidor devuelve la lista de incumplimientos del estándar. Se pintan
    // siempre, incluso al guardar bien: son la checklist de lo que falta.
    renderProblemas(data.problemas ?? []);

    if (!res.ok) {
      // Un borrador a medio armar se puede guardar igual, pero avisando.
      if (data.problemas?.length) {
        setStatus('Falta cumplir el estándar — revisa la lista');
        return;
      }
      throw new Error(data.error || 'Error al guardar');
    }

    setStatus(data.problemas?.length ? 'Guardado como borrador ⚠' : 'Guardado ✓');
    localStorage.removeItem(LS_KEY);
    if (iframe) iframe.src = `/p/${SLUG}?v=0&t=${Date.now()}`;
    setTimeout(() => setStatus(''), 2800);
  } catch (e) {
    setStatus(`Error: ${e.message}`);
  }
}

/** Lista de incumplimientos del §8. Vacía = la landing cumple el estándar. */
function renderProblemas(problemas) {
  const box = document.getElementById('problemas');
  if (!box) return;
  if (!problemas.length) {
    box.className = 'problemas problemas--ok';
    box.innerHTML = '<strong>✓ Cumple el estándar de outreach.</strong>';
    return;
  }
  box.className = 'problemas';
  box.innerHTML =
    '<strong>Falta para cumplir el estándar:</strong><ul>' +
    problemas.map((p) => `<li>${p}</li>`).join('') +
    '</ul>';
}


['save-btn', 'save-btn-mobile'].forEach((id) =>
  document.getElementById(id)?.addEventListener('click', () => save())
);
document.getElementById('save-draft')?.addEventListener('click', () => save({ forzar: true }));
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
/* ============================================================
   Muro de pruebas
   Cada prueba exige FUENTE. Es la barrera contra el testimonio inventado:
   sin origen público no entra, porque atribuirle a un consultorio real una
   reseña que nadie escribió cuesta el prospecto y la reputación.
   ============================================================ */
const muroList = document.getElementById('muro-list');
const initialMuro = JSON.parse(document.getElementById('muro-data').textContent || '[]');
const MIN_PRUEBAS = 4;

const TIPOS = [['comentario', 'Comentario de Instagram'], ['resena', 'Reseña'], ['foto', 'Foto de resultado']];
const FUENTES = [['instagram', 'Instagram'], ['google', 'Google'], ['doctoralia', 'Doctoralia'], ['otra', 'Otra']];

function selectEl(attr, opciones, valor) {
  const sel = document.createElement('select');
  sel.setAttribute(attr, '');
  for (const [v, label] of opciones) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    if (v === valor) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', scheduleAutosave);
  return sel;
}

function addPruebaRow(p = {}) {
  const row = document.createElement('div');
  row.className = 'ba-row';
  row.setAttribute('data-prueba-row', '');

  const top = document.createElement('div');
  top.className = 'prueba-top';
  top.append(
    selectEl('data-p-tipo', TIPOS, p.tipo || 'comentario'),
    selectEl('data-p-fuente', FUENTES, p.fuente || 'instagram')
  );
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'ba-row__del';
  del.textContent = 'Eliminar';
  del.addEventListener('click', () => { row.remove(); syncMuro(); scheduleAutosave(); });
  top.appendChild(del);

  const mkInput = (attr, ph, val, tag = 'input') => {
    const el = document.createElement(tag);
    el.setAttribute(attr, '');
    el.placeholder = ph;
    el.value = val || '';
    if (tag === 'textarea') el.rows = 2;
    el.addEventListener('input', scheduleAutosave);
    return el;
  };

  const texto = mkInput('data-p-texto', 'Texto textual del comentario o reseña', p.texto, 'textarea');
  const autor = mkInput('data-p-autor', 'Autor como aparece público (@ana_r)', p.autor);
  const ctx = mkInput('data-p-contexto', 'Contexto de una línea: quién, qué problema, qué pasó', p.contexto);

  // Captura de pantalla o foto del resultado.
  const img = document.createElement('div');
  img.className = 'imgfield';
  img.setAttribute('data-imgfield', '');
  img.innerHTML =
    '<span class="imgfield__label">Captura / foto (opcional si hay texto)</span>' +
    `<input type="hidden" data-p-src value="${p.src ? String(p.src).replace(/"/g, '&quot;') : ''}" />` +
    '<div class="imgfield__preview" data-preview></div>' +
    '<div class="imgfield__row">' +
      '<label class="imgfield__btn">Subir<input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif" hidden data-file /></label>' +
      '<button type="button" class="imgfield__clear" data-clear>Quitar</button>' +
    '</div>' +
    '<span class="imgfield__status" data-status></span>';
  wireImageField(img, img.querySelector('[data-p-src]'));

  row.append(top, texto, autor, ctx, img);
  muroList.appendChild(row);
  syncMuro();
}

const muroAddBtn = document.getElementById('muro-add');
const muroCount = document.getElementById('muro-count');

function syncMuro() {
  const n = document.querySelectorAll('[data-prueba-row]').length;
  if (muroCount) {
    muroCount.textContent = `${n} de ${MIN_PRUEBAS} mínimas`;
    muroCount.classList.toggle('over', n < MIN_PRUEBAS);
  }
}

initialMuro.forEach((p) => addPruebaRow(p));
// Arranca con las cuatro ranuras mínimas para que el estándar sea alcanzable.
while (document.querySelectorAll('[data-prueba-row]').length < MIN_PRUEBAS) addPruebaRow();
muroAddBtn?.addEventListener('click', () => addPruebaRow());

/** Solo pruebas con fuente y con algo que mostrar. */
function collectMuroPruebas() {
  const out = [];
  document.querySelectorAll('[data-prueba-row]').forEach((row) => {
    const texto = row.querySelector('[data-p-texto]')?.value.trim() || '';
    const src = row.querySelector('[data-p-src]')?.value.trim() || '';
    if (!texto && !src) return;
    out.push({
      tipo: row.querySelector('[data-p-tipo]')?.value || 'comentario',
      fuente: row.querySelector('[data-p-fuente]')?.value || 'instagram',
      texto,
      src,
      autor: row.querySelector('[data-p-autor]')?.value.trim() || '',
      contexto: row.querySelector('[data-p-contexto]')?.value.trim() || '',
    });
  });
  return out;
}
