import { apiGet } from './api.js';
import { escapeHtml, toast } from './ui.js';
import { clearCompare, getCompareIds, setCompareIds } from './compare-util.js';

function fmtMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '-';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num);
}

function row(label, values) {
  return `
    <tr>
      <th>${escapeHtml(label)}</th>
      ${values.map((v) => `<td>${v}</td>`).join('')}
    </tr>
  `.trim();
}

async function loadCars(ids) {
  const cars = [];
  for (const id of ids) {
    try {
      const c = await apiGet(`/cars/${id}`);
      cars.push(c);
    } catch {
      // ignore missing
    }
  }
  return cars;
}

function render(table, cars) {
  if (!cars.length) {
    table.innerHTML = '';
    return;
  }

  const headers = cars
    .map((c) => {
      const img = c.images?.[0]?.url;
      const title = `${c.brand ?? ''} ${c.model ?? ''}`.trim() || `#${c.id}`;
      return `
        <td>
          <div style="display:grid; gap:8px">
            <div class="media" style="height:120px">${img ? `<img src="${escapeHtml(img)}" alt=""/>` : `<div class="placeholder">Sin foto</div>`}</div>
            <div style="font-weight:900">${escapeHtml(title)}</div>
            <div style="color:var(--text-1); font-size:12px">ID #${escapeHtml(c.id)}</div>
            <a class="btn" href="./car-detail.html?id=${encodeURIComponent(c.id)}">Ver detalle</a>
            <button class="btn" data-remove-id="${escapeHtml(c.id)}" type="button">Quitar</button>
          </div>
        </td>
      `.trim();
    })
    .join('');

  const aiCond = cars.map((c) => {
    const ai = c.aiAnalysis || c.ai_analysis;
    return escapeHtml(ai?.condition || '—');
  });

  table.innerHTML = `
    <tr>
      <th></th>
      ${headers}
    </tr>
    ${row('Precio', cars.map((c) => escapeHtml(fmtMoney(c.price))))}
    ${row('Año', cars.map((c) => escapeHtml(String(c.year ?? '—'))))}
    ${row('Km', cars.map((c) => escapeHtml(String(c.mileage ?? '—'))))}
    ${row('Ubicación', cars.map((c) => escapeHtml(String(c.location ?? '—'))))}
    ${row('Carrocería', cars.map((c) => escapeHtml(String(c.bodyType ?? c.body_type ?? '—'))))}
    ${row('Transmisión', cars.map((c) => escapeHtml(String(c.transmission ?? '—'))))}
    ${row('Combustible', cars.map((c) => escapeHtml(String(c.fuel ?? '—'))))}
    ${row('Condición IA', aiCond.map((x) => `<span class="chip">${x}</span>`))}
    ${row('Riesgo IA', cars.map((c) => {
      const ai = c.aiAnalysis || c.ai_analysis;
      return escapeHtml(String(ai?.risk_level ?? ai?.riskLevel ?? '—'));
    }))}
  `.trim();
}

async function init() {
  const hint = document.getElementById('compareHint');
  const table = document.getElementById('compareTable');

  const ids = getCompareIds();
  if (!ids.length) {
    hint.classList.remove('hidden');
    table.innerHTML = '';
    return;
  }

  hint.classList.add('hidden');
  const cars = await loadCars(ids);
  render(table, cars);

  table.querySelectorAll('[data-remove-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-remove-id'));
      const next = setCompareIds(getCompareIds().filter((x) => x !== id));
      toast('success', 'Comparador', 'Actualizado.');
      if (!next.length) {
        clearCompare();
        location.reload();
      } else {
        location.reload();
      }
    });
  });
}

init().catch((e) => {
  console.error(e);
  toast('error', 'Comparador', 'No se pudo cargar el comparador.');
});
