(() => {
  const state = { firebase:null, user:null, profile:null };

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
        <label>رقم الهاتف</label><input id="regPhone" inputmode="tel" autocomplete="tel" placeholder="+968 ..." required>
        <label>البريد الإلكتروني</label><input id="regEmail" type="email" autocomplete="email" required>
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
        <p>افتح رابط التأكيد في بريدك ثم اضغط هنا:</p>
        <button class="auth-submit" type="button" id="checkVerified">تحققت من بريدي</button>
        <button class="auth-link" type="button" id="resendVerification">إعادة إرسال التأكيد</button>
        <button class="auth-link" type="button" id="verifySignOut">تسجيل الخروج</button>
      </div>
      <div id="authStatus" class="auth-status" role="status" aria-live="polite"></div>
      <div class="auth-note">سيُستخدم بريدك لتأكيد الحساب واسترجاعه، ولن يظهر للاعبين.</div>
    </div>`;
  document.body.appendChild(gate);

  const $ = s=>document.querySelector(s);
  const showStatus = msg=>{const el=$('#authStatus');el.textContent=msg;el.classList.toggle('show',!!msg)};
  function showPane(id){document.querySelectorAll('.auth-form').forEach(x=>x.classList.toggle('active',x.id===id));showStatus('');}
  document.querySelectorAll('[data-auth-tab]').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('.auth-tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    showPane(btn.dataset.authTab==='login'?'loginForm':'registerForm');
  });

  async function initFirebase(){
    try{
      const response=await fetch('/api/firebase-config',{cache:'no-store'});
      if(!response.ok)return; // Keep the existing game accessible while project setup is pending.
      const FIREBASE_CONFIG=await response.json();
      const appMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js');
      const authMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js');
      const dbMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js');
      const app=appMod.initializeApp(FIREBASE_CONFIG);
      const auth=authMod.getAuth(app), db=dbMod.getFirestore(app);
      state.firebase={auth,db,authMod,dbMod};
      authMod.onAuthStateChanged(auth,async user=>{
        state.user=user||null;
        state.profile=null;
        if(user?.emailVerified){
          try{const snap=await dbMod.getDoc(dbMod.doc(db,'users',user.uid));state.profile=snap.exists()?snap.data():null;}
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
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||'بيانات الدخول غير صحيحة');
        await f.authMod.signInWithCustomToken(f.auth,result.token);
      }
      $('#loginPassword').value='';
    }catch(err){showStatus(err.message||'تعذر تسجيل الدخول');}
  });

  $('#registerForm').addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      const f=state.firebase;if(!f) throw new Error('Firebase غير مربوط بعد');
      const username=$('#regUsername').value.trim().toLowerCase(), email=$('#regEmail').value.trim().toLowerCase(), phone=$('#regPhone').value.trim();
      if(!/^[a-z0-9_]{3,24}$/.test(username))throw new Error('اسم المستخدم من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو _');
      if(!/^\+?[0-9\s-]{7,20}$/.test(phone))throw new Error('رقم الهاتف غير صالح');
      const cred=await f.authMod.createUserWithEmailAndPassword(f.auth,email,$('#regPassword').value);
      try{
        await f.dbMod.runTransaction(f.db,async transaction=>{
          const nameRef=f.dbMod.doc(f.db,'usernames',username);
          if((await transaction.get(nameRef)).exists())throw new Error('اسم المستخدم مستخدم بالفعل');
          transaction.set(nameRef,{uid:cred.user.uid});
          transaction.set(f.dbMod.doc(f.db,'users',cred.user.uid),{username,email,phone,xp:0,level:1,badges:[],createdAt:f.dbMod.serverTimestamp()});
        });
      }catch(error){await f.authMod.deleteUser(cred.user).catch(()=>{});throw error;}
      await f.authMod.sendEmailVerification(cred.user);
      $('#regPassword').value='';showPane('verifyPane');showStatus('تم إنشاء الحساب وإرسال رسالة التأكيد إلى بريدك الإلكتروني.');
    }catch(err){showStatus(err.message||'تعذر إنشاء الحساب');}
  });

  $('#forgotPassword').onclick=()=>{$('#recoveryHint').textContent='سنرسل رابط تغيير كلمة المرور إلى بريدك.';showPane('recoveryForm')};
  $('#forgotUsername').onclick=()=>{$('#recoveryHint').textContent='سنرسل رابط استرجاع الحساب إلى بريدك. بعد إعادة تعيين كلمة المرور ادخل ببريدك وسيظهر اسم المستخدم في ملفك.';showPane('recoveryForm')};
  $('#backToLogin').onclick=()=>showPane('loginForm');
  $('#recoveryForm').onsubmit=async e=>{e.preventDefault();try{await state.firebase.authMod.sendPasswordResetEmail(state.firebase.auth,$('#recoveryEmail').value.trim());showStatus('إذا كان البريد مسجلاً، ستصلك رسالة الاسترجاع. بعد التعيين ادخل ببريدك.')}catch(error){showStatus(error.message||'تعذر إرسال الرابط')}};
  $('#checkVerified').onclick=async()=>{try{await state.firebase.authMod.reload(state.user);if(!state.user.emailVerified)return showStatus('لم يُؤكد البريد بعد. افتح الرابط وأعد المحاولة.');const f=state.firebase;const snap=await f.dbMod.getDoc(f.dbMod.doc(f.db,'users',state.user.uid));state.profile=snap.data()||null;gate.classList.add('auth-hidden');window.dispatchEvent(new CustomEvent('iam-omani-auth',{detail:{user:state.user,firebase:f,profile:state.profile}}))}catch(error){showStatus(error.message||'تعذر التحقق')}};
  $('#resendVerification').onclick=async()=>{try{await state.firebase.authMod.sendEmailVerification(state.user);showStatus('أُعيد إرسال رسالة التأكيد.')}catch(error){showStatus(error.message||'تعذر الإرسال')}};
  $('#verifySignOut').onclick=()=>state.firebase.authMod.signOut(state.firebase.auth);

  window.IAmOmaniFirebase=state;
  initFirebase();
})();
