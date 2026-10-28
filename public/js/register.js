const $ = id => document.getElementById(id);
const form = $('regForm');
const checkMatch = () => $('confirmPassword').setCustomValidity($('confirmPassword').value === $('password').value ? '' : 'mismatch');
$('password').addEventListener('input', checkMatch);
$('confirmPassword').addEventListener('input', checkMatch);

form.addEventListener('submit', async e => {
  e.preventDefault();
  checkMatch(); form.classList.add('was-validated');
  if (!form.checkValidity()) return;
  const res = await fetch('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: $('name').value, email: $('email').value, phone: $('phone').value,
      password: $('password').value, confirmPassword: $('confirmPassword').value })
  });
  const data = await res.json();
  if (!res.ok) return showAlert(esc(data.message));
  Auth.set(data.token, data.user);
  location.href = '/book.html';
});
