import { loadPartials } from './partials.js';
import { getAuthUser, logout } from './auth.js';
import { startNotificationsPolling, refreshUnreadCount, openNotificationsPanel } from './notifications.js';

function applyAuthVisibility(user) {
  const nodes = document.querySelectorAll('[data-auth]');
  nodes.forEach((n) => {
    const rule = n.getAttribute('data-auth');
    let show = false;
    if (rule === 'guest') show = !user;
    else if (rule === 'any') show = !!user;
    else if (rule === 'seller') show = user?.role === 'SELLER';
    else show = true;
    n.classList.toggle('hidden', !show);
  });
}

async function initNav() {
  const user = getAuthUser();
  applyAuthVisibility(user);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', openNotificationsPanel);
  }

  if (user) {
    startNotificationsPolling();
    refreshUnreadCount();
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadPartials();
  await initNav();
});
