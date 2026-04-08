import { register, login } from './api.js';
import { toast } from './ui.js';

document.getElementById('registerForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const payload = {
    name: String(fd.get('name') || '').trim() || undefined,
    email: String(fd.get('email') || '').trim(),
    password: String(fd.get('password') || ''),
    role: String(fd.get('role') || 'BUYER'),
  };

  try {
    await register(payload);
    // autologin
    await login({ email: payload.email, password: payload.password });
    toast('success', 'Registro', 'Cuenta creada.');
    location.href = './profile.html';
  } catch (e) {
    console.error(e);
    const detail = e?.message ? ` ${e.message}` : '';
    toast('error', 'Registro', `No se pudo registrar.${detail}`);
  }
});
