const ICONS = {
  'General Medicine': 'bi-clipboard2-pulse', 'Cardiology': 'bi-heart-pulse', 'Neurology': 'bi-activity',
  'Orthopedics': 'bi-bandaid', 'Pediatrics': 'bi-emoji-smile', 'Gynecology': 'bi-gender-female',
  'Dermatology': 'bi-droplet', 'ENT': 'bi-ear', 'Ophthalmology': 'bi-eye'
};

Promise.all([
  fetch('/api/doctors/departments').then(r => r.json()),
  fetch('/api/doctors').then(r => r.json())
]).then(([depts, docs]) => {
  document.getElementById('sDocs').textContent = docs.length;
  document.getElementById('sDepts').textContent = depts.length;

  document.getElementById('departments').innerHTML = depts.map(d => `
    <div class="col-6 col-md-4 col-lg-3"><a href="/book.html?dept=${encodeURIComponent(d)}" class="text-reset">
      <div class="card dept-card shadow-soft text-center p-3 h-100">
        <div><span class="dept-icon"><i class="bi ${ICONS[d] || 'bi-plus-square'}"></i></span></div>
        <div class="mt-2 fw-semibold">${esc(d)}</div>
      </div></a></div>`).join('');

  document.getElementById('doctors').innerHTML = docs.map(d => `
    <div class="col-md-6 col-lg-4"><div class="card doc-card shadow-soft h-100"><div class="card-body">
      <div class="d-flex gap-3 align-items-center mb-3">
        <span class="avatar">${esc(initials(d.name))}</span>
        <div><h6 class="mb-0">Dr. ${esc(d.name)}</h6><small class="text-teal fw-semibold">${esc(d.specialization)}</small></div>
      </div>
      <div class="small text-muted mb-1"><i class="bi bi-mortarboard me-1"></i>${esc(d.qualification)}</div>
      <div class="small text-muted mb-1"><i class="bi bi-award me-1"></i>${d.experience} years experience</div>
      <div class="small text-muted mb-2"><i class="bi bi-currency-rupee me-1"></i>Consultation: &#8377;${d.fee}${d.room ? ' &middot; Room ' + esc(d.room) : ''}</div>
      <div class="mb-3">${dayChips(d.availableDays)}</div>
      <a class="btn btn-primary btn-sm w-100" href="/book.html?doctor=${d._id}">Book Appointment</a>
    </div></div></div>`).join('') || '<p class="text-center text-muted">No doctors available right now.</p>';
});
