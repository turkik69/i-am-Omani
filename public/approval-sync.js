(() => {
  const q = s => document.querySelector(s);
  let seen = new Set();
  let syncing = false;

  function esc(v='') {
    return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function hostSession() {
    try {
      const saved = JSON.parse(localStorage.getItem('quizHost') || 'null');
      if (saved?.code && saved?.hostToken) return saved;
    } catch {}
    if (window.state?.code && window.state?.hostToken) return { code: state.code, hostToken: state.hostToken };
    return null;
  }

  function hostIsActive() {
    return q('#hostLobbyScreen')?.classList.contains('active') || window.state?.role === 'host';
  }

  function renderPending(items) {
    const list = Array.isArray(items) ? items : [];
    const box = q('#pendingRequests');
    const count = q('#pendingCount');
    if (!box || !count) return;

    count.textContent = String(list.length);
    box.classList.toggle('empty-state', !list.length);
    if (!list.length) {
      box.innerHTML = 'لا توجد طلبات انتظار';
      seen.clear();
      return;
    }

    const fresh = list.filter(r => !seen.has(r.id));
    list.forEach(r => seen.add(r.id));
    if (fresh.length) {
      const name = fresh[fresh.length - 1]?.name || 'لاعب جديد';
      try { window.IAMSFX?.play?.('join'); } catch {}
      try { window.toast?.(`🛡️ طلب انضمام جديد من ${name}`); } catch {}
    }

    box.innerHTML = list.map(r => `
      <div class="pending-card" data-request-id="${esc(r.id)}">
        <div class="pending-avatar">${esc(r.avatar || '🇴🇲')}</div>
        <div class="pending-info"><strong>${esc(r.name)}</strong><small>يرغب بالانضمام إلى المسابقة</small></div>
        <div class="pending-actions">
          <button type="button" class="approve-btn" data-approve="${esc(r.id)}">قبول</button>
          <button type="button" class="reject-btn" data-reject="${esc(r.id)}">رفض</button>
        </div>
      </div>
    `).join('');

    box.querySelectorAll('[data-approve]').forEach(btn => btn.onclick = () => {
      btn.disabled = true;
      socket.emit('host:approveJoin', { requestId: btn.dataset.approve }, res => {
        if (!res?.ok) { btn.disabled = false; try { toast(res?.error || 'تعذر قبول اللاعب'); } catch {} }
        setTimeout(syncPending, 120);
      });
    });
    box.querySelectorAll('[data-reject]').forEach(btn => btn.onclick = () => {
      btn.disabled = true;
      socket.emit('host:rejectJoin', { requestId: btn.dataset.reject }, res => {
        if (!res?.ok) { btn.disabled = false; try { toast(res?.error || 'تعذر رفض الطلب'); } catch {} }
        setTimeout(syncPending, 120);
      });
    });
  }

  function syncPending() {
    if (syncing || !hostIsActive() || !window.socket?.connected) return;
    const saved = hostSession();
    if (!saved) return;
    syncing = true;
    socket.emit('host:reconnect', saved, res => {
      syncing = false;
      if (!res?.ok) return;
      try {
        if (window.state) {
          state.code = saved.code;
          state.hostToken = saved.hostToken;
          state.role = 'host';
        }
        if (res.room && typeof window.renderRoom === 'function') renderRoom(res.room);
      } catch {}
      renderPending(res.pending || []);
    });
  }

  socket.on('host:pending', renderPending);
  socket.on('connect', () => setTimeout(syncPending, 120));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(syncPending, 80); });
  window.addEventListener('focus', () => setTimeout(syncPending, 80));
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-open="hostCreate"],#createRoomBtn,.host-card')) setTimeout(syncPending, 450);
  }, true);

  setInterval(syncPending, 2500);
  setTimeout(syncPending, 500);
})();
