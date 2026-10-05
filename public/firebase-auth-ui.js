(() => {
  const state = { firebase:null, user:null, profile:null, verificationSentAt:0, resendTimer:null };

  const gate = document.createElement('div');
  gate.id='authGate';
  gate.className='auth-gate auth-hidden';
  gate.innerHTML=`
    <div class="auth-card">
      <div class="auth-brand">
        <div class="mark">ع</div>
        <h1>أنا عُماني</h1>
        <p>حساب واحد لمستواك، شاراتك، نقاطك ومسابقاتك على أي جهاز</p>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab active" data-auth-tab="login">تسجيل الدخول</button>
        <button class="auth-tab" data-auth-tab="register">حساب جديد</button>
      </div>
      <form id="loginForm" class="auth-form active">
        <label>اسم المستخدم أو البريد</label><input id="loginUsername" autocomplete="username" placeholder="مثال: turki" required>
        <label>الرمز السري</label><input id="loginPassword" type="password" autocomplete="current-password" placeholder="••••••••" required>
        <button class="auth-submit" type="submit">دخول</button>
        <div class="auth-links"><button class="auth-link" type="button" id="forgotUsername">نسيت اسم المستخدم</button><button class="auth-link" type="button" id="forgotPassword">نسيت الرمز السري</button></div>
      </form>
      <form id="registerForm" class="auth-form">
        <label>اسم المستخدم</label><input id="regUsername" autocomplete="username" maxlength="24" required>
        <label>البريد الإلكتروني</label><input id="regEmail" type="email" autocomplete="email" required>
        <label>تأكيد البريد الإلكتروني</label><input id="regEmailConfirm" type="email" autocomplete="email" required>
        <label>الرمز السري</label><input id="regPassword" type="password" autocomplete="new-password" minlength="8" required>
        <button class="auth-submit" type="submit">إنشاء الحساب وإرسال رسالة التأكيد</button>
      </form>
      <form id="recoveryForm" class="auth-form">
        <p id="recoveryHint"></p>
        <label>البريد الإلكتروني المسجل</label><input id="recoveryEmail" type="email" autocomplete="email" required>
        <button class="auth-submit" type="submit">إرسال رابط الاسترجاع</button>
        <button class="auth-link" type="button" id="backToLogin">العودة لتسجيل الدخول</button>
      </form>
      <div id="verifyPane" class="auth-form">
        <p>أرسلنا رسالة تأكيد إلى:</p>
        <strong id="verifyEmailTarget" style="display:block;direction:ltr;text-align:center;margin:8px 0 14px;word-break:break-all"></strong>
        <p style="font-size:.9em;opacity:.82">افتح رابط التأكيد ثم ارجع للتطبيق واضغط «تحققت من بريدي». إذا لم تصل الرسالة، انتظر دقيقة ثم أعد الإرسال.</p>
        <button class="auth-submit" type="button" id="checkVerified">تحققت من بريدي</button>
        <button class="auth-link" type="button" id="resendVerification">إعادة إرسال التأكيد</button>
        <div id="resendHint" style="font-size:.85em;opacity:.72;text-align:center;margin-top:6px"></div>
        <button class="auth-link" type="button" id="verifySignOut">تسجيل الخروج</button>
      </div>
      <div id="authStatus" class="auth-status" role="status" aria-live="polite"></div>
      <div class="auth-note">سيُستخدم بريدك لتأكيد الحساب واسترجاعه، ولن يظهر للاعبين. <a href="/account-deletion.html">طريقة حذف الحساب</a></div>
    </div>`;
  document.body.appendChild(gate);

  const $ = s=>document.querySelector(s);
  const showStatus = msg=>{const el=$('#authStatus');el.textContent=msg;el.classList.toggle('show',!!msg)};
  const friendlyError = err=>{
    const code=err?.code||'';
    if(code.includes('too-many-requests')) return 'تم طلب رسائل كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مجددًا.';
    if(code.includes('invalid-email')) return 'صيغة البريد الإلكتروني غير صحيحة.';
    if(code.includes('email-already-in-use')) return 'هذا البريد مسجل مسبقًا. جرّب تسجيل الدخول بدل إنشاء حساب جديد.';
    if(code.includes('permission-denied')) return 'تعذر إكمال إنشاء الحساب بسبب صلاحيات قاعدة البيانات. تم تصحيح هذا الخلل، حدّث الصفحة وحاول مرة أخرى.';
    if(code.includes('network-request-failed')) return 'تعذر الاتصال بخدمة البريد. تحقق من الإنترنت ثم أعد المحاولة.';
    if(code.includes('user-token-expired')||code.includes('requires-recent-login')) return 'انتهت جلسة الحساب. سجل الدخول من جديد ثم أعد المحاولة.';
    return err?.message||'حدث خطأ غير متوقع';
  };
  function showPane(id){document.querySelectorAll('.auth-form').forEach(x=>x.classList.toggle('active',x.id===id));showStatus('');if(id==='verifyPane')updateVerifyTarget();}
  function updateVerifyTarget(){const email=state.user?.email||'';const el=$('#verifyEmailTarget');if(el)el.textContent=email;}
  function startResendCooldown(seconds=60){
    clearInterval(state.resendTimer);state.verificationSentAt=Date.now();
    const btn=$('#resendVerification'),hint=$('#resendHint');
    const tick=()=>{const left=Math.max(0,seconds-Math.floor((Date.now()-state.verificationSentAt)/1000));if(btn){btn.disabled=left>0;btn.textContent=left>0?`إعادة الإرسال بعد ${left} ث`:'إعادة إرسال التأكيد';}if(hint)hint.textContent=left>0?'لتجنب حظر البريد، يمكن إعادة الإرسال بعد انتهاء العد التنازلي.':'';if(!left){clearInterval(state.resendTimer);state.resendTimer=null;}};
    tick();state.resendTimer=setInterval(tick,1000);
  }
  async function sendVerification(user,{initial=false}={}){
    if(!user) throw new Error('لا توجد جلسة مستخدم نشطة');
    updateVerifyTarget();
    await state.firebase.authMod.sendEmailVerification(user);
    startResendCooldown(60);
    const email=user.email||'بريدك المسجل';
    showStatus(initial?`تم إنشاء الحساب وقبلت خدمة البريد طلب إرسال رسالة التأكيد إلى ${email}. قد تتأخر الرسالة قليلًا حسب مزود البريد.`:`تم قبول طلب إعادة إرسال رسالة التأكيد إلى ${email}.`);
  }

  document.querySelectorAll('[data-auth-tab]').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('.auth-tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    showPane(btn.dataset.authTab==='login'?'loginForm':'registerForm');
  });

  async function initFirebase(){
    try{
      const response=await fetch('/api/firebase-config',{cache:'no-store'});
      if(!response.ok)return;
      const FIREBASE_CONFIG=await response.json();
      const appMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js');
      const authMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js');
      const dbMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js');
      const app=appMod.initializeApp(FIREBASE_CONFIG);
      const auth=authMod.getAuth(app), db=dbMod.getFirestore(app);
      auth.languageCode='ar';
      state.firebase={auth,db,authMod,dbMod};
      authMod.onAuthStateChanged(auth,async user=>{
        state.user=user||null;state.profile=null;
        if(user?.emailVerified){
          try{const snap=await dbMod.getDocFromServer(dbMod.doc(db,'users',user.uid));state.profile=snap.exists()?snap.data():null;}
          catch(error){console.error('Profile loading failed',error);showStatus('تعذر تحميل ملفك الشخصي.');}
          gate.classList.add('auth-hidden');
        }else{
          gate.classList.remove('auth-hidden');showPane(user?'verifyPane':'loginForm');
        }
        window.dispatchEvent(new CustomEvent('iam-omani-auth',{detail:{user:user?.emailVerified?user:null,firebase:state.firebase,profile:state.profile}}));
      });
    }catch(e){console.error(e);showStatus('تعذر تهيئة Firebase. راجع إعدادات الربط.');}
  }

  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      const f=state.firebase;if(!f) throw new Error('Firebase غير مربوط بعد');
      const identifier=$('#loginUsername').value.trim().toLowerCase();
      if(identifier.includes('@'))await f.authMod.signInWithEmailAndPassword(f.auth,identifier,$('#loginPassword').value);
      else{
        const response=await fetch('/api/auth/username-login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:identifier,password:$('#loginPassword').value})});
        const result=await response.json();if(!response.ok)throw new Error(result.error||'بيانات الدخول غير صحيحة');
        await f.authMod.signInWithCustomToken(f.auth,result.token);
      }
      $('#loginPassword').value='';
    }catch(err){showStatus(friendlyError(err)||'تعذر تسجيل الدخول');}
  });

  $('#registerForm').addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      const f=state.firebase;if(!f) throw new Error('Firebase غير مربوط بعد');
      const username=$('#regUsername').value.trim().toLowerCase(),email=$('#regEmail').value.trim().toLowerCase(),confirmEmail=$('#regEmailConfirm').value.trim().toLowerCase();
      if(!/^[a-z0-9_]{3,24}$/.test(username))throw new Error('اسم المستخدم من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو _');
      if(email!==confirmEmail)throw new Error('البريد الإلكتروني وتأكيد البريد غير متطابقين.');
      const cred=await f.authMod.createUserWithEmailAndPassword(f.auth,email,$('#regPassword').value);
      try{
        await f.dbMod.runTransaction(f.db,async transaction=>{
          const nameRef=f.dbMod.doc(f.db,'usernames',username);
          if((await transaction.get(nameRef)).exists())throw new Error('اسم المستخدم مستخدم بالفعل');
          transaction.set(nameRef,{uid:cred.user.uid});
          transaction.set(f.dbMod.doc(f.db,'users',cred.user.uid),{username,email,phone:'',xp:0,level:1,badges:[],createdAt:f.dbMod.serverTimestamp()});
        });
      }catch(error){await f.authMod.deleteUser(cred.user).catch(()=>{});throw error;}
      $('#regPassword').value='';showPane('verifyPane');
      await sendVerification(cred.user,{initial:true});
    }catch(err){showStatus(friendlyError(err)||'تعذر إنشاء الحساب');}
  });

  $('#forgotPassword').onclick=()=>{$('#recoveryHint').textContent='سنرسل رابط تغيير كلمة المرور إلى بريدك.';showPane('recoveryForm')};
  $('#forgotUsername').onclick=()=>{$('#recoveryHint').textContent='أدخل بريد حسابك لاستلام رابط استرجاع الوصول. بعد تسجيل الدخول بالبريد، سيظهر اسم المستخدم في ملفك الشخصي.';showPane('recoveryForm')};
  $('#backToLogin').onclick=()=>showPane('loginForm');
  $('#recoveryForm').onsubmit=async e=>{e.preventDefault();try{await state.firebase.authMod.sendPasswordResetEmail(state.firebase.auth,$('#recoveryEmail').value.trim());showStatus('إذا كان البريد مسجلاً، ستصلك رسالة الاسترجاع. بعد التعيين ادخل ببريدك.')}catch(error){showStatus(friendlyError(error)||'تعذر إرسال الرابط')}};
  $('#checkVerified').onclick=async()=>{try{await state.firebase.authMod.reload(state.user);if(!state.user.emailVerified)return showStatus('لم يُؤكد البريد بعد. افتح رابط التأكيد في البريد ثم أعد المحاولة.');const f=state.firebase;const snap=await f.dbMod.getDoc(f.dbMod.doc(f.db,'users',state.user.uid));state.profile=snap.data()||null;gate.classList.add('auth-hidden');window.dispatchEvent(new CustomEvent('iam-omani-auth',{detail:{user:state.user,firebase:f,profile:state.profile}}))}catch(error){showStatus(friendlyError(error)||'تعذر التحقق')}};
  $('#resendVerification').onclick=async()=>{try{if(!state.user)return showStatus('سجل الدخول أولًا.');await state.firebase.authMod.reload(state.user);if(state.user.emailVerified){gate.classList.add('auth-hidden');return;}await sendVerification(state.user);}catch(error){showStatus(friendlyError(error)||'تعذر الإرسال')}};
  $('#verifySignOut').onclick=()=>state.firebase.authMod.signOut(state.firebase.auth);

  window.IAmOmaniFirebase=state;
  initFirebase();
})();