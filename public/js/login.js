const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const ROLES = {
  patient: { icon: 'bi-person-heart', title: 'Patient Login', hint: 'Book and manage your appointments' },
  doctor: { icon: 'bi-person-badge', title: 'Doctor Login', hint: 'Accounts are created by the hospital admin' },
  admin: { icon: 'bi-shield-lock', title: 'Admin Login', hint: 'Authorized hospital staff only' }
};
const HOME = { patient: '/book.html', doctor: '/doctor.html', admin: '/admin.html' };
const safeNext = n => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);
let role = 'patient';

function setRole(r) {
  role = r;
  document.querySelectorAll('#roleTabs .nav-link').forEach(b => b.classList.toggle('active', b.dataset.role === r));
  $('roleIcon').className = 'bi ' + ROLES[r].icon;
  $('roleTitle').textContent = ROLES[r].title;
  $('roleHint').textContent = ROLES[r].hint;
  $('registerRow').classList.toggle('d-none', r !== 'patient');
  $('alert').innerHTML = '';
}
document.querySelectorAll('#roleTabs .nav-link').forEach(b => b.addEventListener('click', () => setRole(b.dataset.role)));
setRole(ROLES[params.get('role')] ? params.get('role') : 'patient');

$('togglePw').addEventListener('click', () => {
  const p = $('password'); const show = p.type === 'password';
  p.type = show ? 'text' : 'password';
  $('togglePw').innerHTML = `<i class="bi bi-eye${show ? '-slash' : ''}"></i>`;
});

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = $('loginForm'); f.classList.add('was-validated');
  if (!f.checkValidity()) return;
  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: $('email').value, password: $('password').value, role })
  });
  const data = await res.json();
  if (!res.ok) return showAlert(esc(data.message));
  Auth.set(data.token, data.user);
  const next = safeNext(params.get('next'));
  // only follow "next" if it belongs to the role that just logged in
  const okNext = next && ((role === 'doctor' && next.startsWith('/doctor')) || (role === 'admin' && next.startsWith('/admin')) ||
    (role === 'patient' && !next.startsWith('/doctor') && !next.startsWith('/admin') && !next.startsWith('/login')));
  location.href = okNext ? next : HOME[role];
});
