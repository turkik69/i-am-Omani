(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const socket=window.io?io():null;
  let hostToken='',roomCode='',playerId='',tableId='',balootRoom=null,balootTable=null,balootAvatar='OM1';
  const SESSION_KEY='iamOmaniBalootSession';
  let savedSession=null;
  try{savedSession=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{}
  const remember=details=>{savedSession=details;localStorage.setItem(SESSION_KEY,JSON.stringify(details));};
  async function reconnect(){
    const user=window.IAmOmaniFirebase?.user;
    if(!savedSession||!user||!socket?.connected)return;
    let idToken;try{idToken=await user.getIdToken()}catch{return}
    socket.emit('baloot:reconnect',{...savedSession,idToken},res=>{
      if(!res?.ok){savedSession=null;localStorage.removeItem(SESSION_KEY);return;}
      roomCode=savedSession.code;balootRoom=res.room;
      if(res.role==='host'){hostToken=savedSession.hostToken;playerId=res.playerId||'';hostLobby();}
      else{playerId=res.playerId;hostToken='';open();body().innerHTML='<div class="baloot-panel"><div class="baloot-wait">أُعيد الاتصال بالمجلس. بانتظار دورك أو بدء الجولة.</div></div>';}
    });
  }
  const state={rooms:[]};
  localStorage.setItem('iamOmaniGame','quiz');
  const toast=document.createElement('div');toast.className='baloot-toast';document.body.appendChild(toast);
  const say=m=>{toast.textContent=m;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)};

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const face=token=>window.avatarHTML?.(token)||'🂡';
  const sound=name=>window.GameSFX?.play(name);
  function themeFor(w){return window.getOmanWilayatTheme?.(w)||{landmark:'معالم عُمان',icon:'🇴🇲',tone:'#d4a85d',g:'سلطنة عُمان'}}
  function wilayatOptions(){const names=Object.keys(window.OMAN_VILLAGES||{});return names.map(w=>`<option value="${w}">${w}</option>`).join('')}
  function villages(w){return (window.OMAN_VILLAGES?.[w]||[]).map(v=>`<option value="${v}">${v}</option>`).join('')}
  function applyWilayatTheme(w){const t=themeFor(w);document.documentElement.style.setProperty('--wilayat-tone',t.tone);$$('[data-wilayat-landmark]').forEach(el=>el.innerHTML=`<span class="ico">${t.icon}</span><span><b>${t.landmark}</b><small>${t.g} • ${w}</small></span>`)}

  const layer=document.createElement('div');layer.className='baloot-layer hidden';layer.innerHTML=`<div class="baloot-shell"><div class="baloot-top"><div class="baloot-brand"><img src="/baloot-icon.svg?v=36"><div><h2>الورقة • البلوت</h2><small>بطولات المجالس</small></div></div><button class="baloot-close">إغلاق</button></div><div id="balootBody"></div></div>`;document.body.appendChild(layer);
  const body=()=>$('#balootBody');
  $('.baloot-close').onclick=()=>layer.classList.add('hidden');
  const open=()=>layer.classList.remove('hidden');
  function menuScreen(){
    open();
    body().innerHTML='<div class="baloot-panel"><h3>اختر لعبة الورقة</h3><div class="baloot-game-menu"><button data-paper-game="baloot"><b>🃏 البلوت</b><small>صن وحكم • 4 لاعبين</small></button><button data-paper-game="hand"><b>🂡 هند</b><small>مجموعات وجوكر • 2 إلى 5 لاعبين</small></button><button data-paper-game="sixtyone"><b>♠ 61</b><small>ورقة عُمانية • 4 أو 6 لاعبين</small></button><button data-paper-game="uno"><img src="/uno-icon.svg?v=72" alt="" width="48" height="48"><b>أونو</b><small>ألوان وحركات • 2 إلى 10 لاعبين</small></button></div></div>';
    body().querySelectorAll('[data-paper-game]').forEach(b=>b.onclick=()=>{const kind=b.dataset.paperGame;if(kind==='baloot')return balootMenu();layer.classList.add('hidden');if(kind==='uno')return window.IAM_OMANI_UNO?.open();window.IAM_OMANI_CARDS?.open(kind)});
  }
  function balootMenu(){open();body().innerHTML='<div class="baloot-panel"><h3>البلوت</h3><div class="baloot-game-menu"><button id="bOpenCreate"><b>إنشاء مجلس البلوت</b></button><button id="bOpenJoin"><b>انضم إلى مجلس البلوت</b></button></div><button id="bBackGames" class="baloot-btn">→ ألعاب الورقة</button></div>';$('#bOpenCreate').onclick=createScreen;$('#bOpenJoin').onclick=joinScreen;$('#bBackGames').onclick=menuScreen;}

  function createScreen(){
    sound('card-shuffle');open();
    const opts=wilayatOptions();
    body().innerHTML=`<div class="baloot-panel"><div class="baloot-landmark" data-wilayat-landmark></div><h3>إنشاء مجلس البلوت</h3><div class="baloot-fields"><label>اسم البطولة<input id="bTitle" value="بطولة البلوت"></label><label>الولاية<select id="bWilayat">${opts}</select></label><label>المجلس / القرية<select id="bVillage"></select></label><label>نوع اللعب<select id="bVariant"><option value="mixed">صن وحكم مع شراء الورقة</option><option value="sun">صن فقط</option><option value="hokm">حكم فقط</option></select></label></div><div class="baloot-actions"><button id="bCreate" class="baloot-btn">إنشاء البطولة</button><button id="bGoJoin" class="baloot-btn">انضم إلى مجلس</button></div></div>`;
    const w=$('#bWilayat'),v=$('#bVillage');
    if(!w.options.length){w.innerHTML='<option value="مسقط">مسقط</option><option value="بركاء">بركاء</option><option value="السيب">السيب</option><option value="بوشر">بوشر</option><option value="مطرح">مطرح</option><option value="نزوى">نزوى</option><option value="صلالة">صلالة</option><option value="صحار">صحار</option>'}
    const upd=()=>{v.innerHTML=villages(w.value)||'<option value="المجلس الرئيسي">المجلس الرئيسي</option>';applyWilayatTheme(w.value)};
    w.onchange=upd;upd();
    $('#bCreate').onclick=async()=>{const user=window.IAmOmaniFirebase?.user;if(!user)return say('سجّل الدخول أولًا');let idToken;try{idToken=await user.getIdToken()}catch{return say('تعذر التحقق من الحساب')}socket.emit('baloot:create',{idToken,title:$('#bTitle').value,wilayat:w.value,village:v.value,variant:$('#bVariant').value},res=>{if(!res?.ok)return say(res?.error||'تعذر الإنشاء');hostToken=res.hostToken;roomCode=res.code;balootRoom=res.room;remember({code:roomCode,hostToken});hostLobby();})};
    $('#bGoJoin').onclick=joinScreen;
  }

  function joinScreen(){sound('card-shuffle');balootAvatar=window.OMANI_AVATAR?.()||'OM1';open();body().innerHTML=`<div class="baloot-panel"><h3>الانضمام إلى بطولة البلوت</h3><div id="activeBaloot"></div><div class="baloot-fields"><label>رمز البطولة<input id="bJoinCode" inputmode="numeric" maxlength="6"></label><p class="join-identity">الاسم من ملفك الشخصي: ${esc(window.IAmOmaniFirebase?.profile?.nickname||window.IAmOmaniFirebase?.profile?.username||"سجّل الدخول")}</p></div><label class="baloot-avatar-label">اختر شخصيتك العُمانية</label><div id="balootAvatars" class="baloot-avatar-grid">${Array.from({length:window.OMANI_AVATAR_COUNT||11},(_,j)=>j+1).map(i=>`<button type="button" data-baloot-avatar="OM${i}" aria-label="الشخصية ${i}" class="${balootAvatar===`OM${i}`?'selected':''}">${face(`OM${i}`)}</button>`).join('')}</div><div class="baloot-actions"><button id="bJoin" class="baloot-btn">إرسال طلب الانضمام</button></div></div>`;renderRooms();socket?.emit('baloot:list');$('#balootAvatars').onclick=e=>{const b=e.target.closest('[data-baloot-avatar]');if(!b)return;balootAvatar=b.dataset.balootAvatar;document.querySelectorAll('[data-baloot-avatar]').forEach(x=>x.classList.toggle('selected',x===b));sound('ui-click')};$('#bJoin').onclick=async()=>{const c=$('#bJoinCode').value.trim(),user=window.IAmOmaniFirebase?.user;if(!user)return say('سجّل الدخول أولًا');const idToken=await user.getIdToken();socket.emit('baloot:join-request',{code:c,idToken,avatar:balootAvatar},res=>{if(!res?.ok)return say(res?.error||'تعذر إرسال الطلب');roomCode=c;body().innerHTML='<div class="baloot-panel"><div class="baloot-wait">تم إرسال طلبك إلى مشرف المجلس… بانتظار القبول.</div></div>';});};}
  function renderRooms(){const el=$('#activeBaloot');if(!el)return;el.innerHTML=state.rooms.length?`<div class="baloot-tables">${state.rooms.map(r=>`<button class="baloot-table-card" data-room="${r.code}"><b>${esc(r.title)}</b><div>${esc(r.wilayat)} • ${esc(r.village)}</div><small>${r.players.length} لاعبين • ${r.variant==='sun'?'صن':r.variant==='hokm'?'حكم':'مختلط'}</small></button>`).join('')}</div>`:'<p class="baloot-wait">لا توجد بطولات بلوت مفتوحة الآن.</p>';el.onclick=e=>{const b=e.target.closest('[data-room]');if(b)$('#bJoinCode').value=b.dataset.room;};}

  function hostLobby(){open();const t=themeFor(balootRoom?.wilayat);document.documentElement.style.setProperty('--wilayat-tone',t.tone);body().innerHTML=`<div class="baloot-panel"><div class="baloot-landmark" data-wilayat-landmark></div><h3>${esc(balootRoom?.title||'بطولة البلوت')}</h3><div>رمز الدخول</div><div class="baloot-code">${roomCode}</div><div class="baloot-actions"><button id="bStart" class="baloot-btn">توزيع الطاولات وبدء الجولة</button><button id="bPractice" class="baloot-btn">العب تدريبياً عبر الإنترنت الآن</button></div><p>منافسون آليون • النتائج خارج التصنيف</p><h4>طلبات الانضمام</h4><div id="bPending" class="baloot-pending"></div><h4>اللاعبون المقبولون</h4><div id="bPlayers" class="baloot-players"></div><div id="bTables" class="baloot-tables"></div></div>`;applyWilayatTheme(balootRoom?.wilayat||'مسقط');renderHost();$('#bStart').onclick=()=>socket.emit('baloot:start',{code:roomCode,hostToken},res=>{if(!res?.ok)return say(res?.error||'تعذر البدء');sound('card-deal');say(`بدأت ${res.tables} طاولة${res.waiting?` • ${res.waiting} في الانتظار`:''}`)});$('#bPractice').onclick=()=>socket.emit('baloot:practice',{code:roomCode,hostToken},res=>{if(!res?.ok)return say(res?.error||'تعذر بدء التدريب');playerId=res.playerId;sound('card-deal')});}
  function renderHost(){if(!balootRoom||!$('#bPending'))return;$('#bPending').innerHTML=(balootRoom.pending||[]).length?(balootRoom.pending||[]).map(p=>`<div class="baloot-person"><div class="who"><span>${window.playerAvatarHTML?.(p)||face(p.avatar)}</span><b data-player-uid="${esc(p.uid||'')}">${esc(p.name)}</b></div><div><button class="baloot-approve" data-a="${p.id}">قبول</button> <button class="baloot-reject" data-r="${p.id}">رفض</button></div></div>`).join(''):'<div class="baloot-wait">لا توجد طلبات انتظار.</div>';$('#bPlayers').innerHTML=(balootRoom.players||[]).map(p=>`<div class="baloot-person"><div class="who"><span>${window.playerAvatarHTML?.(p)||face(p.avatar)}</span><b data-player-uid="${esc(p.uid||'')}">${esc(p.name)}</b></div><b>${p.score||0} نقطة</b></div>`).join('')||'<div class="baloot-wait">بانتظار اللاعبين.</div>';$('#bTables').innerHTML=(balootRoom.tables||[]).map(t=>`<div class="baloot-table-card"><b>${esc(t.id)}</b><div>${t.names.map(esc).join(' • ')}</div><small>${t.variant==='sun'?'صن':t.variant==='hokm'?'حكم':'—'} • ${t.teamScore[0]} - ${t.teamScore[1]}</small></div>`).join('');$('#bPending').onclick=e=>{const a=e.target.dataset.a,r=e.target.dataset.r;if(a)socket.emit('baloot:approve',{code:roomCode,hostToken,playerId:a},()=>{});if(r)socket.emit('baloot:reject',{code:roomCode,hostToken,playerId:r},()=>{});};}

  function playingCard(c,attrs='',outer=''){const rank=esc(c.rank),suit=esc(c.suit),red=c.suit==='♥'||c.suit==='♦';return `<button type="button" class="baloot-playing-card ${red?'red':''} ${outer}" aria-label="${rank} ${suit}" ${attrs}><span class="rank-corner" aria-hidden="true">${rank}<small>${suit}</small></span><span class="suit-center" aria-hidden="true">${suit}</span><span class="rank-corner flip" aria-hidden="true">${rank}<small>${suit}</small></span></button>`}
  function tableScreen(){
    open();if(!balootTable)return;
    const t=balootTable;
    const buttons=(t.hand||[]).map(c=>playingCard(c,`data-card="${esc(c.id)}" ${t.stage!=='playing'||t.turn!==t.seat?'disabled':''}`)).join('');
    if(t.stage==='bidding'){
      const myTurn=t.turn===t.seat,allowSun=t.allowedVariant!=='hokm',allowHokm=t.allowedVariant!=='sun'&&!t.provisional;
      const suits=t.bidRound===1?[t.buyCard.suit]:['♠','♥','♦','♣'].filter(x=>x!==t.buyCard.suit);
      body().innerHTML=`<div class="baloot-panel"><h3>شراء الورقة • ${esc(t.table)}</h3>${balootRoom?.practice?'<p>تدريب عبر الإنترنت • النتائج خارج التصنيف</p>':''}<p class="baloot-bid-info">الدورة ${t.bidRound} • ورقة الشراء المكشوفة</p><div class="baloot-buy-card">${playingCard(t.buyCard,'disabled')}<span>الفريقان متقابلان • ثماني لمّات</span></div><p>دور ${esc(t.players[t.turn]?.name||'اللاعب')} في الشراء</p><p class="baloot-hand-label">أوراقك الخمس</p><div class="baloot-hand">${buttons}</div>${myTurn?`<div class="baloot-actions"><button data-bid="pass" class="baloot-btn">بس</button>${allowSun?'<button data-bid="sun" class="baloot-btn">صن</button>':''}${allowHokm?suits.map(s=>`<button data-bid="hokm" data-suit="${s}" class="baloot-btn">حكم ${s}</button>`).join(''):''}</div>`:'<p>بانتظار قرار المشتري…</p>'}</div>`;
      body().querySelectorAll('[data-bid]').forEach(b=>b.onclick=()=>socket.emit('baloot:bid',{code:roomCode,table:t.table,playerId,choice:b.dataset.bid,suit:b.dataset.suit},res=>{if(!res?.ok)say(res?.error||'تعذر الشراء')}));
      return;
    }
    body().innerHTML=`<div class="baloot-panel"><div class="baloot-landmark" data-wilayat-landmark></div><h3>${esc(balootRoom?.title||'البلوت')} • ${t.table}</h3>${balootRoom?.practice?'<p>تدريب عبر الإنترنت • النتائج خارج التصنيف</p>':''}<div class="baloot-score"><span>فريق 1: ${t.teamScore[0]} بنط</span><span>فريق 2: ${t.teamScore[1]} بنط</span></div><p>النمط: <b>${t.variant==='sun'?'صن':'حكم'}</b> ${t.trump?`• الحكم ${t.trump}`:''} • المشتري: ${esc(t.players[t.buyer]?.name||'—')}</p>${t.finished?`<p>قيد الجولة: ${t.resultScore?.join(' – ')||'—'}</p>`:''}<div class="baloot-play-area"><div class="baloot-seat-grid">${t.players.map(p=>{const relative=(p.seat-t.seat+4)%4,pos=['south','west','north','east'][relative];return `<div class="baloot-seat ${pos} ${p.seat===t.turn?'active':''}"><b>${esc(p.name)}${p.seat===t.seat?' (أنت)':''}</b><span class="baloot-card-back">${p.cards} 🂠</span><small>فريق ${p.seat%2+1}</small></div>`}).join('')}<div class="baloot-trick-v2">${(t.tricks||[]).map(x=>`<div class="baloot-played">${playingCard(x.card,'disabled')}<small>${esc(t.players[x.seat]?.name||'')}</small></div>`).join('')}</div></div></div><p class="baloot-hand-label">أوراقك</p><div class="baloot-hand">${buttons}</div><div class="baloot-wait">${t.finished?'انتهت الجولة':t.turn===t.seat?'دورك الآن':'بانتظار دورك…'}</div></div>`;
    applyWilayatTheme(balootRoom?.wilayat||'مسقط');
    $$('[data-card]').forEach(b=>b.onclick=()=>socket.emit('baloot:play',{code:roomCode,table:t.table,playerId,cardId:b.dataset.card},res=>{if(!res?.ok)say(res?.error||'لا يمكن لعب هذه الورقة');else sound('card-play')}));
  }

  const entries=document.createElement('div');entries.className='game-switcher';entries.innerHTML='<h3>الورقة • البلوت</h3><div class="game-options"><button class="game-choice" data-baloot-host><img src="/baloot-icon.svg?v=37" alt=""><span><b>أنشئ مجلس البلوت</b><small>صن وحكم، أربعة لاعبين في كل طاولة</small></span></button><button class="game-choice" data-baloot-join><span class="mini-icon">🃏</span><span><b>انضم إلى مجلس البلوت</b><small>ادخل برمز البطولة</small></span></button></div>';document.querySelector('#homeScreen .mode-grid')?.after(entries);entries.querySelector('[data-baloot-host]').onclick=createScreen;entries.querySelector('[data-baloot-join]').onclick=joinScreen;
  window.IAM_OMANI_BALOUT={openMenu:menuScreen,openHost:createScreen,openJoin:joinScreen};
  document.querySelector('#competitionBaloot')?.addEventListener('click',menuScreen);

  socket?.on('baloot:rooms',r=>{state.rooms=r||[];renderRooms()});
  socket?.on('baloot:room',r=>{if(r.code!==roomCode)return;balootRoom=r;if(hostToken)renderHost();});
  socket?.on('baloot:pending',p=>{if(balootRoom){balootRoom.pending=p;renderHost();}});
  socket?.on('baloot:approved',d=>{sound('join');roomCode=d.code;playerId=d.playerId;balootRoom=d.room;remember({code:roomCode,reconnectToken:d.reconnectToken});body().innerHTML='<div class="baloot-panel"><div class="baloot-wait">تم قبولك. بانتظار المشرف لبدء الجولة وتوزيع الطاولات.</div></div>';});
  socket?.on('baloot:rejected',()=>{say('تم رفض طلب الانضمام');joinScreen()});
  socket?.on('baloot:choose-trump',d=>{tableId=d.table;const pick=prompt(`اختر الحكم: ${d.suits.join(' ')}`,d.suits[0]);if(pick)socket.emit('baloot:trump',{code:roomCode,table:tableId,playerId,suit:pick},res=>{if(!res?.ok)say('تعذر اختيار الحكم');else sound('trump')});});
  socket?.on('baloot:table',t=>{const prev=balootTable;if(!prev||prev.table!==t.table||prev.round!==t.round)sound('card-deal');else if((t.teamScore?.[0]||0)+(t.teamScore?.[1]||0)>(prev.teamScore?.[0]||0)+(prev.teamScore?.[1]||0))sound('trick');else if((t.tricks?.length||0)>(prev.tricks?.length||0)&&t.turn!==t.seat)sound('card-play');balootTable=t;tableId=t.table;tableScreen()});
  socket?.on('baloot:round-finished',d=>{sound('round-end');open();body().innerHTML=`<div class="baloot-panel"><h3>انتهت الجولة ${esc(d.round)}</h3><div class="baloot-players">${d.leaderboard.map(p=>`<div class="baloot-person"><b>${p.rank}. ${esc(p.name)}</b><b>${p.score} نقطة</b></div>`).join('')}</div>${hostToken?'<div class="baloot-actions"><button id="bNext" class="baloot-btn">جولة جديدة</button></div>':''}</div>`;if(hostToken)$('#bNext').onclick=()=>socket.emit('baloot:next-round',{code:roomCode,hostToken},()=>hostLobby());});
  socket?.on('connect',reconnect);
  window.addEventListener('iam-omani-auth',reconnect);
})();
