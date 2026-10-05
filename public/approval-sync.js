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
    try {
      if (typeof state !== 'undefined' && state?.code && state?.hostToken) return { code: state.code, hostToken: state.hostToken };
    } catch {}
    return null;
  }

  function hostLobbyVisible() {
    return !!q('#hostLobbyScreen')?.classList.contains('active');
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
    if (syncing || !hostLobbyVisible() || !window.socket?.connected) return;
    const saved = hostSession();
    if (!saved) return;
    syncing = true;
    socket.emit('host:reconnect', saved, res => {
      syncing = false;
      if (!res?.ok) return;
      try {
        if (typeof state !== 'undefined') {
          state.code = saved.code;
          state.hostToken = saved.hostToken;
          state.role = 'host';
        }
        if (res.room && typeof renderRoom === 'function') renderRoom(res.room);
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
  setInterval(() => { if (hostLobbyVisible()) syncPending(); }, 15000);
  setTimeout(syncPending, 500);

  // Live quiz watchdog.
  let quizDeadline = 0;
  let lastRecovery = 0;
  let hostRevealTimer = null;

  async function recoverQuizState() {
    if (!window.socket?.connected || Date.now() - lastRecovery < 2500) return;
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
      if (player?.code && player?.reconnectToken) socket.emit('player:reconnect', { ...player, idToken }, () => {});
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
    if (q('#questionScreen')?.classList.contains('active') || q('#resultScreen')?.classList.contains('active')) setTimeout(recoverQuizState, 250);
  });

  setInterval(() => {
    if (q('#questionScreen')?.classList.contains('active') && quizDeadline && Date.now() > quizDeadline + 3000) recoverQuizState();
  }, 3000);

  // Host-as-player bridge: the host keeps control on the main socket and competes through
  // a lightweight second socket using the same verified account. No server game logic changes.
  let participantSocket = null;
  let participantReady = false;
  let participantJoinInFlight = false;
  let participantCode = null;
  const PARTICIPANT_KEY = 'quizHostParticipant';

  function participantSaved() {
    try { return JSON.parse(sessionStorage.getItem(PARTICIPANT_KEY) || localStorage.getItem(PARTICIPANT_KEY) || 'null'); }
    catch { return null; }
  }
  function saveParticipant(data) {
    try { sessionStorage.setItem(PARTICIPANT_KEY, JSON.stringify(data)); localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(data)); } catch {}
  }
  function clearParticipant() {
    participantReady = false; participantJoinInFlight = false; participantCode = null;
    try { sessionStorage.removeItem(PARTICIPANT_KEY); localStorage.removeItem(PARTICIPANT_KEY); } catch {}
    try { participantSocket?.disconnect(); } catch {}
    participantSocket = null;
  }

  async function getIdToken() {
    try { return await window.IAmOmaniFirebase?.user?.getIdToken(); } catch { return null; }
  }

  async function ensureHostParticipant() {
    const host = hostSession();
    const user = window.IAmOmaniFirebase?.user;
    if (!host?.code || !user || participantJoinInFlight || participantReady) return;
    participantCode = host.code;
    participantJoinInFlight = true;

    if (!participantSocket) {
      participantSocket = io({ transports:['websocket','polling'], forceNew:true, reconnection:true });
      participantSocket.on('join:approved', payload => {
        participantReady = true;
        participantJoinInFlight = false;
        const reconnectToken = payload?.reconnectToken;
        if (reconnectToken) saveParticipant({ code: participantCode, reconnectToken });
        try { if (payload?.room && typeof renderRoom === 'function') renderRoom(payload.room); } catch {}
      });
      participantSocket.on('disconnect', () => { participantReady = false; });
      participantSocket.on('connect', async () => {
        const saved = participantSaved();
        const token = await getIdToken();
        if (!token || !participantCode) return;
        if (saved?.code === participantCode && saved?.reconnectToken) {
          participantSocket.emit('player:reconnect', { code:participantCode, reconnectToken:saved.reconnectToken, idToken:token }, res => {
            participantJoinInFlight = false;
            if (res?.ok) {
              participantReady = true;
              try { if (res.room && typeof renderRoom === 'function') renderRoom(res.room); } catch {}
            } else {
              try { sessionStorage.removeItem(PARTICIPANT_KEY); localStorage.removeItem(PARTICIPANT_KEY); } catch {}
              requestParticipantJoin();
            }
          });
        } else requestParticipantJoin();
      });
    } else if (participantSocket.connected) requestParticipantJoin();
  }

  async function requestParticipantJoin() {
    const host = hostSession();
    if (!participantSocket?.connected || !host?.code) { participantJoinInFlight = false; return; }
    const idToken = await getIdToken();
    if (!idToken) { participantJoinInFlight = false; return; }
    participantJoinInFlight = true;
    participantSocket.emit('player:requestJoin', { code:host.code, idToken, avatar:window.OMANI_AVATAR?.() || 'OM1' }, res => {
      if (!res?.ok) {
        participantJoinInFlight = false;
        if (!/موجود في المجلس|قيد الانتظار/.test(res?.error || '')) setTimeout(ensureHostParticipant, 1200);
      }
    });
  }

  // Automatically approve only the host's own shadow-seat request.
  socket.on('host:pending', items => {
    const userUid = window.IAmOmaniFirebase?.user?.uid;
    if (!userUid || !participantSocket || participantReady) return;
    const mine = (Array.isArray(items) ? items : []).find(item => item?.uid === userUid);
    if (!mine) return;
    socket.emit('host:approveJoin', { requestId: mine.id }, res => {
      if (!res?.ok) participantJoinInFlight = false;
    });
  });

  // Host lobby/room updates are enough to create the host's participant seat once.
  socket.on('room:update', room => {
    const host = hostSession();
    if (!host || room?.code !== host.code) return;
    if (room.status === 'lobby') {
      const uid = window.IAmOmaniFirebase?.user?.uid;
      const alreadyListed = uid && room.players?.some?.(p => p.uid === uid);
      if (alreadyListed) participantReady = true;
      else if (!participantReady) setTimeout(ensureHostParticipant, 120);
    }
  });

  // Let the host answer from the same screen while preserving host controls.
  function bindHostAnswerButtons() {
    if (!hostSession() || !participantReady) return;
    const buttons = [...document.querySelectorAll('#answers .answer-btn')];
    buttons.forEach((button, index) => {
      button.onclick = () => {
        if (!participantReady || !participantSocket?.connected || button.disabled) return;
        buttons.forEach(x => { x.disabled = true; });
        button.classList.add('chosen');
        try { if (typeof state !== 'undefined') state.lastAnswer = index; } catch {}
        try { window.GameSFX?.play?.('quiz-answer'); } catch {}
        participantSocket.emit('player:answer', { answer:index }, res => {
          if (res?.ok) {
            try { toast('تم تثبيت إجابتك ⚡'); } catch {}
          } else {
            buttons.forEach(x => { x.disabled = false; });
          }
        });
      };
    });
  }
  socket.on('quiz:question', () => setTimeout(bindHostAnswerButtons, 0));

  socket.on('room:closed', clearParticipant);
  window.addEventListener('beforeunload', () => { try { participantSocket?.disconnect(); } catch {} });
  setTimeout(ensureHostParticipant, 900);
})();
