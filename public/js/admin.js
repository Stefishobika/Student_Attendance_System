const $ = id => document.getElementById(id);
let appts = [], doctors = [], departments = [], charts = {}, editingId = null;
const TITLES = { overview: 'Overview', appointments: 'Appointments', doctors: 'Doctors' };

if (!requireRole('admin')) throw new Error('Redirecting to login');

async function api(url, opts = {}) {
  const res = await authFetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${type} border-0 show`;
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function loadAll() {
  const [a, d, dep] = await Promise.all([
    api('/api/appointments/admin/all'), api('/api/doctors/admin/all'), fetch('/api/doctors/departments').then(r => r.json())
  ]);
  appts = a; doctors = d; departments = dep;
  $('dDept').innerHTML = '<option value="">Select department</option>' + departments.map(x => `<option>${esc(x)}</option>`).join('');
  renderAll();
}
function renderAll() { renderOverview(); renderAppts(); renderDoctors(); }

$('todayText').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
$('logout').addEventListener('click', logout);

document.querySelectorAll('.side-link[data-view]').forEach(l => l.addEventListener('click', () => {
  document.querySelectorAll('.side-link[data-view]').forEach(x => x.classList.remove('active'));
  l.classList.add('active');
  ['overview', 'appointments', 'doctors'].forEach(v => $('view-' + v).classList.toggle('d-none', v !== l.dataset.view));
  $('pageTitle').textContent = TITLES[l.dataset.view];
}));

/* ---------- overview ---------- */
function renderOverview() {
  const today = localToday();
  const n = s => appts.filter(a => a.status === s).length;
  const booked = appts.filter(a => a.status === 'Booked');
  const stats = [
    ['Today', booked.filter(a => a.date === today).length, 'bi-calendar-day', 'blue'],
    ['Upcoming', booked.filter(a => a.date >= today).length, 'bi-calendar-week', 'teal'],
    ['Completed', n('Completed'), 'bi-check2-circle', 'green'],
    ['Cancelled', n('Cancelled'), 'bi-x-circle', 'red'],
    ['Active Doctors', doctors.filter(d => d.active).length, 'bi-person-badge', 'purple']
  ];
  $('stats').innerHTML = stats.map(([l, v, i, c]) => `
    <div class="col-6 col-lg"><div class="stat-card"><div class="stat-icon ${c}"><i class="bi ${i}"></i></div>
    <div><div class="stat-num">${v}</div><div class="stat-label">${l}</div></div></div></div>`).join('');

  const todays = booked.filter(a => a.date === today).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  $('todayRows').innerHTML = todays.map(a => `
    <tr><td><b>${fmtSlot(a.timeSlot)}</b></td><td>${esc(a.patientName)}<br><small class="text-muted">${a.age} yrs &middot; ${esc(a.gender)}</small></td>
    <td>${a.doctor ? 'Dr. ' + esc(a.doctor.name) : '-'}</td><td>${esc(a.phone)}</td><td>${badge(a.status)}</td></tr>`).join('')
    || '<tr><td colspan="5" class="text-center text-muted py-4">No appointments scheduled for today</td></tr>';

  if (typeof Chart === 'undefined') return;
  Object.values(charts).forEach(c => c.destroy());
  charts.status = new Chart($('chartStatus'), {
    type: 'doughnut',
    data: { labels: ['Booked', 'Completed', 'Cancelled'], datasets: [{ data: [n('Booked'), n('Completed'), n('Cancelled')], backgroundColor: ['#0d9488', '#2563eb', '#ef4444'], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' } } }
  });
  const byDept = {};
  appts.filter(a => a.status !== 'Cancelled' && a.doctor).forEach(a => { byDept[a.doctor.specialization] = (byDept[a.doctor.specialization] || 0) + 1; });
  charts.dept = new Chart($('chartDept'), {
    type: 'bar',
    data: { labels: Object.keys(byDept), datasets: [{ label: 'Appointments', data: Object.values(byDept), backgroundColor: '#2563eb', borderRadius: 6 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

/* ---------- appointments ---------- */
function renderAppts() {
  const q = $('fSearch').value.trim().toLowerCase(), st = $('fStatus').value, dt = $('fDate').value;
  const list = appts.filter(a =>
    (!st || a.status === st) && (!dt || a.date === dt) &&
    (!q || [a.patientName, a.phone, a.email, a.doctor ? a.doctor.name : ''].join(' ').toLowerCase().includes(q)));
  $('apptRows').innerHTML = list.map(a => `
    <tr>
      <td><b>${esc(a.patientName)}</b><br><small class="text-muted">${a.age} yrs &middot; ${esc(a.gender)}</small></td>
      <td class="small">${esc(a.phone)}<br>${esc(a.email)}</td>
      <td>${a.doctor ? 'Dr. ' + esc(a.doctor.name) + '<br><small class="text-muted">' + esc(a.doctor.specialization) + '</small>' : '<span class="text-muted">Removed</span>'}</td>
      <td>${fmtDate(a.date)}<br><small class="text-muted">${fmtSlot(a.timeSlot)}</small></td>
      <td>${badge(a.status)}</td>
      <td class="text-end text-nowrap">
        ${a.status === 'Booked' ? `
        <button class="btn btn-sm btn-outline-success" title="Mark completed" onclick="setStatus('${a._id}','Completed')"><i class="bi bi-check2"></i></button>
        <button class="btn btn-sm btn-outline-warning" title="Cancel" onclick="setStatus('${a._id}','Cancelled')"><i class="bi bi-x-lg"></i></button>` : ''}
        <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="delAppt('${a._id}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted py-4">No appointments match your filters</td></tr>';
}
['fSearch', 'fStatus', 'fDate'].forEach(id => $(id).addEventListener('input', renderAppts));
$('fClear').addEventListener('click', () => { $('fSearch').value = ''; $('fStatus').value = ''; $('fDate').value = ''; renderAppts(); });

