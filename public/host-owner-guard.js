(() => {
  if (window.__IAM_OMANI_HOST_OWNER_GUARD__) return;
  window.__IAM_OMANI_HOST_OWNER_GUARD__ = true;

  const $ = s => document.querySelector(s);
  const hostSession = () => {
    for (const store of [sessionStorage, localStorage]) {
      try {
        const value = JSON.parse(store.getItem('quizHost') || 'null');
        if (value?.code && value?.hostToken) return value;
      } catch {}
    }
    return null;
  };
  const ownCode = code => {
    const own = hostSession();
    return !!(own && String(own.code) === String(code || '').trim());
  };

  async function openHostControls(code) {
    const own = hostSession();
    if (!own || String(own.code) !== String(code || '').trim()) return false;
    if (typeof state !== 'undefined' && state.role === 'host' && String(state.code) === String(code)) {
      show('hostLobby');
      toast('هذا مجلسك — أنت مشرف المسابقة');
      return true;
    }
    const user = window.IAmOmaniFirebase?.user;
    if (!user) {
      toast('سجل الدخول لاستعادة إدارة المسابقة');
      return true;
    }
    let idToken;
    try { idToken = await user.getIdToken(); }
    catch { toast('تعذر التحقق من حساب المشرف'); return true; }
    socket.emit('host:reconnect', { code: own.code, hostToken: own.hostToken, idToken }, res => {
      if (!res?.ok) {
        toast(res?.error || 'تعذر استعادة إدارة المسابقة');
        return;
      }
      setRole('host');
      state.code = own.code;
      state.hostToken = own.hostToken;
      renderRoom(res.room);
      show('hostLobby');
      toast('تم فتح لوحة إدارة مسابقتك');
    });
    return true;
  }

  function decorateOwnCouncil() {
    const own = hostSession();
    if (!own) return;
    document.querySelectorAll('[data-council-code]').forEach(card => {
      const isOwn = String(card.dataset.councilCode) === String(own.code);
      card.classList.toggle('own-host-council', isOwn);
      if (!isOwn) return;
      card.dataset.ownHost = '1';
      let badge = card.querySelector('.own-host-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'own-host-badge';
        badge.textContent = 'أنت المشرف';
        const live = card.querySelector('.council-live') || card;
        live.appendChild(badge);
      }
    });
  }

  document.addEventListener('click', async e => {
    const card = e.target.closest?.('[data-council-code][data-own-host="1"]');
    if (card) {
      e.preventDefault();
      e.stopImmediatePropagation();
      await openHostControls(card.dataset.councilCode);
      return;
    }
    const join = e.target.closest?.('#joinRoomBtn');
    if (!join) return;
    const code = $('#joinCode')?.value?.trim();
    if (!ownCode(code)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    await openHostControls(code);
  }, true);

  const updateJoinButton = () => {
    const code = $('#joinCode')?.value?.trim();
    const button = $('#joinRoomBtn');
    if (!button) return;
    if (ownCode(code)) {
      button.dataset.ownerMode = '1';
      button.innerHTML = '<span>⚙️</span> إدارة مسابقتي';
    } else if (button.dataset.ownerMode === '1') {
      delete button.dataset.ownerMode;
      button.innerHTML = '<span>🛡️</span> إرسال طلب الانضمام';
    }
  };

  document.addEventListener('input', e => {
    if (e.target?.id === 'joinCode') updateJoinButton();
  });
  document.addEventListener('change', e => {
    if (e.target?.id === 'joinCode') updateJoinButton();
  });

  new MutationObserver(() => {
    decorateOwnCouncil();
    updateJoinButton();
  }).observe(document.documentElement, { subtree: true, childList: true });
  decorateOwnCouncil();
  updateJoinButton();
})();