(() => {
  const $ = s => document.querySelector(s);
  const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let me=null, editedPhoto;
  const auth = () => window.IAmOmaniFirebase?.user;
  const photo = p => p?.hasPhoto
    ? `<img src="/api/profile/${encodeURIComponent(p.uid)}/photo?v=${Date.now()}" alt="صورة اللاعب">`
    : window.avatarHTML?.(p?.avatar||'OM1')||'🇴🇲';
  async function api(url,options={}) {
    const user=auth();if(!user)throw new Error('سجل الدخول أولًا');
    const response=await fetch(url,{...options,headers:{'content-type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`,...options.headers}});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'تعذر تحميل البيانات');
    return data;
  }
  async function refresh() {
    if(!auth())return;
    try {
      me=await api('/api/profile/me');
      window.IAmOmaniFirebase.profile={...(window.IAmOmaniFirebase.profile||{}),...me};
      const input=$('#profileNickname');if(input&&!input.matches(':focus'))input.value=me.nickname||'';
      const avatar=$('#editablePhoto');if(avatar)avatar.innerHTML=photo(me);
      const summary=$('#profilePublicName');if(summary)summary.textContent=me.name;
      const joinLabel=$('#joinAccountName');if(joinLabel)joinLabel.textContent=`ستدخل باسم: ${me.name}`;
    } catch(error){const status=$('#profileEditStatus');if(status)status.textContent=error.message;}
  }
  function injectEditor() {
    const body=$('#progressProfileBody');
    if(!body||$('#profileEditCard'))return;
    body.insertAdjacentHTML('afterbegin',`
      <div id="profileEditCard" class="profile-edit-card">
        <div id="editablePhoto" class="editable-photo">🇴🇲</div>
        <div class="profile-edit-content">
          <b id="profilePublicName">ملفي الشخصي</b><small>يظهر لقبك للآخرين، ولا يظهر بريدك أو هاتفك.</small>
          <label>لقبي في اللعبة <input id="profileNickname" maxlength="28" placeholder="اتركه فارغًا لاستخدام اسم المستخدم"></label>
          <label class="photo-upload">📷 اختر صورة خاصة <input id="profilePhoto" type="file" accept="image/png,image/jpeg,image/webp"></label>
          <div class="profile-edit-actions"><button id="profileSave" type="button" class="primary-btn small-btn">حفظ الملف</button><button id="profileRemovePhoto" type="button" class="secondary-btn">حذف الصورة</button></div>
          <small id="profileEditStatus" role="status"></small>
        </div>
      </div>`);
    $('#profilePhoto').onchange=async e=>{
      const file=e.target.files?.[0];if(!file)return;
      if(file.size>8*1024*1024){$('#profileEditStatus').textContent='اختر صورة أصغر من 8 ميغابايت';return;}
      try {
        const img=await createImageBitmap(file);
        const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
        const ctx=canvas.getContext('2d'),side=Math.min(img.width,img.height);
        ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,256,256);
        editedPhoto=canvas.toDataURL('image/jpeg',0.78);
        img.close?.();
        $('#editablePhoto').innerHTML=`<img alt="معاينة الصورة" src="${editedPhoto}">`;
        $('#profileEditStatus').textContent='اضغط حفظ الملف لتثبيت الصورة';
      }catch{$('#profileEditStatus').textContent='تعذر قراءة الصورة';}
    };
    $('#profileRemovePhoto').onclick=()=>{editedPhoto=null;$('#editablePhoto').innerHTML=window.avatarHTML?.(me?.avatar||'OM1')||'🇴🇲';$('#profileEditStatus').textContent='اضغط حفظ الملف لحذف الصورة';};
    $('#profileSave').onclick=async()=>{
      const button=$('#profileSave');button.disabled=true;
      try {
        const nickname=$('#profileNickname').value.trim();
        if(nickname&&nickname.length<2)throw new Error('اللقب من حرفين إلى 28 حرفًا');
        me=await api('/api/profile/me',{method:'PUT',body:JSON.stringify({nickname,...(editedPhoto!==undefined?{photoData:editedPhoto}:{})})});
        editedPhoto=undefined;$('#profileEditStatus').textContent='تم حفظ الملف الشخصي';
        $('#profilePublicName').textContent=me.name;
        $('#editablePhoto').innerHTML=photo(me);
        window.IAmOmaniFirebase.profile={...(window.IAmOmaniFirebase.profile||{}),...me};
        window.dispatchEvent(new CustomEvent('iam-omani-profile-updated',{detail:me}));
      }catch(error){$('#profileEditStatus').textContent=error.message;}finally{button.disabled=false;}
    };
    if(me)refresh();
  }
  function injectJoinIdentity(){
    const input=$('#playerName');if(!input)return;
    input.previousElementSibling?.remove();input.remove();
    const title=$('#joinScreen h2');title?.insertAdjacentHTML('afterend','<p id="joinAccountName" class="join-identity">اسم اللاعب من ملفك الشخصي</p>');
    refresh();
  }
  async function openPlayer(uid){
    if(!uid)return;
    let modal=$('#publicPlayerDialog');
    if(!modal){document.body.insertAdjacentHTML('beforeend','<dialog id="publicPlayerDialog" class="player-dialog"><button class="player-dialog-close" aria-label="إغلاق">×</button><div id="publicPlayerBody"></div></dialog>');modal=$('#publicPlayerDialog');modal.querySelector('button').onclick=()=>modal.close();}
    $('#publicPlayerBody').textContent='جارٍ تحميل ملف اللاعب…';modal.showModal();
    try {
      const response=await fetch('/api/profile/'+encodeURIComponent(uid),{cache:'no-store'});
      if(!response.ok)throw new Error('ملف اللاعب غير متاح');
      const p=await response.json(),s=p.stats||{};
      $('#publicPlayerBody').innerHTML=`<div class="public-player-head"><div class="editable-photo">${photo(p)}</div><div><small>ملف اللاعب</small><h2>${safe(p.name)}</h2><span>المستوى ${p.level} • ${p.xp} XP</span></div></div>
        <div class="profile-stat-grid"><div><b>${s.games||0}</b><span>مسابقة</span></div><div><b>${s.wins||0}</b><span>فوز</span></div><div><b>${s.correct||0}</b><span>إجابة صحيحة</span></div><div><b>${s.bestScore||0}</b><span>أفضل نتيجة</span></div></div>
        <p class="player-last-active">${s.lastPlayedAt?'آخر مشاركة: '+safe(new Date(s.lastPlayedAt).toLocaleDateString('ar-OM')):'لم يشارك في مسابقة بعد'}</p>
        <h3>مجالات القوة</h3><div class="strengths">${p.strengths?.length?p.strengths.map(x=>`<div><b>${safe(x.name)}</b><span>${x.correct} إجابة صحيحة من ${x.answered}</span></div>`).join(''):'تظهر بعد خوض المسابقات'}</div>`;
    }catch(error){$('#publicPlayerBody').textContent=error.message;}
  }
  document.addEventListener('click',e=>{const target=e.target.closest('[data-player-uid]');if(target?.dataset.playerUid)openPlayer(target.dataset.playerUid);});
  function renderActivity(data){
    let box=$('#activityRankings');
    if(!box)return;
    const labels={governorates:'المحافظات',wilayats:'الولايات',villages:'القرى'};
    box.innerHTML=Object.entries(labels).map(([key,label])=>`<div class="activity-column"><h3>${label}</h3>${(data[key]||[]).length?(data[key]||[]).slice(0,5).map((x,i)=>`<div class="activity-row"><span>${i+1}. ${safe(x.name)}</span><b>${x.players} لاعب • ${x.rooms} مجلس</b></div>`).join(''):'<p>بانتظار انطلاق المجالس</p>'}</div>`).join('');
  }
  function injectActivity(){
    if($('#activityRankings'))return;
    $('#homeScreen .mode-grid')?.insertAdjacentHTML('afterend','<section class="activity-panel"><h2>ساحات عُمان الآن</h2><p>نشاط اللاعبين المتصلين في المجالس. يتغير الترتيب مباشرة.</p><div id="activityRankings" class="activity-rankings"></div></section>');
    fetch('/api/activity').then(r=>r.json()).then(renderActivity).catch(()=>{});
  }
  window.socket?.on('activity:update',renderActivity);
  window.addEventListener('iam-omani-auth',()=>refresh());
  window.addEventListener('iam-omani-profile-updated',e=>{const label=$('#joinAccountName');if(label)label.textContent=`ستدخل باسم: ${e.detail.name}`;});
  const observer=new MutationObserver(injectEditor);
  observer.observe(document.body,{childList:true,subtree:true});
  injectJoinIdentity();injectActivity();injectEditor();
})();