async function setStatus(id, status) {
  try { await api(`/api/appointments/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); toast(`Marked as ${status}`); await loadAll(); }
  catch (e) { toast(e.message, 'danger'); }
}
async function delAppt(id) {
  if (!confirm('Delete this appointment permanently?')) return;
  try { await api(`/api/appointments/admin/${id}`, { method: 'DELETE' }); toast('Appointment deleted'); await loadAll(); }
  catch (e) { toast(e.message, 'danger'); }
}

/* ---------- doctors ---------- */
function renderDoctors() {
  $('docCount').textContent = `${doctors.length} doctor(s) registered`;
  $('docRows').innerHTML = doctors.map(d => `
    <tr class="${d.active ? '' : 'opacity-50'}">
      <td><div class="d-flex align-items-center gap-2"><span class="avatar sm">${esc(initials(d.name))}</span>
        <div><b>Dr. ${esc(d.name)}</b><br><small class="text-muted">${esc(d.qualification)}</small></div></div></td>
      <td>${esc(d.specialization)}${d.room ? '<br><small class="text-muted">Room ' + esc(d.room) + '</small>' : ''}</td>
      <td>${d.experience} yrs</td><td>&#8377;${d.fee}</td>
      <td>${dayChips(d.availableDays)}</td>
      <td>${d.active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" title="Edit" onclick="openDoctor('${d._id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-secondary" title="${d.active ? 'Deactivate' : 'Activate'}" onclick="toggleDoctor('${d._id}')"><i class="bi bi-${d.active ? 'pause' : 'play'}-circle"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="delDoctor('${d._id}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" class="text-center text-muted py-4">No doctors yet. Click "Add Doctor".</td></tr>';
}

$('dDays').innerHTML = DAY_SHORT.map((n, i) =>
  `<div class="form-check"><input class="form-check-input day-cb" type="checkbox" value="${i}" id="day${i}"><label class="form-check-label" for="day${i}">${n}</label></div>`).join('');
const doctorModal = new bootstrap.Modal($('doctorModal'));

function openDoctor(id) {
  editingId = id || null;
  const d = id ? doctors.find(x => x._id === id) : null;
  $('doctorForm').classList.remove('was-validated');
  $('dError').classList.add('d-none'); $('dDaysErr').classList.add('d-none');
  $('doctorModalTitle').textContent = d ? 'Edit Doctor' : 'Add Doctor';
  $('dName').value = d ? d.name : ''; $('dDept').value = d ? d.specialization : '';
  $('dQual').value = d ? d.qualification : ''; $('dExp').value = d ? d.experience : '';
  $('dFee').value = d ? d.fee : ''; $('dPhone').value = d ? d.phone : '';
  $('dRoom').value = d ? d.room : ''; $('dEmail').value = d ? d.email : '';
  $('dPassword').value = ''; $('dPassword').required = !d;
  $('dPwHint').textContent = d ? 'Leave blank to keep the current password' : 'Doctor logs in with this email and password';
  document.querySelectorAll('.day-cb').forEach(cb => { cb.checked = d ? d.availableDays.includes(+cb.value) : [1, 2, 3, 4, 5].includes(+cb.value); });
  doctorModal.show();
}
$('addDoctorBtn').addEventListener('click', () => openDoctor());

function doctorPayload(d, overrides = {}) {
  return { name: d.name, specialization: d.specialization, qualification: d.qualification, experience: d.experience,
    fee: d.fee, phone: d.phone, email: d.email || '', room: d.room || '', availableDays: d.availableDays, active: d.active, ...overrides };
}

$('doctorForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = $('doctorForm');
  form.classList.add('was-validated');
  const days = [...document.querySelectorAll('.day-cb:checked')].map(c => +c.value);
  $('dDaysErr').classList.toggle('d-none', days.length > 0);
  if (!form.checkValidity() || !days.length) return;
  const existing = editingId ? doctors.find(x => x._id === editingId) : null;
  const payload = {
    name: $('dName').value, specialization: $('dDept').value, qualification: $('dQual').value,
    experience: $('dExp').value, fee: $('dFee').value, phone: $('dPhone').value,
    email: $('dEmail').value, room: $('dRoom').value, availableDays: days, active: existing ? existing.active : true
  };
  if ($('dPassword').value) payload.password = $('dPassword').value;
  try {
    const data = await api(editingId ? `/api/doctors/${editingId}` : '/api/doctors', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    doctorModal.hide(); toast(data.message); await loadAll();
  } catch (err) { $('dError').textContent = err.message; $('dError').classList.remove('d-none'); }
});

async function toggleDoctor(id) {
  const d = doctors.find(x => x._id === id);
  try { await api(`/api/doctors/${id}`, { method: 'PUT', body: JSON.stringify(doctorPayload(d, { active: !d.active })) });
    toast(d.active ? 'Doctor deactivated' : 'Doctor activated'); await loadAll(); }
  catch (e) { toast(e.message, 'danger'); }
}
async function delDoctor(id) {
  if (!confirm('Delete this doctor permanently?')) return;
  try { const data = await api(`/api/doctors/${id}`, { method: 'DELETE' }); toast(data.message); await loadAll(); }
  catch (e) { toast(e.message, 'danger'); }
}

/* ---------- boot ---------- */
$('app').classList.remove('d-none');
loadAll().catch(e => toast(e.message, 'danger'));
