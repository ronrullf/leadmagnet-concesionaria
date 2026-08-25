const copy = JSON.parse(document.getElementById('copy-data').textContent);
const LIMITS = JSON.parse(document.getElementById('slot-limits').textContent);
const SLUG = window.__PRODUCT_SLUG__;
const LS_KEY = `product-editor:${SLUG}`;

const SLOTS_MINIMOS = {
  'hero.badges': 3,
  'comoFunciona.pasos': 3,
  'incluye.items': 4,
  faq: 3,
  placeholders: 0,
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

const SECTIONS = [
  { title: '1 · Hero — lo primero que ve el comprador', fields: [
    ['hero.headline', 'Headline (máx 14 palabras · promesa de autonomía/resultado)', 'area'],
    ['hero.subheadline', 'Subheadline (explicación del dolor/solución)', 'area'],
    ['hero.visual.alt', 'Descripción de la foto/video hero', 'input'],
    ['hero.cta.texto', 'Texto del botón CTA', 'input'],
    ['hero.cta.mensaje', 'Mensaje precargado a SU WhatsApp', 'area'],
  ], list: 'hero.badges', label: 'Badge', limit: '' },

  { title: '2 · Franja de prueba o satisfacción', fields: [
    ['franjaPrueba.estrellas', 'Estrellas (vacío = no se muestra)', 'input'],
    ['franjaPrueba.resenas', 'Cantidad de clientes satisfechos', 'input'],
    ['franjaPrueba.etiqueta', 'Etiqueta ("+350 plantas instaladas")', 'input'],
  ]},

  { title: '4 · El problema / dolor — apagones o fallas', fields: [
    ['problema.headline', 'Titular del problema', 'area'],
    ['problema.parrafo', 'Párrafo que cuantifica el costo de no actuar', 'area'],
  ]},

  { title: '5 · Cómo funciona / Proceso de compra o instalación', fields: [
    ['comoFunciona.headline', 'Titular del proceso', 'area'],
  ], objList: 'comoFunciona.pasos', itemFields: [
    ['titulo', 'Título del paso', 'input'], ['texto', 'Detalle', 'area'],
  ], limits: {} },

  { title: '6 · Qué incluye la compra / entregables', fields: [
    ['incluye.headline', 'Titular de entregables', 'area'],
  ], list: 'incluye.items', label: 'Ítem', limit: '' },

  { title: '7 · Riesgo cero y garantía escrita', fields: [
    ['riesgo.headline', 'Titular de garantía', 'input'],
    ['riesgo.texto', 'Detalle de garantía y servicio técnico', 'area'],
  ]},

  { title: '8 · Quién lo vende / Respaldo de la empresa', fields: [
    ['profesional.bio', 'Bio / Reseña de la empresa distribuidora', 'area'],
  ]},

  { title: '9 · Preguntas Frecuentes', objList: 'faq', itemFields: [
    ['pregunta', 'Pregunta', 'area'],
    ['respuesta', 'Respuesta', 'area'],
  ], limits: {} },

  { title: '10 · Cierre de la página', fields: [
    ['cierre.headline', 'Titular final de urgencia/decisión', 'area'],
    ['cierre.cta.texto', 'Texto del botón final', 'input'],
    ['cierre.cta.mensaje', 'Mensaje precargado final', 'area'],
  ]},
];

const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), copy);
const set = (path, val) => {
  const keys = path.split('.');
  const last = keys.pop();
  const obj = keys.reduce((o, k) => (o[k] ??= {}), copy);
  obj[last] = val;
};

const saveIndicator = document.getElementById('save-indicator');
const saveAlert = document.getElementById('save-alert');
const btnSave = document.getElementById('btn-save');
const iframe = document.getElementById('preview-iframe');

function scheduleAutosave() {
  saveIndicator.textContent = 'Guardando…';
  try {
    const data = collectFormData();
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    saveIndicator.textContent = 'Borrador guardado localmente';
  } catch {
    saveIndicator.textContent = 'Error al autoguardar';
  }
}

function collectFormData() {
  const record = {};
  document.querySelectorAll('[data-meta]').forEach((el) => {
    const name = el.getAttribute('data-meta');
    record[name] = el.value;
  });

  document.querySelectorAll('[data-slot]').forEach((el) => {
    const path = el.getAttribute('data-slot');
    set(path, el.value);
  });

  record.copy = copy;
  record.muro_pruebas = collectMuroPruebas();
  return record;
}

// Renderizar formulario de slots
const container = document.getElementById('slots-container');

