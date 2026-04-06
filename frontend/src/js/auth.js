import { toast } from './ui.js';

const TOKEN_KEY = 'luxauto_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  setToken(null);
  toast('success', 'Sesión cerrada', 'Volviste a modo invitado.');
  window.location.href = './index.html';
}

export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getAuthUser() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload?.sub) return null;
  return payload;
}

export function getAuth() {
  const token = getToken();
  const user = getAuthUser();
  return { token, user };
}
