import { apiGet } from './api.js';
import { escapeHtml, toast } from './ui.js';
import { isInCompare, toggleCompare } from './compare-util.js';

function q(id) {
  return document.getElementById(id);
}

function toQuery(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    usp.set(k, s);
  }
  return usp.toString();
}

function fmtMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '-';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num);
}

function chipForCondition(condition) {
  const c = (condition || '').toUpperCase();
  const label = c ? `IA: ${c}` : 'IA: —';
  return `<span class="chip">${escapeHtml(label)}</span>`;
}

function card(car) {
  const id = car.id;
  const title = `${car.brand ?? ''} ${car.model ?? ''}`.trim() || `Auto #${id}`;
  const subtitle = `${car.year ?? '—'} • ${car.location ?? '—'} • ${car.mileage ?? '—'} km`;
  const img = car.thumbnailUrl || car.thumbnail_url || (car.images?.[0]?.url) || '';
  const price = fmtMoney(car.price);
  const inCompare = isInCompare(id);
  const btnLabel = inCompare ? 'Quitar' : 'Comparar';

  return `
    <article class="glass card">
      <a href="./car-detail.html?id=${encodeURIComponent(id)}" style="text-decoration:none; color:inherit">
        <div class="media">
          ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" />` : `<div class="placeholder">Sin foto</div>`}
        </div>
        <div style="margin-top:10px">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start">
            <div>
              <div style="font-weight:900">${escapeHtml(title)}</div>
              <div style="color:var(--text-1); font-size:13px; margin-top:4px">${escapeHtml(subtitle)}</div>
            </div>
            <div style="font-weight:900; color:var(--text-0)">${escapeHtml(price)}</div>
          </div>

          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:10px">
            ${chipForCondition(car.aiCondition || car.ai_condition)}
            <span class="chip">${escapeHtml(car.bodyType || car.body_type || '—')}</span>
            <span class="chip">${escapeHtml(car.transmission || '—')}</span>
          </div>
        </div>
      </a>

      <div style="display:flex; gap:10px; margin-top:12px">
        <button class="btn" type="button" data-compare-id="${escapeHtml(id)}">${escapeHtml(btnLabel)}</button>
        <a class="btn" href="./car-detail.html?id=${encodeURIComponent(id)}">Ver</a>
      </div>
    </article>
  `.trim();
}

let page = 1;
const limit = 12;

function applyInitialParams() {
  const usp = new URLSearchParams(location.search);
  const map = {
    brand: 'fBrand',
    model: 'fModel',
    location: 'fLocation',
    priceMin: 'fPriceMin',
    priceMax: 'fPriceMax',
    yearMin: 'fYearMin',
    yearMax: 'fYearMax',
    mileageMax: 'fMileageMax',
    bodyType: 'fBodyType',
    transmission: 'fTransmission',
  };
  for (const [k, id] of Object.entries(map)) {
    const v = usp.get(k);
    if (v !== null && q(id)) q(id).value = v;
  }
  const p = Number(usp.get('page'));
  if (Number.isFinite(p) && p >= 1) page = p;
}

function readFilters() {
  return {
    brand: q('fBrand').value,
    model: q('fModel').value,
    location: q('fLocation').value,
    priceMin: q('fPriceMin').value,
    priceMax: q('fPriceMax').value,
    yearMin: q('fYearMin').value,
    yearMax: q('fYearMax').value,
    mileageMax: q('fMileageMax').value,
    bodyType: q('fBodyType').value,
    transmission: q('fTransmission').value,
  };
}

async function load() {
  const grid = q('carsGrid');
  const meta = q('resultMeta');

  grid.innerHTML = '<div class="glass card">Cargando...</div>';

  const filters = readFilters();
  const qs = toQuery({ ...filters, page, limit });

  try {
    const data = await apiGet(`/cars?${qs}`);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

    meta.textContent = `${items.length} resultados • página ${page}`;

    if (!items.length) {
      grid.innerHTML = '<div class="glass card">Sin resultados con esos filtros.</div>';
      return;
    }

    grid.innerHTML = items.map(card).join('');

    grid.querySelectorAll('[data-compare-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-compare-id'));
        const res = toggleCompare(id);
        if (res.full) toast('error', 'Comparador', 'Podés comparar hasta 4 autos.');
        btn.textContent = isInCompare(id) ? 'Quitar' : 'Comparar';
      });
    });
  } catch (e) {
    console.error(e);
    meta.textContent = '—';
    grid.innerHTML = '<div class="glass card">No se pudo cargar el listado.</div>';
  }
}

function reset() {
  ['fBrand','fModel','fLocation','fPriceMin','fPriceMax','fYearMin','fYearMax','fMileageMax'].forEach((id) => (q(id).value = ''));
  q('fBodyType').value = '';
  q('fTransmission').value = '';
  page = 1;
}

q('applyBtn').addEventListener('click', () => {
  page = 1;
  load();
});

q('resetBtn').addEventListener('click', () => {
  reset();
  load();
});

q('prevBtn').addEventListener('click', () => {
  if (page > 1) {
    page -= 1;
    load();
  }
});

q('nextBtn').addEventListener('click', () => {
  page += 1;
  load();
});

applyInitialParams();
load();
