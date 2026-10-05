(() => {
  const q = s => document.querySelector(s);
  let seen = new Set();
  let syncing = false;

  function esc(v='') {
    return String(v).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
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
      try { window.GameSFX?.play?.('join'); } catch {}
      try { window.toast?.(`🛡️ طلب انضمام جديد من ${name}`); } catch {}
    }

    box.innerHTML = list.map(r => `
      <div class="pending-card" data-request-id="${esc(r.id)}">
        <div class="pending-avatar">${window.avatarHTML?.(r.avatar || '🇴🇲') || '🇴🇲'}</div>
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

  // Live quiz watchdog: recover missed result/question events after brief iPhone/network drops.
  let quizDeadline = 0;
  let lastRecovery = 0;
  let hostRevealTimer = null;

  async function recoverQuizState() {
    if (!window.socket?.connected || Date.now() - lastRecovery < 1200) return;
    const user = window.IAmOmaniFirebase?.user;
    if (!user) return;
    let idToken;
    try { idToken = await user.getIdToken(); } catch { return; }
    lastRecovery = Date.now();

    try {
      const host = JSON.parse(localStorage.getItem('quizHost') || 'null');
      if (host?.code && host?.hostToken) {
        socket.emit('host:reconnect', { ...host, idToken }, () => {});
        return;
      }
    } catch {}

    try {
      const player = JSON.parse(localStorage.getItem('quizPlayer') || 'null');
      if (player?.code && player?.reconnectToken) {
        socket.emit('player:reconnect', { ...player, idToken }, () => {});
      }
    } catch {}
  }

  socket.on('quiz:question', data => {
    quizDeadline = Number(data?.startedAt || Date.now()) + Number(data?.timeLimit || 0);
    clearTimeout(hostRevealTimer);
    const host = hostSession();
    if (host && quizDeadline > Date.now()) {
      hostRevealTimer = setTimeout(() => {
        if (q('#questionScreen')?.classList.contains('active') && socket.connected) socket.emit('host:reveal');
      }, Math.max(500, quizDeadline - Date.now() + 900));
    }
  });

  socket.on('quiz:progress', data => {
    if (data?.total > 0 && data.answered >= data.total && hostSession()) {
      clearTimeout(hostRevealTimer);
      hostRevealTimer = setTimeout(() => {
        if (q('#questionScreen')?.classList.contains('active') && socket.connected) socket.emit('host:reveal');
      }, 650);
    }
  });

  socket.on('room:update', room => {
    if (!room) return;
    const onQuestion = q('#questionScreen')?.classList.contains('active');
    if (room.status === 'result' && onQuestion) setTimeout(recoverQuizState, 180);
    if (room.status === 'question' && quizDeadline && Date.now() > quizDeadline + 1800 && onQuestion) setTimeout(recoverQuizState, 120);
  });

  socket.on('connect', () => {
    if (q('#questionScreen')?.classList.contains('active') || q('#resultScreen')?.classList.contains('active')) {
      setTimeout(recoverQuizState, 250);
    }
  });

  setInterval(() => {
    if (q('#questionScreen')?.classList.contains('active') && quizDeadline && Date.now() > quizDeadline + 2200) recoverQuizState();
  }, 2000);
})();
