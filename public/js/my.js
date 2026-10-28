async function load() {
  const res = await authFetch('/api/appointments');
  const data = await res.json();
  if (!res.ok) return showAlert(esc(data.message));
  document.getElementById('rows').innerHTML = data.map(a => `
    <tr>
      <td><b>${fmtDate(a.date)}</b><br><small class="text-muted">${fmtSlot(a.timeSlot)}</small></td>
      <td>${a.doctor ? `Dr. ${esc(a.doctor.name)}<br><small class="text-muted">${esc(a.doctor.specialization)}${a.doctor.room ? ' &middot; Room ' + esc(a.doctor.room) : ''}</small>` : '<span class="text-muted">-</span>'}</td>
      <td>${esc(a.patientName)}<br><small class="text-muted">${a.age} yrs &middot; ${esc(a.gender)}</small></td>
      <td>${badge(a.status)}</td>
      <td class="text-end">${a.status === 'Booked' ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelAppt('${a._id}')">Cancel</button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="text-center text-muted py-4">You have no appointments yet.</td></tr>';
}

async function cancelAppt(id) {
  if (!confirm('Cancel this appointment?')) return;
  const res = await authFetch(`/api/appointments/${id}/cancel`, { method: 'PATCH' });
  const data = await res.json();
  if (res.ok) { await load(); showAlert(esc(data.message), 'success'); } else showAlert(esc(data.message));
}

if (requireRole('patient')) load();
