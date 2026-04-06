import { apiFetch } from './api.js';
import { toast } from './ui.js';

let timer = null;

export async function refreshUnreadCount() {
  try {
    const data = await apiFetch('/notifications/unread-count');
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const n = Number(data.unread ?? 0);
    badge.textContent = String(n);
    badge.classList.toggle('hidden', n <= 0);
  } catch {
    // ignore
  }
}

export function startNotificationsPolling() {
  if (timer) return;
  refreshUnreadCount();
  timer = setInterval(refreshUnreadCount, 30_000);
}

export async function openNotificationsPanel() {
  try {
    const list = await apiFetch('/notifications?limit=10&page=1');
    const items = list.items || [];
    const msg = items.length
      ? `Tenés ${items.length} notificaciones recientes.`
      : 'No hay notificaciones.';
    toast('success', 'Notificaciones', msg);
  } catch (e) {
    toast('error', 'Error', e.message || 'No se pudieron cargar notificaciones');
  }
}
