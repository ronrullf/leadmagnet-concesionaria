/* Formulario de creación/edición de demos. Vanilla JS. */

const form = document.getElementById('demo-form');
if (form) initForm();

function initForm() {
  const initial = JSON.parse(document.getElementById('initial-data').textContent);
  // Compatibilidad: versiones previas serializaban "properties"
  initial.items = initial.items ?? initial.properties ?? [];
  const list = document.getElementById('properties-list');
  const propertyTemplate = document.getElementById('property-template');
  const vehicleTemplate = document.getElementById('vehicle-template');
  const MAX_PROPERTIES = 6;
  const MAX_IMAGES = 6;

  /* ============ Vertical (inmobiliaria / concesionario) ============ */
  const verticalSelect = form.querySelector('[name=vertical]');

  function currentVertical() {
    return verticalSelect.value === 'concesionario' ? 'concesionario' : 'inmobiliaria';
  }
  function currentTemplate() {
    return currentVertical() === 'concesionario' ? vehicleTemplate : propertyTemplate;
  }
  function refreshVerticalLabels() {
    const isV = currentVertical() === 'concesionario';
    const label = document.querySelector('[data-items-label]');
    if (label) label.textContent = isV ? 'Vehículos' : 'Inmuebles';
    document.getElementById('add-property').textContent = isV ? '+ Agregar vehículo' : '+ Agregar inmueble';
  }

  verticalSelect.addEventListener('change', () => {
    // Cambiar de nicho invalida los bloques ya cargados: se reinicia el repetidor.
    const hasBlocks = list.querySelectorAll('.property-item').length > 0;
    if (hasBlocks && !confirm('Cambiar el tipo de negocio vacía los ítems cargados. ¿Continuar?')) {
      verticalSelect.value = currentVertical() === 'concesionario' ? 'inmobiliaria' : 'concesionario';
      return;
    }
    list.innerHTML = '';
    addProperty();
    refreshVerticalLabels();
  });

  /* Estado de imágenes por bloque de inmueble (los inputs viven en el DOM) */
  let logoUrl = initial.demo?.agency_logo_url ?? null;

  /* ============ Slug automático ============ */
  const nameInput = form.querySelector('[name=agency_name]');
  const slugInput = form.querySelector('[name=slug]');
  let slugTouched = !!initial.demo;

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  nameInput.addEventListener('input', () => {
    if (!slugTouched) slugInput.value = slugify(nameInput.value.replace(/^inmobiliaria\s+/i, ''));
  });
  slugInput.addEventListener('input', () => {
    slugTouched = true;
  });

  /* ============ Color de acento ============ */
  const accentInput = form.querySelector('[name=accent_hex]');
  const accentValue = document.getElementById('accent-value');

  function markSwatch() {
    accentValue.textContent = accentInput.value.toUpperCase();
    document.querySelectorAll('[data-swatch]').forEach((b) => {
      b.classList.toggle('border-ink', b.dataset.swatch.toLowerCase() === accentInput.value.toLowerCase());
    });
  }
  document.querySelectorAll('[data-swatch]').forEach((b) => {
    b.addEventListener('click', () => {
      accentInput.value = b.dataset.swatch;
      markSwatch();
    });
  });
  accentInput.addEventListener('input', markSwatch);

  /* ============ Validación WhatsApp ============ */
  const waInput = form.querySelector('[name=whatsapp_e164]');
  const waError = document.getElementById('wa-error');

  waInput.addEventListener('input', () => {
    waInput.value = waInput.value.replace(/\D/g, '').slice(0, 12);
    validateWa();
  });
  function validateWa() {
    const ok = /^58\d{10}$/.test(waInput.value);
    waError.classList.toggle('hidden', ok || waInput.value === '');
    return ok;
  }

  /* ============ Logo ============ */
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('logo-preview');
  const logoRemove = document.getElementById('logo-remove');

  function showLogo(url) {
    logoUrl = url;
    logoPreview.src = url ?? '';
    logoPreview.classList.toggle('hidden', !url);
    logoRemove.classList.toggle('hidden', !url);
  }
  if (logoUrl) showLogo(logoUrl);

  logoInput.addEventListener('change', async () => {
    const file = logoInput.files?.[0];
    if (!file) return;
    const blob = await compressImage(file, 600);
    const url = await uploadBlob(blob, slugInput.value || 'logos');
    if (url) showLogo(url);
  });
  logoRemove.addEventListener('click', () => {
    showLogo(null);
    logoInput.value = '';
  });

  /* ============ Compresión + subida de imágenes ============ */

  /** Redimensiona a maxWidth y comprime a WebP q80. */
  function compressImage(file, maxWidth = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir'))),
          'image/webp',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = objectUrl;
    });
  }

  async function uploadBlob(blob, folder) {
    const fd = new FormData();
    fd.append('file', new File([blob], 'imagen.webp', { type: 'image/webp' }));
    fd.append('folder', slugify(folder || 'general'));
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok || !json.url) {
      alert(json.error || 'Error subiendo imagen');
      return null;
    }
    return json.url;
  }

  /* ============ Pegar datos: formatos + parser ============ */

  const DATA_FORMATS = {
    inmobiliaria: `Ref: A-102
Título: Apartamento con vista al mar
Operación: venta
Tipo: apartamento
Precio USD: 89000
Ubicación: Pampatar, Nueva Esparta
Habitaciones: 3
Baños: 2
Puestos: 1
Metros: 120
Descripción: Amplio apartamento cerca de la playa, cocina remodelada y balcón con vista al mar.
Características: Piscina, Vigilancia 24h, Amoblado
Maps: Pampatar, Nueva Esparta, Venezuela`,
    concesionario: `Ref: C-001
Título: Toyota Corolla SE 2022
Marca: Toyota
Modelo: Corolla SE
Año: 2022
Condición: nuevo
Tipo: sedán
Precio USD: 24500
Kilometraje: 0
Transmisión: automática
Combustible: gasolina
Color: Blanco perla
Importación: sí
Tiempo de espera: 45-60 días
Descripción: Full equipo, versión SE con pantalla de 9 pulgadas y asistencias de manejo.
Características: Cámara de reversa, Asientos de cuero, Sunroof`,
  };

  function normalizeKey(raw) {
    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .replace(/[^a-z0-9]/g, '');
  }

  const KEY_MAP = {
    // Comunes
    ref: 'ref_code', referencia: 'ref_code', refcode: 'ref_code',
    titulo: 'title', title: 'title', nombre: 'title',
    tipo: '_type', tipodeinmueble: '_type', tipodevehiculo: '_type',
    precio: 'price_usd', preciousd: 'price_usd', precious: 'price_usd', usd: 'price_usd',
    descripcion: 'description',
    caracteristicas: 'features', extras: 'features', amenidades: 'features', equipamiento: 'features',
    // Inmuebles
    operacion: 'operation',
    ubicacion: 'location', zona: 'location', ciudad: 'location',
    habitaciones: 'bedrooms', hab: 'bedrooms', cuartos: 'bedrooms', dormitorios: 'bedrooms',
    banos: 'bathrooms', bano: 'bathrooms',
    puestos: 'parking', estacionamiento: 'parking', estacionamientos: 'parking', ptos: 'parking',
    metros: 'area_m2', m2: 'area_m2', area: 'area_m2', metroscuadrados: 'area_m2', superficie: 'area_m2',
    maps: 'maps_query', mapa: 'maps_query', googlemaps: 'maps_query', direccion: 'maps_query',
    // Vehículos
    marca: 'brand',
    modelo: 'model',
    ano: 'year', anio: 'year', year: 'year',
    condicion: 'condition', estado: 'condition',
    kilometraje: 'mileage_km', km: 'mileage_km', kms: 'mileage_km', kilometros: 'mileage_km',
    transmision: 'transmission', caja: 'transmission',
    combustible: 'fuel',
    color: 'color',
    importacion: 'is_import', importado: 'is_import',
    tiempodeespera: 'import_wait', espera: 'import_wait', entrega: 'import_wait', tiempodeentrega: 'import_wait',
  };

  /** Parsea el texto "Clave: valor" por líneas. Líneas sin clave se anexan al valor anterior. */
  function parsePropertyText(text) {
    const data = {};
    let lastField = null;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const match = line.match(/^([^:]{1,30}):\s*(.*)$/);
      const field = match ? KEY_MAP[normalizeKey(match[1])] : undefined;
      if (field) {
        data[field] = match[2].trim();
        lastField = field;
      } else if (lastField === 'description' || lastField === 'features') {
        data[lastField] += ' ' + line;
      }
    }
    return data;
  }

  function applyParsedData(node, data) {
    // "Tipo:" es ambiguo entre nichos: se resuelve contra el campo que exista en el bloque.
    if ('_type' in data) {
      data.property_type = data._type;
      data.vehicle_type = data._type;
    }

    let applied = 0;
    node.querySelectorAll('[data-field]').forEach((input) => {
      const field = input.dataset.field;
      if (!(field in data) || field === 'is_featured') return;
      let value = data[field];

      if (field === 'is_import') {
        input.checked = /^(si|sí|s|yes|true|1)/i.test(value.trim());
        input.dispatchEvent(new Event('change', { bubbles: true }));
        applied++;
        return;
      }

      if (field === 'operation') {
        value = /alq|rent/i.test(value) ? 'alquiler' : 'venta';
      } else if (field === 'property_type') {
        const t = normalizeKey(value);
        value =
          t.includes('casa') ? 'casa' :
          t.includes('terreno') || t.includes('parcela') ? 'terreno' :
          t.includes('local') || t.includes('oficina') ? 'local' :
          t.includes('quinta') || t.includes('townhouse') ? 'quinta' : 'apartamento';
      } else if (field === 'vehicle_type') {
        const t = normalizeKey(value);
        value =
          t.includes('suv') ? 'suv' :
          t.includes('pick') ? 'pickup' :
          t.includes('hatch') ? 'hatchback' :
          t.includes('camioneta') ? 'camioneta' :
          t.includes('moto') ? 'moto' :
          t.includes('camion') ? 'camion' : 'sedan';
      } else if (field === 'condition') {
        value = /nuev|new|0\s*km/i.test(value) ? 'nuevo' : 'usado';
      } else if (field === 'transmission') {
        value = /sincr|manual|mec/i.test(value) ? 'sincronica' : 'automatica';
      } else if (field === 'fuel') {
        const t = normalizeKey(value);
        value =
          t.includes('diesel') || t.includes('gasoil') ? 'diesel' :
          t.includes('hibrid') ? 'hibrido' :
          t.includes('electric') ? 'electrico' : 'gasolina';
      } else if (['price_usd', 'bedrooms', 'bathrooms', 'parking', 'area_m2', 'year', 'mileage_km'].includes(field)) {
        value = value.replace(/[^\d]/g, '');
        if (value === '') return;
      }

      input.value = value;
      applied++;
    });
    return applied;
  }

  async function pasteIntoNode(node) {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = '';
    }
    const parsed = text ? parsePropertyText(text) : {};
    if (Object.keys(parsed).length > 0) {
      const n = applyParsedData(node, parsed);
      flashStatus(node, `✓ ${n} campos rellenados`);
    } else {
      // Sin acceso al portapapeles o el texto no coincide: mostrar el área de pegado manual
      const fb = node.querySelector('[data-paste-fallback]');
      fb.classList.remove('hidden');
      fb.querySelector('[data-paste-area]').focus();
    }
  }

  function flashStatus(node, msg) {
    const status = node.querySelector('[data-upload-status]');
    status.textContent = msg;
    setTimeout(() => { if (status.textContent === msg) status.textContent = ''; }, 3000);
  }

  /** Copia con fallback a execCommand por si el Clipboard API falla. */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  const copyFormatBtn = document.getElementById('copy-format');
  copyFormatBtn.addEventListener('click', async () => {
    const ok = await copyText(DATA_FORMATS[currentVertical()]);
    const original = copyFormatBtn.textContent;
    copyFormatBtn.textContent = ok ? '✓ Formato copiado' : 'No se pudo copiar';
    setTimeout(() => (copyFormatBtn.textContent = original), 1500);
  });

  /* ============ Repetidor de inmuebles ============ */

  function addProperty(data = null) {
    const items = list.querySelectorAll('.property-item');
    if (items.length >= MAX_PROPERTIES) return null;

    const node = currentTemplate().content.firstElementChild.cloneNode(true);
    node._images = data?.image_urls ? [...data.image_urls] : [];

    if (data) {
      node.querySelectorAll('[data-field]').forEach((input) => {
        const field = input.dataset.field;
        if (field === 'is_featured') {
          input.checked = !!data.is_featured;
        } else if (field === 'is_import') {
          input.checked = !!data.is_import;
        } else if (field === 'features') {
          input.value = (data.features ?? []).join(', ');
        } else if (data[field] != null) {
          input.value = data[field];
        }
      });
    }

    // Vehículos: el campo de tiempo de espera solo aplica si es por importación.
    const importCheck = node.querySelector('[data-field="is_import"]');
    if (importCheck) {
      const waitInput = node.querySelector('[data-field="import_wait"]');
      const syncWait = () => waitInput.classList.toggle('hidden', !importCheck.checked);
      importCheck.addEventListener('change', syncWait);
      syncWait();
    }

    node.querySelector('[data-remove]').addEventListener('click', () => {
      node.remove();
      renumber();
    });

    node.querySelector('[data-paste]').addEventListener('click', () => pasteIntoNode(node));
    node.querySelector('[data-paste-apply]').addEventListener('click', () => {
      const area = node.querySelector('[data-paste-area]');
      const parsed = parsePropertyText(area.value);
      if (Object.keys(parsed).length > 0) {
        const n = applyParsedData(node, parsed);
        flashStatus(node, `✓ ${n} campos rellenados`);
        area.value = '';
        node.querySelector('[data-paste-fallback]').classList.add('hidden');
      } else {
        flashStatus(node, 'No se reconoció el formato. Usa "Copiar formato de datos" como base.');
      }
    });

    setupUploader(node);
    list.appendChild(node);
    renumber();
    renderPreviews(node);
    return node;
  }

  function renumber() {
    list.querySelectorAll('.property-item').forEach((item, i) => {
      item.querySelector('[data-num]').textContent = String(i + 1);
    });
    document.getElementById('add-property').style.display =
      list.querySelectorAll('.property-item').length >= MAX_PROPERTIES ? 'none' : '';
  }

  function renderPreviews(node) {
    const wrap = node.querySelector('[data-previews]');
    const hint = node.querySelector('[data-drop-hint]');
    wrap.innerHTML = '';
    hint.style.display = node._images.length ? 'none' : '';
    node._images.forEach((url, i) => {
      const div = document.createElement('div');
      div.className = 'relative';
      div.innerHTML =
        `<img src="${url}" class="h-16 w-20 rounded-[4px] border border-line object-cover" alt="">` +
        `<button type="button" class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white" aria-label="Quitar">✕</button>`;
      div.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        node._images.splice(i, 1);
        renderPreviews(node);
      });
      wrap.appendChild(div);
    });
  }

  function setupUploader(node) {
    const dropzone = node.querySelector('[data-dropzone]');
    const fileInput = node.querySelector('[data-file-input]');
    const status = node.querySelector('[data-upload-status]');

    async function handleFiles(files) {
      const remaining = MAX_IMAGES - node._images.length;
      const toProcess = Array.from(files).slice(0, remaining);
      if (!toProcess.length) return;
      status.textContent = `Comprimiendo y subiendo ${toProcess.length} foto(s)…`;
      for (const file of toProcess) {
        try {
          const blob = await compressImage(file, 1600);
          const url = await uploadBlob(blob, slugInput.value || 'general');
          if (url) {
            node._images.push(url);
            renderPreviews(node);
          }
        } catch (e) {
          alert(`Error con ${file.name}: ${e.message}`);
        }
      }
      status.textContent = '';
    }

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      handleFiles(fileInput.files);
      fileInput.value = '';
    });
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-ink');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-ink'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-ink');
      handleFiles(e.dataTransfer.files);
    });
  }

  document.getElementById('add-property').addEventListener('click', () => addProperty());

  /* ============ Estado inicial ============ */
  if (initial.demo) {
    for (const [key, value] of Object.entries(initial.demo)) {
      const input = form.querySelector(`[name=${key}]`);
      if (!input || value == null) continue;
      if (input.type === 'checkbox') input.checked = !!value;
      else input.value = value;
    }
    markSwatch();
  }
  if (initial.items.length) {
    initial.items.forEach((p) => addProperty(p));
  } else {
    addProperty();
  }
  markSwatch();
  refreshVerticalLabels();

  /* ============ Guardado ============ */
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveStatus.style.color = '#B91C1C';

    if (!validateWa()) {
      waInput.focus();
      return;
    }
    if (!nameInput.value.trim() || !slugInput.value.trim() || !form.querySelector('[name=agency_city]').value.trim()) {
      saveStatus.textContent = 'Faltan campos obligatorios (nombre, slug, ciudad).';
      return;
    }

    const demoData = {};
    ['slug', 'agency_name', 'agency_tagline', 'agency_city', 'instagram_handle', 'whatsapp_e164',
     'contact_email', 'office_address', 'maps_query', 'testimonial_text', 'testimonial_author',
     'mode', 'notes', 'accent_hex'].forEach((k) => {
      demoData[k] = form.querySelector(`[name=${k}]`).value.trim() || null;
    });
    ['years_operating', 'properties_sold'].forEach((k) => {
      const v = form.querySelector(`[name=${k}]`).value;
      demoData[k] = v ? parseInt(v, 10) : null;
    });
    demoData.is_active = form.querySelector('[name=is_active]').checked;
    demoData.agency_logo_url = logoUrl;
    demoData.vertical = currentVertical();

    const isVehicles = currentVertical() === 'concesionario';
    const itemNoun = isVehicles ? 'Vehículo' : 'Inmueble';
    const items = [];
    const problems = [];
    list.querySelectorAll('.property-item').forEach((node, idx) => {
      const p = { image_urls: node._images };
      node.querySelectorAll('[data-field]').forEach((input) => {
        const field = input.dataset.field;
        if (field === 'is_featured') p.is_featured = input.checked;
        else if (field === 'is_import') p.is_import = input.checked;
        else if (field === 'features') {
          p.features = input.value.split(',').map((s) => s.trim()).filter(Boolean);
        } else if (['price_usd', 'bedrooms', 'bathrooms', 'parking', 'area_m2', 'year', 'mileage_km'].includes(field)) {
          p[field] = input.value ? Number(input.value) : null;
        } else {
          p[field] = input.value.trim() || null;
        }
      });

      // Vehículos: autogenerar título desde marca/modelo/año si quedó vacío.
      if (isVehicles && !p.title && p.brand) {
        p.title = [p.brand, p.model, p.year].filter(Boolean).join(' ');
      }

      // Ignorar solo bloques COMPLETAMENTE vacíos (sin ningún dato ni foto)
      const isEmpty = !p.ref_code && !p.title && !p.brand && !p.price_usd && !p.location && !p.image_urls.length;
      if (isEmpty) return;

      // Nada se descarta en silencio: si falta algo obligatorio, se bloquea el guardado.
      const missing = [];
      if (!p.ref_code) missing.push('Ref');
      if (!p.title) missing.push(isVehicles ? 'Título o Marca' : 'Título');
      if (!p.price_usd) missing.push('Precio USD');
      if (!isVehicles && !p.location) missing.push('Ubicación');
      if (!p.image_urls.length) missing.push('al menos 1 foto');
      if (missing.length) {
        problems.push(`${itemNoun} ${idx + 1}: falta ${missing.join(', ')}`);
        return;
      }
      items.push(p);
    });

    if (problems.length) {
      saveStatus.textContent = problems.join(' · ');
      return;
    }

    saveBtn.disabled = true;
    saveStatus.style.color = '';
    saveStatus.textContent = 'Guardando…';

    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: initial.id, demo: demoData, items }),
      });
      const json = await res.json();
      if (!res.ok) {
        saveStatus.style.color = '#B91C1C';
        saveStatus.textContent = json.error || 'Error al guardar';
        return;
      }

      saveStatus.textContent = '';
      const panel = document.getElementById('result-panel');
      panel.classList.remove('hidden');
      document.getElementById('result-link').textContent = json.link;
      document.getElementById('result-open').href = json.link;

      setupCopy('copy-link', json.link);
      setupCopy('copy-outreach', json.outreach);
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Tras crear, seguir editando en su URL
      if (!initial.id && json.slug) {
        initial.id = json.id;
        history.replaceState(null, '', `/admin/${json.slug}/editar`);
      }
    } finally {
      saveBtn.disabled = false;
      if (saveStatus.textContent === 'Guardando…') saveStatus.textContent = '';
    }
  });

  function setupCopy(btnId, text) {
    const btn = document.getElementById(btnId);
    btn.onclick = async () => {
      const ok = await copyText(text);
      const original = btn.textContent;
      btn.textContent = ok ? '✓ Copiado' : 'No se pudo copiar';
      setTimeout(() => (btn.textContent = original), 1500);
    };
  }
}
