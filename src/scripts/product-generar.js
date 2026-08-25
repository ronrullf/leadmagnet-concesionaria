const SITE_URL = JSON.parse(document.getElementById('site-url').textContent) || location.origin;

const form = document.getElementById('gen-form');
const btn = document.getElementById('gen-btn');
const status = document.getElementById('gen-status');
const report = document.getElementById('report');

// ---------- Pegar datos ----------
const FORMAT = [
  'Producto:',
  'Empresa:',
  'Nicho:',
  'Ciudad:',
  'Precio USD:',
  'WhatsApp:',
  'Instagram:',
  'Detalles:',
  'Qué venden:',
  'Garantía:',
].join('\n');

const FIELD_MAP = {
  'producto': 'product_name',
  'empresa': 'business_name',
  'nicho': 'niche_key',
  'ciudad': 'city',
  'precio usd': 'price_usd', 'precio': 'price_usd',
  'whatsapp': 'whatsapp_e164',
  'instagram': 'instagram_handle',
  'detalles': 'instagram_bio',
  'qué venden': 'what_they_sell', 'que venden': 'what_they_sell',
  'garantía': 'guarantee_info', 'garantia': 'guarantee_info',
};

document.getElementById('copy-format').addEventListener('click', async (e) => {
  await navigator.clipboard.writeText(FORMAT);
  const b = e.target;
  const o = b.textContent; b.textContent = '✓ Copiado';
  setTimeout(() => (b.textContent = o), 1500);
});

document.getElementById('toggle-paste').addEventListener('click', () => {
  document.getElementById('paste-box').classList.toggle('hidden');
});

document.getElementById('paste-apply').addEventListener('click', () => {
  const text = document.getElementById('paste-area').value;
  let filled = 0;

  for (const rawLine of text.split('\n')) {
    const idx = rawLine.indexOf(':');
    if (idx === -1) continue;
    const key = rawLine.slice(0, idx).trim().toLowerCase();
    const val = rawLine.slice(idx + 1).trim();
    if (!val) continue;

    const field = FIELD_MAP[key];
    if (!field) continue;
    const el = form.elements[field];
    if (el) {
      el.value = field === 'instagram_handle' ? val.replace(/^@/, '') : val;
      filled++;
    }
  }

  document.getElementById('paste-status').textContent = filled
    ? `${filled} campo(s) llenados. Revisa y genera.`
    : 'No se reconoció ningún campo. ¿Usaste el formato copiado?';
});

// ---------- Progreso ----------
const progress = document.getElementById('progress');
const bar = document.getElementById('progress-bar');
const pct = document.getElementById('progress-pct');
const label = document.getElementById('progress-label');
const steps = document.getElementById('progress-steps');

const BLOCKS = [
  { key: 'A', name: 'Hero, especificaciones y problema' },
  { key: 'B', name: 'Proceso de compra, garantía, FAQ y cierre' },
];

function warnBeforeUnload(e) {
  e.preventDefault();
  e.returnValue = '';
  return '';
}

function showProgress() {
  progress.classList.remove('hidden');
  progress.style.display = 'grid';
  document.body.style.overflow = 'hidden';
  window.addEventListener('beforeunload', warnBeforeUnload);
}

function hideProgress() {
  progress.classList.add('hidden');
  progress.style.display = '';
  document.body.style.overflow = '';
  window.removeEventListener('beforeunload', warnBeforeUnload);
}

function setProgress(done, current) {
  showProgress();
  const p = Math.round((done / BLOCKS.length) * 100);
  bar.style.width = `${p}%`;
  pct.textContent = `${p}%`;
  label.textContent = current ? `Generando ${current}…` : 'Listo';
  steps.innerHTML = BLOCKS.map((b, i) => {
    const done_ = i < done;
    const active = i === done && current;
    const state = done_ ? '✓' : active ? '⏳' : '·';
    const cls = done_ ? 'text-green-700 font-medium' : active ? 'text-ink font-semibold' : '';
    return `<li class="${cls}">${state} ${b.name}</li>`;
  }).join('');
}

