(() => {
  const $ = s => document.querySelector(s);
  const api = window.supabase;
  const authState = { client:null, profile:null, ready:false };

  async function getConfig(){
    try{ const r=await fetch('/api/auth-config'); if(!r.ok)return null; return await r.json(); }catch{return null;}
  }

  function injectUI(){
    if($('#accountBtn')) return;
    const top=$('.top-actions');
    const btn=document.createElement('button'); btn.id='accountBtn'; btn.className='icon-btn'; btn.title='حساب اللاعب'; btn.textContent='👤'; top?.prepend(btn);
    document.body.insertAdjacentHTML('beforeend', `
      <div id="authModal" class="auth-modal hidden" aria-hidden="true">
        <div class="auth-card">
          <button id="authClose" class="auth-close">✕</button>
          <div class="auth-brand"><img src="/sahwa-tower.svg" alt="برج الصحوة"><div><b>أنا عُماني</b><small>I Am Omani</small></div></div>
          <div id="authSignedOut">
            <div class="auth-tabs"><button data-auth-tab="login" class="active">تسجيل الدخول</button><button data-auth-tab="signup">حساب جديد</button></div>
            <div id="authLoginPane" class="auth-pane active">
              <label>اسم المستخدم</label><input id="loginUsername" autocomplete="username" placeholder="مثال: turki69">
              <label>الرمز السري</label><input id="loginPassword" type="password" autocomplete="current-password" placeholder="••••••••">
              <button id="loginBtn" class="primary-btn">دخول</button>
              <button id="passkeyLoginBtn" class="secondary-btn">🙂 الدخول بالبصمة / Face ID</button>
              <button id="forgotBtn" class="auth-link">نسيت اسم المستخدم أو الرمز السري؟</button>
            </div>
            <div id="authSignupPane" class="auth-pane">
              <label>اسم المستخدم</label><input id="signupUsername" maxlength="24" autocomplete="username" placeholder="حروف إنجليزية وأرقام فقط">
              <label>رقم الهاتف</label><input id="signupPhone" inputmode="tel" autocomplete="tel" placeholder="+968...">
              <label>البريد الإلكتروني للاسترجاع</label><input id="signupEmail" type="email" autocomplete="email" placeholder="name@example.com">
              <label>الرمز السري</label><input id="signupPassword" type="password" autocomplete="new-password" placeholder="8 أحرف أو أكثر">
              <button id="signupBtn" class="primary-btn">إنشاء الحساب</button>
              <p class="auth-note">سنرسل رسالة تأكيد إلى بريدك. بعد تأكيده يمكنك استخدام الحساب من أي جهاز.</p>
            </div>
            <div id="authRecoveryPane" class="auth-pane">
              <h3>استرجاع الحساب</h3><p class="auth-note">أدخل البريد المسجل، وسنرسل لك رابط استرجاع آمن. بعد فتحه سيظهر اسم المستخدم ويمكنك تعيين رمز سري جديد.</p>
              <input id="recoveryEmail" type="email" autocomplete="email" placeholder="البريد الإلكتروني">
              <button id="recoveryBtn" class="primary-btn">إرسال رابط الاسترجاع</button>
              <button id="backToLogin" class="auth-link">العودة لتسجيل الدخول</button>
            </div>
          </div>
          <div id="authSignedIn" class="hidden">
            <div class="player-account-head"><div id="accountAvatar" class="account-avatar">🇴🇲</div><div><h3 id="accountUsername">—</h3><p id="accountLevel">مستكشف عُمان</p></div></div>
            <div class="account-xp"><div><span>XP</span><b id="accountXp">0</b></div><div class="account-xp-bar"><i id="accountXpFill"></i></div></div>
            <button id="enablePasskeyBtn" class="primary-btn">🙂 تفعيل Face ID / البصمة لهذا الجهاز</button>
            <button id="signOutBtn" class="secondary-btn">تسجيل الخروج</button>
          </div>
          <div id="authStatus" class="auth-status"></div>
        </div>
      </div>`);
  }

  function showStatus(msg, bad=false){const el=$('#authStatus'); if(!el)return; el.textContent=msg||''; el.classList.toggle('bad',!!bad);}
  function open(){ $('#authModal')?.classList.remove('hidden'); $('#authModal')?.setAttribute('aria-hidden','false'); }
  function close(){ $('#authModal')?.classList.add('hidden'); $('#authModal')?.setAttribute('aria-hidden','true'); showStatus(''); }
  function tab(name){ document.querySelectorAll('.auth-pane').forEach(x=>x.classList.remove('active')); document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x.dataset.authTab===name)); $(`#auth${name[0].toUpperCase()+name.slice(1)}Pane`)?.classList.add('active'); }

  async function loadProfile(user){
    if(!user||!authState.client)return null;
    const {data}=await authState.client.from('player_profiles').select('*').eq('user_id',user.id).single(); authState.profile=data||null; renderSession(user); return data;
  }
  function renderSession(user){
    const signed=!!user;
    $('#authSignedOut')?.classList.toggle('hidden',signed); $('#authSignedIn')?.classList.toggle('hidden',!signed);
    if(!signed)return;
    const p=authState.profile||{}; $('#accountUsername').textContent=p.username||user.email||'لاعب'; $('#accountLevel').textContent=p.level_name||'مستكشف عُمان'; $('#accountXp').textContent=p.xp||0; $('#accountAvatar').textContent=p.avatar||'🇴🇲';
    const thresholds=[0,500,1500,3500,7000,12000,20000,35000]; const lv=Math.max(1,Math.min(8,p.level||1)); const lo=thresholds[lv-1], hi=thresholds[lv]||Math.max(lo+10000,(p.xp||0)+1); const pct=Math.max(0,Math.min(100,((p.xp||0)-lo)/(hi-lo)*100)); const fill=$('#accountXpFill'); if(fill)fill.style.width=`${pct}%`;
    const nameInput=$('#playerName'); if(nameInput&&p.username&&!nameInput.value) nameInput.value=p.username;
  }

  async function init(){
    injectUI();
    const config=await getConfig();
    if(!config?.url||!config?.publishableKey||!api?.createClient){ $('#accountBtn')?.classList.add('auth-unavailable'); return; }
    authState.client=api.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,experimental:{passkey:true}}}); authState.ready=true;
    const {data:{session}}=await authState.client.auth.getSession(); if(session?.user)await loadProfile(session.user); else renderSession(null);
    authState.client.auth.onAuthStateChange(async(_,session)=>{if(session?.user)await loadProfile(session.user);else{authState.profile=null;renderSession(null);}});

    $('#signupBtn').onclick=async()=>{
      const username=$('#signupUsername').value.trim().toLowerCase(), phone=$('#signupPhone').value.trim(), email=$('#signupEmail').value.trim(), password=$('#signupPassword').value;
      if(!/^[a-z0-9_]{3,24}$/.test(username))return showStatus('اسم المستخدم يجب أن يكون 3–24 حرفًا/رقمًا إنجليزيًا أو _',true);
      if(!phone||!email||password.length<8)return showStatus('أكمل الهاتف والبريد واجعل الرمز السري 8 أحرف على الأقل',true);
      showStatus('جارٍ إنشاء الحساب…');
      const {error}=await authState.client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/',data:{username,phone,display_name:username}}});
      if(error)return showStatus(error.message.includes('already')?'البريد أو اسم المستخدم مستخدم بالفعل':error.message,true);
      showStatus('تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.');
    };

    $('#loginBtn').onclick=async()=>{
      const username=$('#loginUsername').value.trim().toLowerCase(), password=$('#loginPassword').value;
      if(!username||!password)return showStatus('أدخل اسم المستخدم والرمز السري',true);
      showStatus('جارٍ تسجيل الدخول…');
      const r=await fetch('/api/auth/username-login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})}); const out=await r.json().catch(()=>({}));
      if(!r.ok)return showStatus(out.error||'بيانات الدخول غير صحيحة',true);
      const {error}=await authState.client.auth.setSession({access_token:out.access_token,refresh_token:out.refresh_token}); if(error)return showStatus(error.message,true); showStatus('تم تسجيل الدخول');
    };

    $('#forgotBtn').onclick=()=>{document.querySelectorAll('.auth-pane').forEach(x=>x.classList.remove('active'));$('#authRecoveryPane').classList.add('active');};
    $('#backToLogin').onclick=()=>tab('login');
    $('#recoveryBtn').onclick=async()=>{const email=$('#recoveryEmail').value.trim();if(!email)return showStatus('أدخل البريد الإلكتروني',true);const {error}=await authState.client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/?recovery=1'});showStatus(error?error.message:'تم إرسال رابط الاسترجاع إلى بريدك',!!error);};

    $('#passkeyLoginBtn').onclick=async()=>{showStatus('افتح Face ID أو البصمة…');const {error}=await authState.client.auth.signInWithPasskey();showStatus(error?error.message:'تم الدخول بالبصمة',!!error);};
    $('#enablePasskeyBtn').onclick=async()=>{showStatus('سيطلب الجهاز Face ID أو البصمة لتسجيل مفتاح الدخول…');const {error}=await authState.client.auth.registerPasskey();showStatus(error?error.message:'تم تفعيل الدخول بالبصمة لهذا الحساب',!!error);};
    $('#signOutBtn').onclick=async()=>{await authState.client.auth.signOut();close();};
  }

  document.addEventListener('click',e=>{if(e.target.closest('#accountBtn'))open();if(e.target.id==='authClose'||e.target.id==='authModal')close();if(e.target.matches('[data-auth-tab]'))tab(e.target.dataset.authTab);});
  window.IAmOmaniAuth=authState;
  init();
})();