SECTIONS.forEach((sec) => {
  const details = document.createElement('details');
  details.open = true;
  details.className = 'sec';
  const summary = document.createElement('summary');
  summary.className = 'sec__h';
  summary.textContent = sec.title;
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'sec__b grid gap-3';

  if (sec.fields) {
    sec.fields.forEach(([path, label, type]) => {
      const wrap = document.createElement('div');
      wrap.className = 'f';
      const lbl = document.createElement('span');
      lbl.textContent = label;
      wrap.appendChild(lbl);

      const val = get(path) ?? '';
      const input = type === 'area' ? document.createElement('textarea') : document.createElement('input');
      if (type === 'area') input.rows = 2;
      input.setAttribute('data-slot', path);
      input.value = val;
      input.addEventListener('input', scheduleAutosave);
      wrap.appendChild(input);
      body.appendChild(wrap);
    });
  }

  if (sec.list) {
    const arr = get(sec.list) || [];
    const listWrap = document.createElement('div');
    listWrap.className = 'grid gap-2';

    arr.forEach((item, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'f';
      const lbl = document.createElement('span');
      lbl.textContent = `${sec.label} ${idx + 1}`;
      wrap.appendChild(lbl);
      const input = document.createElement('input');
      input.setAttribute('data-slot', `${sec.list}.${idx}`);
      input.value = item || '';
      input.addEventListener('input', scheduleAutosave);
      wrap.appendChild(input);
      listWrap.appendChild(wrap);
    });
    body.appendChild(listWrap);
  }

  if (sec.objList) {
    const arr = get(sec.objList) || [];
    const listWrap = document.createElement('div');
    listWrap.className = 'grid gap-3';

    arr.forEach((itemObj, idx) => {
      const box = document.createElement('div');
      box.className = 'rounded-[6px] border border-line p-3 bg-paper-alt grid gap-2';
      sec.itemFields.forEach(([subKey, subLabel, type]) => {
        const wrap = document.createElement('div');
        wrap.className = 'f';
        const lbl = document.createElement('span');
        lbl.textContent = `${subLabel} (${idx + 1})`;
        wrap.appendChild(lbl);
        const input = type === 'area' ? document.createElement('textarea') : document.createElement('input');
        if (type === 'area') input.rows = 2;
        input.setAttribute('data-slot', `${sec.objList}.${idx}.${subKey}`);
        input.value = itemObj[subKey] || '';
        input.addEventListener('input', scheduleAutosave);
        wrap.appendChild(input);
        box.appendChild(wrap);
      });
      listWrap.appendChild(box);
    });
    body.appendChild(listWrap);
  }

  details.appendChild(body);
  container.appendChild(details);
});

// Guardado principal
btnSave?.addEventListener('click', async () => {
  btnSave.disabled = true;
  saveIndicator.textContent = 'Guardando en servidor…';
  saveAlert.innerHTML = '';
  saveAlert.className = 'problemas';

  const record = collectFormData();
  try {
    const res = await fetch('/api/product/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    const data = await res.json();
    if (!res.ok) {
      saveAlert.innerHTML = `<p><strong>Error:</strong> ${data.error}</p>${data.problemas ? `<ul>${data.problemas.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}`;
      saveIndicator.textContent = 'Error al guardar';
      btnSave.disabled = false;
      return;
    }

    saveAlert.className = 'problemas problemas--ok';
    saveAlert.innerHTML = '<p>✓ Cambios guardados correctamente.</p>';
    saveIndicator.textContent = 'Guardado ✓';
    localStorage.removeItem(LS_KEY);

    if (iframe) iframe.src = iframe.src;
  } catch (err) {
    saveIndicator.textContent = 'Error de conexión';
  }
  btnSave.disabled = false;
});

// Recargar iframe
document.getElementById('btn-reload-iframe')?.addEventListener('click', () => {
  if (iframe) iframe.src = iframe.src;
});

// Muro de pruebas
const muroList = document.getElementById('muro-list');
const initialMuro = JSON.parse(document.getElementById('muro-data').textContent || '[]');
const muroAddBtn = document.getElementById('muro-add');
const muroCount = document.getElementById('muro-count');

function addPruebaRow(p = {}) {
  const row = document.createElement('div');
  row.className = 'prueba-card border border-line p-3 rounded-[6px] grid gap-2 bg-paper-alt';
  row.setAttribute('data-prueba-row', '');

  row.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="font-bold text-xs" data-prueba-num>Prueba</span>
      <button type="button" class="text-xs text-red-600 underline" data-del>Eliminar</button>
    </div>
    <div class="grid gap-2 sm:grid-cols-2">
      <label class="f"><span>Tipo</span>
        <select data-p-tipo class="pf__input">
          <option value="resena" ${p.tipo === 'resena' ? 'selected' : ''}>Reseña de cliente</option>
          <option value="foto" ${p.tipo === 'foto' ? 'selected' : ''}>Foto de instalación</option>
          <option value="comentario" ${p.tipo === 'comentario' ? 'selected' : ''}>Comentario</option>
        </select>
      </label>
      <label class="f"><span>Fuente</span>
        <select data-p-fuente class="pf__input">
          <option value="google" ${p.fuente === 'google' ? 'selected' : ''}>Google</option>
          <option value="instagram" ${p.fuente === 'instagram' ? 'selected' : ''}>Instagram</option>
          <option value="otra" ${p.fuente === 'otra' ? 'selected' : ''}>Otra</option>
        </select>
      </label>
    </div>
    <label class="f"><span>Texto / Opinión</span>
      <textarea data-p-texto rows="2" class="pf__input" placeholder="Excelente planta eléctrica, soportó los 2 aires...">${p.texto || ''}</textarea>
    </label>
    <label class="f"><span>Autor / Cliente</span>
      <input data-p-autor class="pf__input" placeholder="Carlos M. (Valencia)" value="${p.autor || ''}" />
    </label>
  `;

  row.querySelector('[data-del]').addEventListener('click', () => { row.remove(); syncMuro(); scheduleAutosave(); });
  muroList.appendChild(row);
  syncMuro();
}

function syncMuro() {
  const filas = document.querySelectorAll('[data-prueba-row]');
  if (muroCount) muroCount.textContent = `${filas.length} prueba(s) (opcional)`;
}

function collectMuroPruebas() {
  const out = [];
  document.querySelectorAll('[data-prueba-row]').forEach((row) => {
    const texto = row.querySelector('[data-p-texto]')?.value.trim() || '';
    if (!texto) return;
    out.push({
      tipo: row.querySelector('[data-p-tipo]')?.value || 'resena',
      fuente: row.querySelector('[data-p-fuente]')?.value || 'google',
      texto,
      autor: row.querySelector('[data-p-autor]')?.value.trim() || '',
    });
  });
  return out;
}

initialMuro.forEach((p) => addPruebaRow(p));
muroAddBtn?.addEventListener('click', () => addPruebaRow());