let generated = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const input = {
    product_name: fd.get('product_name'),
    business_name: fd.get('business_name'),
    niche_key: fd.get('niche_key'),
    city: fd.get('city'),
    price_usd: fd.get('price_usd') ? Number(fd.get('price_usd')) : null,
    instagram_handle: fd.get('instagram_handle'),
    instagram_bio: fd.get('instagram_bio'),
    what_they_sell: fd.get('what_they_sell'),
    guarantee_info: fd.get('guarantee_info'),
  };

  btn.disabled = true;
  status.textContent = '';
  report.classList.add('hidden');
  setProgress(0, BLOCKS[0].name);

  const copy = {};
  const previous = {};
  const attempts = {};
  const failed = [];
  const t0 = Date.now();

  for (let i = 0; i < BLOCKS.length; i++) {
    const b = BLOCKS[i];
    setProgress(i, b.name);
    try {
      const res = await fetch('/api/product/generate-copy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, block: b.key, previous }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      attempts[b.key] = data.attempts ?? 1;
      if (data.data) {
        Object.assign(copy, data.data);
        Object.assign(previous, data.data);
      } else {
        failed.push(b.key);
      }
    } catch (err) {
      failed.push(b.key);
      attempts[b.key] = 3;
    }
  }

  const previewCta = document.getElementById('cta-preview')?.textContent.trim();
  if (previewCta && copy.hero?.cta) {
    copy.hero.cta.texto = previewCta;
  }

  setProgress(BLOCKS.length, null);
  await new Promise((r) => setTimeout(r, 450));
  hideProgress();

  generated = { input, copy, failed };
  renderReport(failed, attempts, ((Date.now() - t0) / 1000).toFixed(0));
  btn.disabled = false;
});

function renderReport(failed, attempts, secs) {
  status.textContent = `Listo en ${secs} s.`;
  const badges = BLOCKS.map((b) => {
    const ok = !failed.includes(b.key);
    return `<span class="num rounded-[4px] px-2 py-0.5 text-[0.75rem] font-semibold ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${b.key}</span>`;
  }).join(' ');

  report.innerHTML = `
    <div class="grid gap-4">
      <div class="flex items-center gap-2"><span class="text-sm font-medium">Bloques:</span> ${badges}</div>
      ${failed.length ? `<p class="text-sm text-amber-800">Fallaron ${failed.join(', ')} — esas ranuras irán vacías y las escribes a mano en el editor.</p>` : '<p class="text-sm text-green-700">Todos los bloques se generaron con éxito.</p>'}
      <div class="flex flex-wrap items-center gap-3 pt-2">
        <button id="save-btn" class="rounded-[4px] bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white">Guardar y editar →</button>
        <span id="save-status" class="text-sm text-ink-soft"></span>
      </div>
      <div id="link-box"></div>
    </div>`;
  report.classList.remove('hidden');
  document.getElementById('save-btn').addEventListener('click', saveDraft);
}

async function saveDraft() {
  const saveStatus = document.getElementById('save-status');
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveStatus.textContent = 'Guardando…';

  const i = generated.input;
  const record = {
    product_name: i.product_name, business_name: i.business_name, niche_key: i.niche_key,
    city: i.city, instagram_handle: i.instagram_handle, price_usd: i.price_usd,
    guarantee_info: i.guarantee_info,
    whatsapp_e164: form.elements['whatsapp_e164'].value,
    mood: form.elements['mood'].value,
    accent_hex: (form.elements['accent_hex']?.value || '').trim() || null,
    bg_hex: (form.elements['bg_hex']?.value || '').trim() || null,
    text_hex: (form.elements['text_hex']?.value || '').trim() || null,
    copy: generated.copy, copy_source: 'ia', is_active: false,
    notes: 'Generado con IA. Falta revisión, imágenes y especificaciones.',
  };

  const res = await fetch('/api/product/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
  });
  const data = await res.json();
  if (!res.ok) { saveStatus.textContent = `Error: ${data.error}`; saveBtn.disabled = false; return; }

  saveStatus.textContent = 'Guardado ✓ (borrador, aún no público)';
  const link = `${SITE_URL}/producto/${data.slug}`;
  document.getElementById('link-box').innerHTML = `
    <div class="mt-3 rounded-[6px] border border-line bg-paper-alt p-3">
      <p class="mb-2 text-[0.75rem] font-medium text-ink-soft">Tu link de producto:</p>
      <div class="flex flex-wrap items-center gap-2">
        <input readonly value="${link}" class="num flex-1 min-w-[220px] rounded-[4px] border border-line bg-white px-2 py-1.5 text-sm" />
        <a href="${link}" target="_blank" rel="noopener" class="rounded-[4px] bg-ink px-3 py-1.5 text-[0.75rem] font-semibold text-white">Abrir ↗</a>
        <button type="button" id="copy-link" class="rounded-[4px] border border-line px-3 py-1.5 text-[0.75rem] font-semibold">Copiar link</button>
        <a href="/admin/producto/${data.slug}/editar" class="rounded-[4px] bg-[#F97316] px-3 py-1.5 text-[0.75rem] font-semibold text-white">Ir al editor →</a>
      </div>
    </div>`;
  document.getElementById('copy-link').addEventListener('click', async (e) => {
    await navigator.clipboard.writeText(link);
    const o = e.target.textContent; e.target.textContent = '✓ Copiado';
    setTimeout(() => (e.target.textContent = o), 1500);
  });
}
