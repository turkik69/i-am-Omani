(() => {
  const FIREBASE_CONFIG = window.IAM_OMANI_FIREBASE || null;
  const state = { ready:false, firebase:false, user:null };

  const gate = document.createElement('div');
  gate.id='authGate';
  gate.className='auth-gate';
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
        <label>اسم المستخدم</label><input id="loginUsername" autocomplete="username" placeholder="مثال: turki" required>
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
      <div id="authStatus" class="auth-status"></div>
      <div class="auth-note">سيُستخدم بريدك فقط لتأكيد الحساب واسترجاع اسم المستخدم أو الرمز السري. يمكن إضافة Face ID / البصمة بعد تفعيل Passkey للحساب.</div>
    </div>`;
  document.body.appendChild(gate);

  const $ = s=>document.querySelector(s);
  const showStatus = msg=>{const el=$('#authStatus');el.textContent=msg;el.classList.add('show')};
  document.querySelectorAll('[data-auth-tab]').forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll('.auth-tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(x=>x.classList.remove('active'));
    document.querySelector(btn.dataset.authTab==='login'?'#loginForm':'#registerForm').classList.add('active');
    $('#authStatus').classList.remove('show');
  });

  async function initFirebase(){
    if(!FIREBASE_CONFIG){showStatus('واجهة الحساب جاهزة. بقي ربط إعدادات Firebase بالمشروع لتفعيل التسجيل الحقيقي عبر الأجهزة.');return;}
    try{
      const appMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js');
      const authMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js');
      const dbMod=await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js');
      const app=appMod.initializeApp(FIREBASE_CONFIG);
      const auth=authMod.getAuth(app), db=dbMod.getFirestore(app);
      state.firebase={auth,db,authMod,dbMod};
      authMod.onAuthStateChanged(auth,async user=>{
        state.user=user||null;
        if(user){ gate.classList.add('auth-hidden'); localStorage.setItem('iamOmaniSignedIn','1'); }
        else gate.classList.remove('auth-hidden');
      });
    }catch(e){console.error(e);showStatus('تعذر تهيئة Firebase. راجع إعدادات الربط.');}
  }

  async function usernameToEmail(username){
    const f=state.firebase;if(!f) throw new Error('Firebase غير مربوط بعد');
    const q=f.dbMod.query(f.dbMod.collection(f.db,'usernames'),f.dbMod.where('username','==',username.trim().toLowerCase()));
    const snap=await f.dbMod.getDocs(q); if(snap.empty) throw new Error('اسم المستخدم غير موجود');
    return snap.docs[0].data().email;
  }

  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      const f=state.firebase;if(!f) throw new Error('Firebase غير مربوط بعد');
      const email=await usernameToEmail($('#loginUsername').value);
      await f.authMod.signInWithEmailAndPassword(f.auth,email,$('#loginPassword').value);
    }catch(err){showStatus(err.message||'تعذر تسجيل الدخول');}
  });

  $('#registerForm').addEventListener('submit',async e=>{
    e.preventDefault();
    try{
      const f=state.firebase;if(!f) throw new Error('Firebase غير مربوط بعد');
      const username=$('#regUsername').value.trim().toLowerCase(), email=$('#regEmail').value.trim().toLowerCase(), phone=$('#regPhone').value.trim();
      const existing=await f.dbMod.getDocs(f.dbMod.query(f.dbMod.collection(f.db,'usernames'),f.dbMod.where('username','==',username)));
      if(!existing.empty) throw new Error('اسم المستخدم مستخدم بالفعل');
      const cred=await f.authMod.createUserWithEmailAndPassword(f.auth,email,$('#regPassword').value);
      await f.authMod.sendEmailVerification(cred.user);
      await f.dbMod.setDoc(f.dbMod.doc(f.db,'users',cred.user.uid),{username,email,phone,xp:0,level:1,badges:[],createdAt:f.dbMod.serverTimestamp()});
      await f.dbMod.addDoc(f.dbMod.collection(f.db,'usernames'),{username,email,uid:cred.user.uid});
      showStatus('تم إنشاء الحساب وإرسال رسالة تأكيد إلى بريدك الإلكتروني.');
    }catch(err){showStatus(err.message||'تعذر إنشاء الحساب');}
  });

  $('#forgotPassword').onclick=async()=>{
    const id=prompt('اكتب اسم المستخدم'); if(!id) return;
    try{const f=state.firebase;if(!f)throw new Error('Firebase غير مربوط بعد');const email=await usernameToEmail(id);await f.authMod.sendPasswordResetEmail(f.auth,email);showStatus('تم إرسال رابط إعادة تعيين الرمز السري إلى بريدك.')}catch(e){showStatus(e.message||'تعذر إرسال الرسالة')}
  };
  $('#forgotUsername').onclick=()=>showStatus('استرجاع اسم المستخدم عبر البريد سيُفعّل مباشرة بعد ربط Firebase ووظيفة البريد الآمنة.');

  initFirebase();
})();
