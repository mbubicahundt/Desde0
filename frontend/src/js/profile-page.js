import { apiGet } from './api.js';
import { getAuth, logout } from './auth.js';
import { escapeHtml, toast } from './ui.js';

function card(car) {
  const id = car.id;
  const title = `${car.brand ?? ''} ${car.model ?? ''}`.trim() || `Auto #${id}`;
  const subtitle = `${car.year ?? '—'} • ${car.location ?? '—'}`;
  const img = car.thumbnailUrl || car.thumbnail_url || (car.images?.[0]?.url) || '';

  return `
    <article class="glass card">
      <a href="./car-detail.html?id=${encodeURIComponent(id)}" style="text-decoration:none; color:inherit">
        <div class="media">
          ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" />` : `<div class="placeholder">Sin foto</div>`}
        </div>
        <div style="margin-top:10px">
          <div style="font-weight:900">${escapeHtml(title)}</div>
          <div style="color:var(--text-1); font-size:13px; margin-top:4px">${escapeHtml(subtitle)}</div>
        </div>
      </a>
      <div style="margin-top:12px; display:flex; gap:10px">
        <a class="btn" href="./car-detail.html?id=${encodeURIComponent(id)}">Ver</a>
      </div>
    </article>
  `.trim();
}

(async function init() {
  const auth = getAuth();
  if (!auth?.token) {
    toast('error', 'Ingresar', 'Ingresá para ver tu perfil.');
    location.href = `/login.html?next=${encodeURIComponent('/profile.html')}`;
    return;
  }

  const box = document.getElementById('profileBox');
  try {
    const me = await apiGet('/auth/me');
    box.innerHTML = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap">
        <div>
          <div style="font-weight:900; font-size:18px">${escapeHtml(me.name || 'Sin nombre')}</div>
          <div style="color:var(--text-1); margin-top:6px">${escapeHtml(me.email || '—')}</div>
          <div style="margin-top:10px"><span class="chip">Rol: ${escapeHtml(me.role || '—')}</span></div>
        </div>
        <div style="display:flex; gap:10px">
          <a class="btn" href="./cars.html">Explorar</a>
          <button class="btn" id="logoutBtn" type="button">Salir</button>
        </div>
      </div>
    `.trim();

    document.getElementById('logoutBtn').addEventListener('click', () => {
      logout();
      location.href = './index.html';
    });

    if (me.role === 'SELLER') {
      const myBox = document.getElementById('myCarsBox');
      const grid = document.getElementById('myCarsGrid');
      myBox.classList.remove('hidden');
      const data = await apiGet('/cars/mine');
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      grid.innerHTML = items.length ? items.map(card).join('') : '<div class="glass" style="padding:10px; border-radius:12px; color:var(--text-1)">Todavía no publicaste autos.</div>';
    }
  } catch (e) {
    console.error(e);
    box.textContent = 'No se pudo cargar el perfil.';
  }
})();
