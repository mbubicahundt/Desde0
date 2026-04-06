import { login } from './api.js';
import { toast } from './ui.js';

function nextUrl() {
  const usp = new URLSearchParams(location.search);
  const next = usp.get('next');
  return next && next.startsWith('/') ? next : './index.html';
}

document.getElementById('loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');

  try {
    await login({ email, password });
    toast('success', 'Sesión iniciada', 'Bienvenido/a');
    location.href = nextUrl();
  } catch (e) {
    console.error(e);
    toast('error', 'Login', 'Credenciales inválidas o error.');
  }
});
