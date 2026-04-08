import { getToken, setToken } from './auth.js';

function baseUrl() {
  return window.__APP_CONFIG__?.API_BASE_URL ?? '';
}

function toErrorMessage(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value.map((entry) => toErrorMessage(entry)).filter(Boolean);
    return parts.join(' | ');
  }
  if (typeof value === 'object') {
    if ('message' in value) return toErrorMessage(value.message);
    if ('error' in value) return toErrorMessage(value.error);
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

export async function apiFetch(path, options = {}) {
  const url = `${baseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (res.status === 401) {
    // token expired/invalid
    setToken(null);
  }

  if (!res.ok) {
    const message = toErrorMessage(body) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

export async function apiLogin(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(payload) {
  return apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Convenience wrappers used by page modules
export async function apiGet(path) {
  return apiFetch(path, { method: 'GET' });
}

export async function apiPost(path, body) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export async function apiPatch(path, body) {
  return apiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export async function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}

export async function apiUpload(path, formData) {
  return apiFetch(path, {
    method: 'POST',
    body: formData,
  });
}

export async function login({ email, password }) {
  const data = await apiLogin(email, password);
  const token = data?.accessToken || data?.access_token || data?.token;
  if (token) setToken(token);
  return data;
}

export async function register(payload) {
  return apiRegister(payload);
}
