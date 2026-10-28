(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  const u = Auth.token ? Auth.user : null;
  const links = [['index.html', 'Home']];
  if (!u || u.role === 'patient') links.push(['book.html', 'Book Appointment']);
  if (u && u.role === 'patient') links.push(['my-appointments.html', 'My Appointments']);
  if (u && u.role === 'doctor') links.push(['doctor.html', 'My Dashboard']);
  if (u && u.role === 'admin') links.push(['admin.html', 'Admin Dashboard']);

  const right = u ? `
    <li class="nav-item dropdown ms-md-2">
      <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown"><i class="bi bi-person-circle me-1"></i>${esc(u.name)}</a>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><span class="dropdown-item-text small text-muted text-capitalize">${esc(u.role)} account</span></li>
        <li><button class="dropdown-item" id="navLogout"><i class="bi bi-box-arrow-right me-2"></i>Logout</button></li>
      </ul>
    </li>` : `
    <li class="nav-item ms-md-2"><a class="btn btn-outline-primary btn-sm mt-1" href="/login.html">Login</a></li>
    <li class="nav-item ms-md-2"><a class="btn btn-primary btn-sm mt-1" href="/register.html">Register</a></li>`;

  document.getElementById('site-nav').innerHTML = `
  <div class="topbar-strip py-2"><div class="container d-flex justify-content-between flex-wrap gap-2">
    <span><i class="bi bi-telephone-fill me-1"></i> Emergency: 108 &nbsp;|&nbsp; Helpdesk: 0422-2345678</span>
    <span><i class="bi bi-clock me-1"></i> OPD: Mon - Sat, 9:00 AM - 5:00 PM</span>
  </div></div>
  <nav class="navbar navbar-expand-md site-nav sticky-top"><div class="container">
    <a class="navbar-brand" href="/"><span class="brand-icon"><i class="bi bi-heart-pulse-fill"></i></span>CareWell Hospital</a>
    <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navMenu"><span class="navbar-toggler-icon"></span></button>
    <div class="collapse navbar-collapse" id="navMenu"><ul class="navbar-nav ms-auto align-items-md-center">
      ${links.map(([h, t]) => `<li class="nav-item"><a class="nav-link ${page === h ? 'active' : ''}" href="/${h}">${t}</a></li>`).join('')}
      ${right}
    </ul></div></div></nav>`;
  document.getElementById('site-footer').innerHTML = `
  <footer class="site-footer mt-5 py-4"><div class="container text-center small">
    <div class="mb-1 text-white fw-semibold"><i class="bi bi-heart-pulse-fill text-info me-1"></i>CareWell Hospital</div>
    &copy; 2026 CareWell Hospital &middot; Online Appointment Booking and Scheduling System
  </div></footer>`;
  const out = document.getElementById('navLogout');
  if (out) out.addEventListener('click', logout);
})();
