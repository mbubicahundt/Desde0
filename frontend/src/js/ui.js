const toastWrapId = 'toastWrap';

function ensureToastWrap() {
  let wrap = document.getElementById(toastWrapId);
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = toastWrapId;
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  return wrap;
}

export function toast(type, title, message) {
  const wrap = ensureToastWrap();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="t">${escapeHtml(title)}</div><div class="m">${escapeHtml(message ?? '')}</div>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
