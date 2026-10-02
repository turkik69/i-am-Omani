(() => {
  const hostPanel = document.querySelector('#hostCreateScreen .panel');
  const joinPanel = document.querySelector('#joinScreen .panel');
  const hostLobby = document.querySelector('#hostLobbyScreen .dashboard-grid');
  const app = document.querySelector('#app');
  if (!hostPanel || !joinPanel || !hostLobby || !app) return;

  let locations = [];
  let councils = [];
  let selectedCouncilCode = '';

  const createButton = document.querySelector('#createRoomBtn');
  const quizTitle = document.querySelector('#quizTitle');
  createButton?.insertAdjacentHTML('beforebegin', `
    <div class="council-create-fields">
      <label>اختر الولاية</label>
      <select id="hostWilaya" class="oman-select"><option value="">اختر الولاية</option></select>
      <label>اختر المجلس / القرية</label>
      <select id="hostMajlis" class="oman-select" disabled>
        <option value="">اختر الولاية أولًا</option>
      </select>
      <input id="hostMajlisOther" class="hidden" maxlength="50" placeholder="اكتب اسم المجلس أو القرية" />
      <small class="field-note">تتغير قائمة القرى تلقائيًا حسب الولاية، ويمكن اختيار «أخرى» إذا لم يظهر الاسم.</small>
    </div>
  `);

  const joinCode = document.querySelector('#joinCode');
  joinCode?.insertAdjacentHTML('beforebegin', `
    <div class="active-councils-block">
      <div class="section-title councils-title"><h3>🏘️ المجالس النشطة الآن</h3><button id="refreshCouncils" class="mini-btn" type="button">تحديث</button></div>
      <div id="activeCouncils" class="active-councils"><div class="empty-state">جارٍ البحث عن المجالس النشطة…</div></div>
      <div class="join-divider"><span>أو أدخل رمز المسابقة</span></div>
    </div>
  `);

  hostLobby.insertAdjacentHTML('afterbegin', `
    <div class="panel pending-panel">
      <div class="section-title"><h3>🛡️ طلبات الانضمام</h3><span id="pendingCount" class="pill">0</span></div>
      <p class="muted">لن يدخل أي لاعب إلى المجلس قبل موافقتك.</p>
      <div id="pendingRequests" class="pending-requests empty-state">لا توجد طلبات انتظار</div>
    </div>
  `);

  app.insertAdjacentHTML('beforeend', `
    <section id="joinApprovalScreen" class="screen compact-screen">
      <div class="panel approval-wait-panel">
        <div class="approval-emblem">🛡️</div>
        <h2>طلبك عند مشرف المجلس</h2>
        <p id="approvalRoomName">بانتظار الموافقة…</p>
        <div class="approval-loader"><span></span><span></span><span></span></div>
        <div class="waiting-note">سيتم إدخالك تلقائيًا فور قبول الطلب.</div>
        <button id="cancelJoinRequest" class="secondary-btn" type="button">إلغاء الطلب واختيار مجلس آخر</button>
      </div>
    </section>
  `);

  const hostWilaya = document.querySelector('#hostWilaya');
  const hostMajlis = document.querySelector('#hostMajlis');
  const hostMajlisOther = document.querySelector('#hostMajlisOther');
  const activeCouncils = document.querySelector('#activeCouncils');
  const refreshCouncils = document.querySelector('#refreshCouncils');
  const pendingRequests = document.querySelector('#pendingRequests');
  const pendingCount = document.querySelector('#pendingCount');
  const approvalRoomName = document.querySelector('#approvalRoomName');

  function showOnly(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelector(id)?.classList.add('active');
    window.scrollTo(0, 0);
  }

  async function loadLocations() {
    try {
      const res = await fetch('/api/oman-locations');
      locations = await res.json();
      const grouped = new Map();
      locations.forEach(x => {const key=x.governorate||'ولايات عُمان';grouped.set(key,[...(grouped.get(key)||[]),x])});
      hostWilaya.innerHTML = '<option value="">اختر الولاية</option>' + [...grouped].map(([governorate, entries]) =>
        `<optgroup label="محافظة ${esc(governorate)}">${entries.map(x => `<option value="${esc(x.wilayat)}">${esc(x.wilayat)}</option>`).join('')}</optgroup>`
      ).join('');
    } catch {
      toast('تعذر تحميل قائمة الولايات');
    }
  }

  function updateMajlisOptions() {
    const item = locations.find(x => x.wilayat === hostWilaya.value);
    const villages = item?.villages || [];
    hostMajlis.disabled = !hostWilaya.value;
    hostMajlisOther.classList.add('hidden');
    hostMajlisOther.value = '';
    if (!hostWilaya.value) {
      hostMajlis.innerHTML = '<option value="">اختر الولاية أولًا</option>';
      return;
    }
    hostMajlis.innerHTML = '<option value="">اختر المجلس / القرية</option>' +
      villages.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('') +
      '<option value="__other__">أخرى…</option>';
  }
  hostWilaya.addEventListener('change', updateMajlisOptions);
  hostMajlis.addEventListener('change', () => {
    const other = hostMajlis.value === '__other__';
    hostMajlisOther.classList.toggle('hidden', !other);
    if (other) setTimeout(() => hostMajlisOther.focus(), 30);
  });

  function renderCouncils(list) {
    councils = Array.isArray(list) ? list : [];
    if (!councils.length) {
      activeCouncils.innerHTML = '<div class="empty-state">لا توجد مجالس بانتظار لاعبين حاليًا. يمكنك الدخول بالرمز إذا أرسل لك المضيف رمزًا.</div>';
      return;
    }
    activeCouncils.innerHTML = councils.map(c => `
      <button type="button" class="council-card ${selectedCouncilCode===c.code?'selected':''}" data-council-code="${esc(c.code)}">
        <div class="council-pin">📍</div>
        <div class="council-copy"><strong>${esc(c.roomIdentity)}</strong><small>${esc(c.title.replace(c.roomIdentity,'').replace(/^\s*\|\s*/,'')) || 'مسابقة مفتوحة'}</small></div>
        <div class="council-live"><b>${c.players}</b><small>لاعب</small>${c.pending?`<span>${c.pending} انتظار</span>`:''}</div>
      </button>
    `).join('');
    activeCouncils.querySelectorAll('[data-council-code]').forEach(btn => btn.addEventListener('click', () => {
      selectedCouncilCode = btn.dataset.councilCode;
      document.querySelector('#joinCode').value = selectedCouncilCode;
      renderCouncils(councils);
      toast('تم اختيار المجلس');
    }));
  }

  function requestCouncils() {
    socket.emit('councils:list', res => { if (res?.ok) renderCouncils(res.councils); });
  }
  refreshCouncils?.addEventListener('click', requestCouncils);
  socket.on('councils:update', renderCouncils);

  createButton.onclick = () => {
    const title = quizTitle.value.trim();
    const wilayat = hostWilaya.value.trim();
    const village = hostMajlis.value === '__other__' ? hostMajlisOther.value.trim() : hostMajlis.value.trim();
    if (!wilayat) return toast('اختر الولاية أولًا');
    if (!village) return toast('اختر المجلس أو القرية');
    socket.emit('host:create', { title, wilayat, village }, res => {
      if (!res.ok) return toast(res.error || 'تعذر إنشاء المسابقة');
      setRole('host');
      state.code = res.code;
      state.hostToken = res.hostToken;
      localStorage.removeItem('quizPlayer');
      sessionStorage.removeItem('quizPlayer');
      sessionStorage.setItem('quizHost',JSON.stringify({code:res.code,hostToken:res.hostToken}));
      localStorage.setItem('quizHost', JSON.stringify({code:res.code,hostToken:res.hostToken}));
      renderRoom(res.room);
      show('hostLobby');
      SFX.start();
    });
  };

  const joinButton = document.querySelector('#joinRoomBtn');
  joinButton.textContent = '🛡️ إرسال طلب الانضمام';
  joinButton.onclick = () => {
    const code = document.querySelector('#joinCode').value.trim();
    const name = document.querySelector('#playerName').value.trim();
    if (!code) return toast('اختر مجلسًا أو أدخل رمز المسابقة');
    if (!name) return toast('اكتب اسمك');
    socket.emit('player:requestJoin', {code,name,avatar:state.avatar}, res => {
      if (!res.ok) return toast(res.error || 'تعذر إرسال الطلب');
      state.code = code;
      approvalRoomName.textContent = res.room?.roomIdentity || 'المجلس المختار';
      showOnly('#joinApprovalScreen');
      toast('تم إرسال طلب الانضمام للمشرف');
    });
  };

  document.querySelector('#cancelJoinRequest')?.addEventListener('click', () => {
    socket.emit('player:cancelJoin', {}, () => {
      state.code = null;
      selectedCouncilCode = '';
      document.querySelector('#joinCode').value = '';
      show('join');
      requestCouncils();
    });
  });

  socket.on('join:approved', payload => {
    const res = payload || {};
    state.player = res.player;
    state.code = res.room?.code || state.code;
    state.playerToken = res.reconnectToken;
    localStorage.removeItem('quizHost');
    sessionStorage.removeItem('quizHost');
    sessionStorage.setItem('quizPlayer',JSON.stringify({code:state.code,reconnectToken:res.reconnectToken}));
    localStorage.setItem('quizPlayer',JSON.stringify({code:state.code,reconnectToken:res.reconnectToken}));
    setRole('player');
    renderRoom(res.room);
    document.querySelector('#myAvatar').innerHTML = avatarHTML(state.avatar);
    document.querySelector('#myName').textContent = `${res.player?.name || ''} — تم قبولك في المجلس`;
    document.querySelector('#playerCode').textContent = state.code || '------';
    show('playerLobby');
    SFX.join();
    toast('✅ وافق مشرف المجلس على دخولك');
  });

  socket.on('join:rejected', payload => {
    state.code = null;
    selectedCouncilCode = '';
    document.querySelector('#joinCode').value = '';
    show('join');
    requestCouncils();
    toast(payload?.message || 'تم رفض طلب الانضمام');
  });

  function renderPending(list) {
    const items = Array.isArray(list) ? list : [];
    pendingCount.textContent = items.length;
    pendingRequests.classList.toggle('empty-state', !items.length);
    if (!items.length) {
      pendingRequests.innerHTML = 'لا توجد طلبات انتظار';
      return;
    }
    pendingRequests.innerHTML = items.map(r => `
      <div class="pending-card">
        <div class="pending-avatar">${avatarHTML(r.avatar)}</div>
        <div class="pending-info"><strong>${esc(r.name)}</strong><small>بانتظار موافقتك</small></div>
        <div class="pending-actions">
          <button type="button" class="approve-btn" data-approve="${esc(r.id)}">قبول</button>
          <button type="button" class="reject-btn" data-reject="${esc(r.id)}">رفض</button>
        </div>
      </div>
    `).join('');
    pendingRequests.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => socket.emit('host:approveJoin',{requestId:b.dataset.approve},res=>{if(!res.ok)toast(res.error)}));
    pendingRequests.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => socket.emit('host:rejectJoin',{requestId:b.dataset.reject},res=>{if(!res.ok)toast(res.error)}));
  }
  socket.on('host:pending', renderPending);

  document.querySelectorAll('[data-open="join"]').forEach(btn => btn.addEventListener('click', () => setTimeout(requestCouncils, 50)));
  loadLocations();
  requestCouncils();
})();
