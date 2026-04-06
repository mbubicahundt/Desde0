import { apiGet, apiPost, apiPatch, apiUpload } from './api.js';
import { getAuth } from './auth.js';
import { toast } from './ui.js';

function requireSeller() {
  const auth = getAuth();
  if (!auth?.token) {
    toast('error', 'Ingresar', 'Ingresá para publicar.');
    location.href = `/login.html?next=${encodeURIComponent(location.pathname)}`;
    return false;
  }
  if (auth.user?.role !== 'SELLER') {
    toast('error', 'Rol', 'Solo vendedores pueden publicar.');
    location.href = './index.html';
    return false;
  }
  return true;
}

requireSeller();

function getEditId() {
  const usp = new URLSearchParams(location.search);
  const id = Number(usp.get('id'));
  return Number.isFinite(id) ? id : null;
}

async function prefillIfEditing(editId) {
  if (!editId) return;
  try {
    const car = await apiGet(`/cars/${editId}`);

    const auth = getAuth();
    if (auth.user?.role !== 'SELLER' || String(auth.user?.sub) !== String(car.seller_id)) {
      toast('error', 'Edición', 'No sos dueño de esta publicación.');
      location.href = `/car-detail.html?id=${encodeURIComponent(editId)}`;
      return;
    }

    const form = document.getElementById('sellForm');
    const set = (name, value) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (!el) return;
      el.value = value ?? '';
    };
    set('brand', car.brand);
    set('model', car.model);
    set('year', car.year);
    set('mileage', car.mileage);
    set('price', car.price);
    set('fuel', car.fuel);
    set('transmission', car.transmission);
    set('location', car.location);
    set('bodyType', car.bodyType || car.body_type);
    set('color', car.color);
    set('ownersCount', car.ownersCount ?? car.owners_count);
    set('description', car.description);

    const imgInput = form.querySelector('input[name="images"]');
    if (imgInput) imgInput.required = false;

    const title = document.getElementById('sellTitle');
    const sub = document.getElementById('sellSubtitle');
    if (title) title.textContent = 'Editar publicación';
    if (sub) sub.textContent = 'Actualizá los datos. Podés subir fotos nuevas (opcional).';

    const btn = document.getElementById('publishBtn');
    if (btn) btn.textContent = 'Guardar cambios';
    document.title = 'Editar — LuxAuto';
  } catch (e) {
    console.error(e);
    toast('error', 'Edición', 'No se pudo cargar la publicación.');
  }
}

const editId = getEditId();
prefillIfEditing(editId);

document.getElementById('sellForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!requireSeller()) return;

  const btn = document.getElementById('publishBtn');
  btn.disabled = true;
  btn.textContent = 'Publicando...';

  const form = ev.target;
  const fd = new FormData(form);

  const carPayload = {
    brand: String(fd.get('brand') || '').trim(),
    model: String(fd.get('model') || '').trim(),
    year: Number(fd.get('year')),
    mileage: Number(fd.get('mileage')),
    price: Number(fd.get('price')),
    fuel: String(fd.get('fuel')),
    transmission: String(fd.get('transmission')),
    location: String(fd.get('location') || '').trim(),
    bodyType: String(fd.get('bodyType')),
    color: String(fd.get('color') || '').trim(),
    ownersCount: Number(fd.get('ownersCount')),
    description: String(fd.get('description') || '').trim(),
  };

  try {
    let carId = editId;
    if (editId) {
      await apiPatch(`/cars/${editId}`, carPayload);
    } else {
      const car = await apiPost('/cars', carPayload);
      carId = car?.id;
    }

    const files = (form.querySelector('input[name="images"]').files) || [];
    if (!carId) throw new Error('no carId');

    if (files.length) {
      const uploadFd = new FormData();
      for (const f of files) uploadFd.append('images', f);
      await apiUpload(`/cars/${carId}/images`, uploadFd);
    }

    // trigger AI (best-effort)
    try {
      await apiPost(`/cars/${carId}/analyze`, {});
    } catch {
      // ignore
    }

    toast('success', 'Publicación', editId ? 'Cambios guardados.' : 'Publicado.');
    location.href = `/car-detail.html?id=${encodeURIComponent(carId)}`;
  } catch (e) {
    console.error(e);
    toast('error', 'Publicación', editId ? 'No se pudieron guardar los cambios.' : 'No se pudo publicar.');
  } finally {
    btn.disabled = false;
    btn.textContent = editId ? 'Guardar cambios' : 'Publicar';
  }
});
