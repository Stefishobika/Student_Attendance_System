const $ = id => document.getElementById(id);
if (!requireRole('patient')) throw new Error('Redirecting to login');
const me = Auth.user;
function prefill() { $('email').value = me.email; $('patientName').value = me.name; $('phone').value = me.phone || ''; }
const form = $('bookForm'), deptEl = $('dept'), docEl = $('doctor'), dateEl = $('date'), slotsEl = $('slots');
let doctors = [], selectedSlot = '';

dateEl.min = localToday();
const maxD = new Date(); maxD.setDate(maxD.getDate() + 90);
dateEl.max = `${maxD.getFullYear()}-${String(maxD.getMonth() + 1).padStart(2, '0')}-${String(maxD.getDate()).padStart(2, '0')}`;

const currentDoctor = () => doctors.find(d => d._id === docEl.value);

function fillDoctors(dept, keep) {
  const list = dept ? doctors.filter(d => d.specialization === dept) : doctors;
  docEl.innerHTML = '<option value="">Select doctor</option>' +
    list.map(d => `<option value="${d._id}">Dr. ${esc(d.name)} (${esc(d.specialization)})</option>`).join('');
  if (keep) docEl.value = keep;
}

function showDoctor() {
  const d = currentDoctor();
  $('docPanel').innerHTML = d ? `
    <div class="text-center mb-3"><span class="avatar mx-auto" style="width:72px;height:72px;font-size:1.4rem">${esc(initials(d.name))}</span>
      <h5 class="mt-3 mb-0">Dr. ${esc(d.name)}</h5><span class="text-teal fw-semibold">${esc(d.specialization)}</span></div>
    <ul class="list-unstyled small mb-3">
      <li class="mb-2"><i class="bi bi-mortarboard text-blue me-2"></i>${esc(d.qualification)}</li>
      <li class="mb-2"><i class="bi bi-award text-blue me-2"></i>${d.experience} years experience</li>
      <li class="mb-2"><i class="bi bi-currency-rupee text-blue me-2"></i>Consultation fee: <b>&#8377;${d.fee}</b></li>
      ${d.room ? `<li class="mb-2"><i class="bi bi-door-open text-blue me-2"></i>Room ${esc(d.room)}</li>` : ''}
    </ul>
    <div class="small text-muted mb-1">Available on</div><div>${dayChips(d.availableDays)}</div>` :
    '<div class="text-center text-muted py-4"><i class="bi bi-person-badge fs-1"></i><p class="mb-0 mt-2">Select a doctor to see their details.</p></div>';
}

function clearSlots(msg) {
  selectedSlot = '';
  slotsEl.innerHTML = `<span class="text-muted small">${msg}</span>`;
}

async function loadSlots() {
  dateEl.setCustomValidity(''); dateEl.classList.remove('is-invalid');
  const d = currentDoctor();
  if (!d || !dateEl.value) return clearSlots('Select a doctor and date to see free slots.');
  const day = new Date(dateEl.value + 'T00:00:00').getDay();
  if (!d.availableDays.includes(day)) {
    dateEl.setCustomValidity('unavailable');
    $('dateFeedback').textContent = `Dr. ${d.name} is not available on this day.`;
    dateEl.classList.add('is-invalid');
    return clearSlots('Doctor is not available on the selected day.');
  }
  clearSlots('Loading slots...');
  const res = await fetch(`/api/appointments/slots?doctorId=${d._id}&date=${dateEl.value}`);
  const data = await res.json();
  if (!res.ok) return clearSlots(esc(data.message));
  if (!data.available.length) return clearSlots('No free slots on this date. Try another day.');
  slotsEl.innerHTML = data.available.map(s => `<button type="button" class="slot-btn" data-slot="${s}">${fmtSlot(s)}</button>`).join('');
}

slotsEl.addEventListener('click', e => {
  const b = e.target.closest('.slot-btn'); if (!b) return;
  slotsEl.querySelectorAll('.slot-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); selectedSlot = b.dataset.slot;
  $('slotError').classList.add('d-none');
});

deptEl.addEventListener('change', () => { fillDoctors(deptEl.value); showDoctor(); loadSlots(); });
docEl.addEventListener('change', () => {
  const d = currentDoctor();
  if (d) deptEl.value = d.specialization;
  showDoctor(); loadSlots();
});
dateEl.addEventListener('change', loadSlots);

form.addEventListener('submit', async e => {
  e.preventDefault();
  form.classList.add('was-validated');
  const noSlot = !selectedSlot;
  $('slotError').classList.toggle('d-none', !noSlot);
  if (!form.checkValidity() || noSlot) return;

  const body = {
    patientName: $('patientName').value, age: $('age').value, gender: $('gender').value,
    phone: $('phone').value, doctorId: docEl.value,
    date: dateEl.value, timeSlot: selectedSlot, reason: $('reason').value
  };
  const doc = currentDoctor();
  const res = await authFetch('/api/appointments', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    showAlert(`<b>${esc(data.message)}</b><br>Dr. ${esc(doc.name)} (${esc(doc.specialization)}) &middot; ${fmtDate(body.date)} at ${fmtSlot(body.timeSlot)}${doc.room ? ' &middot; Room ' + esc(doc.room) : ''}`, 'success');
    form.reset(); form.classList.remove('was-validated'); prefill();
    fillDoctors(''); showDoctor(); clearSlots('Select a doctor and date to see free slots.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    showAlert(esc(data.message));
    if (res.status === 409) loadSlots();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

Promise.all([
  fetch('/api/doctors/departments').then(r => r.json()),
  fetch('/api/doctors').then(r => r.json())
]).then(([depts, docs]) => {
  doctors = docs;
  deptEl.innerHTML += depts.map(d => `<option>${esc(d)}</option>`).join('');
  const params = new URLSearchParams(location.search);
  const pre = doctors.find(d => d._id === params.get('doctor'));
  if (pre) { deptEl.value = pre.specialization; fillDoctors(pre.specialization, pre._id); showDoctor(); }
  else if (params.get('dept') && depts.includes(params.get('dept'))) { deptEl.value = params.get('dept'); fillDoctors(params.get('dept')); }
  else fillDoctors('');
});

prefill();
