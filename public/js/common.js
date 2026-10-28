const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function esc(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; }
function badge(status) { return `<span class="badge badge-${status}">${esc(status)}</span>`; }
function initials(name) { return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
function fmtSlot(t) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; }
function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayChips(days) {
  return DAY_SHORT.map((n, i) => `<span class="day-chip ${days.includes(i) ? '' : 'off'}">${n}</span>`).join('');
}
function showAlert(msg, type = 'danger', target = 'alert') {
  document.getElementById(target).innerHTML =
    `<div class="alert alert-${type} alert-dismissible fade show">${msg}<button class="btn-close" data-bs-dismiss="alert"></button></div>`;
}

/* ---------- Auth helpers (JWT kept in localStorage) ---------- */
const Auth = {
  get token() { return localStorage.getItem('token'); },
  get user() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
  set(token, user) { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('token'); localStorage.removeItem('user'); }
};
function loginUrl(role) {
  return `/login.html?${role ? 'role=' + role + '&' : ''}next=${encodeURIComponent(location.pathname + location.search)}`;
}
function requireRole(role) {
  const u = Auth.user;
  if (!Auth.token || !u || u.role !== role) { location.href = loginUrl(role); return false; }
  return true;
}
async function authFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + Auth.token, ...(opts.headers || {}) } });
  if (res.status === 401) { const r = Auth.user && Auth.user.role; Auth.clear(); location.href = loginUrl(r); }
  return res;
}
function logout() { Auth.clear(); location.href = '/login.html'; }
