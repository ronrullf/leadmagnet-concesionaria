/**
 * Generador con IA: pegado de datos, generación bloque por bloque con barra de
 * progreso real, y link para abrir/copiar al terminar.
 *
 * La generación se hace en cuatro llamadas desde el cliente (A→B→C→D), cada una
 * con el contexto de las anteriores. Así la barra avanza de verdad — 25% por
 * bloque confirmado — en vez de fingir progreso mientras el servidor trabaja.
 */
const SITE_URL = JSON.parse(document.getElementById('site-url').textContent) || location.origin;

const form = document.getElementById('gen-form');
const btn = document.getElementById('gen-btn');
const status = document.getElementById('gen-status');
const report = document.getElementById('report');

// ---------- Pegar datos ----------
const FORMAT = [
  'Nombre:',
  'Título:',
  'Profesión:',
  'Ciudad:',
  'Instagram:',
  'Seguidores:',
  'WhatsApp:',
  'Bio:',
  'Caption 1:',
  'Caption 2:',
  'Caption 3:',
  'Qué vende:',
  'Cliente ideal:',
  'Credenciales:',
].join('\n');

// Cada etiqueta del formato → campo del formulario.
const FIELD_MAP = {
  'nombre': 'pro_name',
  'título': 'pro_title', 'titulo': 'pro_title',
  'profesión': 'profession_key', 'profesion': 'profession_key',
  'ciudad': 'city',
  'instagram': 'instagram_handle',
  'seguidores': 'followers',
  'whatsapp': 'whatsapp_e164',
  'bio': 'instagram_bio',
  'qué vende': 'what_they_sell', 'que vende': 'what_they_sell',
  'cliente ideal': 'ideal_customer',
  'credenciales': 'real_credentials',
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
  const captions = [];
  let filled = 0;

  for (const rawLine of text.split('\n')) {
    const idx = rawLine.indexOf(':');
    if (idx === -1) continue;
    const key = rawLine.slice(0, idx).trim().toLowerCase();
    const val = rawLine.slice(idx + 1).trim();
    if (!val) continue;

    if (/^caption\s*\d*/.test(key)) { captions.push(val); continue; }
    const field = FIELD_MAP[key];
    if (!field) continue;
    const el = form.elements[field];
    if (el) {
      el.value = field === 'instagram_handle' ? val.replace(/^@/, '') : val;
      filled++;
    }
  }
  if (captions.length) { form.elements['captions'].value = captions.join('\n'); filled++; }

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
  { key: 'A', name: 'Núcleo (hero, calificación, oportunidad)' },
  { key: 'B', name: 'Narrativa (historia y secretos)' },
  { key: 'C', name: 'Oferta (stack, costo, garantía)' },
  { key: 'D', name: 'Prueba (testimonios, FAQ, cierre)' },
];

function setProgress(done, current) {
  progress.classList.remove('hidden');
  const p = Math.round((done / BLOCKS.length) * 100);
  bar.style.width = `${p}%`;
  pct.textContent = `${p}%`;
  label.textContent = current ? `Generando ${current}…` : 'Listo';
  steps.innerHTML = BLOCKS.map((b, i) => {
    const state = i < done ? '✓' : i === done && current ? '⏳' : '·';
    const cls = i < done ? 'text-green-700' : '';
    return `<li class="${cls}">${state} ${b.name}</li>`;
  }).join('');
}

// ---------- Generación bloque por bloque ----------
let generated = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const input = {
    pro_name: fd.get('pro_name'),
    pro_title: fd.get('pro_title'),
    profession_key: fd.get('profession_key'),
    profession_label: fd.get('profession_key'),
    city: fd.get('city'),
    instagram_handle: fd.get('instagram_handle'),
    followers: fd.get('followers') ? Number(fd.get('followers')) : null,
    instagram_bio: fd.get('instagram_bio'),
    captions: String(fd.get('captions') || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3),
    what_they_sell: fd.get('what_they_sell'),
    ideal_customer: fd.get('ideal_customer'),
    real_credentials: fd.get('real_credentials'),
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
      const res = await fetch('/api/generate-copy', {
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
  setProgress(BLOCKS.length, null);

  // Cierres que el modo completo hace en el servidor y aquí toca a mano:
  copy.proof = copy.proof || { credentials: [], testimonials: [], metrics: [] };
  copy.proof.credentials = []; // la IA nunca las genera
  if (copy.hero?.cta_label && copy.closing) copy.closing.cta_label = copy.hero.cta_label;

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
      ${failed.length ? `<p class="text-sm text-amber-800">Fallaron ${failed.join(', ')} — esas ranuras irán vacías y las escribes a mano en el editor.</p>` : '<p class="text-sm text-green-700">Los cuatro bloques salieron.</p>'}
      <div class="flex flex-wrap items-center gap-3 pt-2">
        <button id="save-btn" class="rounded-[4px] bg-ink px-5 py-2.5 text-sm font-semibold text-white">Guardar y editar →</button>
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
    pro_name: i.pro_name, pro_title: i.pro_title, profession_key: i.profession_key,
    city: i.city, instagram_handle: i.instagram_handle, followers: i.followers,
    whatsapp_e164: form.elements['whatsapp_e164'].value,
    mood: form.elements['mood'].value,
    copy: generated.copy, copy_source: 'ia', is_active: false,
    notes: 'Generado con IA. Falta revisión, fotos y cupos.',
  };
  const res = await fetch('/api/pro/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
  });
  const data = await res.json();
  if (!res.ok) { saveStatus.textContent = `Error: ${data.error}`; saveBtn.disabled = false; return; }

  saveStatus.textContent = 'Guardado ✓ (borrador, aún no público)';
  const link = `${SITE_URL}/p/${data.slug}`;
  document.getElementById('link-box').innerHTML = `
    <div class="rounded-[6px] border border-line bg-paper-alt p-3">
      <p class="mb-2 text-[0.75rem] font-medium text-ink-soft">Tu link (solo tú lo ves hasta activarlo):</p>
      <div class="flex flex-wrap items-center gap-2">
        <input readonly value="${link}" class="num flex-1 min-w-[220px] rounded-[4px] border border-line bg-white px-2 py-1.5 text-sm" />
        <a href="${link}" target="_blank" rel="noopener" class="rounded-[4px] bg-ink px-3 py-1.5 text-[0.75rem] font-semibold text-white">Abrir ↗</a>
        <button type="button" id="copy-link" class="rounded-[4px] border border-line px-3 py-1.5 text-[0.75rem] font-semibold">Copiar link</button>
        <a href="/admin/pro/${data.slug}/editar" class="rounded-[4px] bg-[#F97316] px-3 py-1.5 text-[0.75rem] font-semibold text-white">Ir al editor →</a>
      </div>
    </div>`;
  document.getElementById('copy-link').addEventListener('click', async (e) => {
    await navigator.clipboard.writeText(link);
    const o = e.target.textContent; e.target.textContent = '✓ Copiado';
    setTimeout(() => (e.target.textContent = o), 1500);
  });
}
