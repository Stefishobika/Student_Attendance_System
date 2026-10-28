const $ = id => document.getElementById(id);
if (!requireRole('doctor')) throw new Error('Redirecting to login');

let list = [], tab = 'today';

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${type} border-0 show`;
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function load() {
  const [pRes, aRes] = await Promise.all([authFetch('/api/doctors/me'), authFetch('/api/appointments/doctor/mine')]);
  const p = await pRes.json(), a = await aRes.json();
  if (!pRes.ok) return toast(p.message, 'danger');
  if (!aRes.ok) return toast(a.message, 'danger');
  list = a;

  $('profile').innerHTML = `
    <div class="d-flex flex-wrap align-items-center gap-3">
      <span class="avatar" style="width:72px;height:72px;font-size:1.4rem">${esc(initials(p.name))}</span>
      <div class="flex-grow-1">
        <h4 class="mb-0">Dr. ${esc(p.name)}</h4>
        <div class="text-teal fw-semibold">${esc(p.specialization)}</div>
        <div class="small text-muted"><i class="bi bi-mortarboard me-1"></i>${esc(p.qualification)} &middot; ${p.experience} yrs${p.room ? ' &middot; Room ' + esc(p.room) : ''}</div>
      </div>
      <div><div class="small text-muted mb-1">Available on</div>${dayChips(p.availableDays)}</div>
    </div>`;
  render();
}

const isActive = a => a.status === 'Booked';

function render() {
  const today = localToday();
  const todays = list.filter(a => isActive(a) && a.date === today);
  const upcoming = list.filter(a => isActive(a) && a.date > today);
  const history = list.filter(a => !isActive(a) || a.date < today).sort((x, y) => (y.date + y.timeSlot).localeCompare(x.date + x.timeSlot));

  const stats = [
    ['Today', todays.length, 'bi-calendar-day', 'blue'],
    ['Upcoming', upcoming.length, 'bi-calendar-week', 'teal'],
    ['Completed', list.filter(a => a.status === 'Completed').length, 'bi-check2-circle', 'green'],
    ['Cancelled', list.filter(a => a.status === 'Cancelled').length, 'bi-x-circle', 'red']
  ];
  $('stats').innerHTML = stats.map(([l, v, i, c]) => `
    <div class="col-6 col-lg-3"><div class="stat-card"><div class="stat-icon ${c}"><i class="bi ${i}"></i></div>
    <div><div class="stat-num">${v}</div><div class="stat-label">${l}</div></div></div></div>`).join('');

  const rows = { today: todays, upcoming, history }[tab];
  $('rows').innerHTML = rows.map(a => `
    <tr>
      <td><b>${fmtDate(a.date)}</b><br><small class="text-muted">${fmtSlot(a.timeSlot)}</small></td>
      <td><b>${esc(a.patientName)}</b><br><small class="text-muted">${a.age} yrs &middot; ${esc(a.gender)}</small></td>
      <td class="small">${esc(a.phone)}<br>${esc(a.email)}</td>
      <td class="small" style="max-width:220px">${esc(a.reason) || '<span class="text-muted">-</span>'}</td>
      <td>${badge(a.status)}</td>
      <td class="text-end text-nowrap">${a.status === 'Booked' ? `
        <button class="btn btn-sm btn-outline-success" title="Mark completed" onclick="setStatus('${a._id}','Completed')"><i class="bi bi-check2"></i></button>
        <button class="btn btn-sm btn-outline-warning" title="Cancel" onclick="setStatus('${a._id}','Cancelled')"><i class="bi bi-x-lg"></i></button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted py-4">No appointments here</td></tr>';
}

document.querySelectorAll('#tabs .nav-link').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#tabs .nav-link').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); tab = b.dataset.tab; render();
}));

async function setStatus(id, status) {
  if (status === 'Cancelled' && !confirm('Cancel this appointment?')) return;
  const res = await authFetch(`/api/appointments/doctor/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  const data = await res.json();
  toast(data.message, res.ok ? 'success' : 'danger');
  if (res.ok) load();
}

$('todayText').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
$('logout').addEventListener('click', logout);
load();
