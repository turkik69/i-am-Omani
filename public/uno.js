(() => {
  const socket=window.socket, $=s=>document.querySelector(s);
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colorNames={red:'أحمر',yellow:'أصفر',green:'أخضر',blue:'أزرق',wild:'متعدد'};
  const valueNames={skip:'تخطّي',reverse:'عكس',draw2:'+2',wild:'تغيير اللون',draw4:'+4'};
  const label=c=>valueNames[c.value]||c.value;
  const glyph=c=>({skip:'⊘',reverse:'⇄',draw2:'+2',wild:'✦',draw4:'+4'})[c.value]||c.value;
  const layer=document.createElement('div');layer.className='uno-layer hidden';layer.innerHTML='<div class="uno-shell"><header><h2><img src="/uno-icon.svg?v=72" alt="">أونو • أنا عُماني</h2><button id="unoClose" aria-label="إغلاق">✕</button></header><div id="unoBody"></div></div>';document.body.appendChild(layer);
  const body=()=>$('#unoBody');let session=null,view=null,declared=false,pendingMotion=null;
  try{session=JSON.parse(localStorage.getItem('iamOmaniUnoSession')||'null')}catch{}
  const open=()=>layer.classList.remove('hidden'),close=()=>layer.classList.add('hidden');$('#unoClose').onclick=close;
  function save(d){session=d;localStorage.setItem('iamOmaniUnoSession',JSON.stringify(d))}
  async function restore(){
    const user=window.IAmOmaniFirebase?.user;
    if(!session?.token||!user||!socket.connected)return;
    let idToken;try{idToken=await user.getIdToken()}catch{return}
    socket.emit('uno:reconnect',{...session,idToken},r=>{if(!r?.ok){session=null;localStorage.removeItem('iamOmaniUnoSession')}});
  }
  function say(message){const toast=$('#toast');if(toast){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500)}}
  function emit(event,data,done=()=>{}){socket.emit(event,{...data,code:session?.code,token:session?.token},r=>{if(!r?.ok)say(r?.error||'تعذر تنفيذ الحركة');done(r)})}
  function entry(){open();if(view && session && view.code===session.code){render(view);return}body().innerHTML=`<div class="uno-intro"><p>اللعب الكلاسيكي من لاعبين إلى عشرة: طابق اللون أو الرقم، واستخدم ورقات الحركة. ارفع رصيدك إلى 500 نقطة.</p><p class="join-identity">الاسم من ملفك الشخصي: ${escape(window.IAmOmaniFirebase?.profile?.nickname||window.IAmOmaniFirebase?.profile?.username||"سجّل الدخول")}</p><div class="uno-entry"><button id="unoCreate">إنشاء غرفة</button><label>رمز الغرفة<input id="unoCode" inputmode="numeric" maxlength="6" placeholder="000000"></label><button id="unoJoin">الانضمام</button></div></div>`;
    $('#unoCreate').onclick=async()=>{const user=window.IAmOmaniFirebase?.user;if(!user)return say('سجّل الدخول أولًا');socket.emit('uno:create',{idToken:await user.getIdToken()},r=>{if(!r?.ok)return say(r?.error||'تعذر الإنشاء');save(r);restore();open()});};
    $('#unoJoin').onclick=async()=>{const user=window.IAmOmaniFirebase?.user;if(!user)return say('سجّل الدخول أولًا');socket.emit('uno:join',{code:$('#unoCode').value.trim(),idToken:await user.getIdToken()},r=>{if(!r?.ok)return say(r?.error||'تعذر الانضمام');save(r);restore();open()});};
  }
  function cardHTML(c,attrs=''){const g=escape(glyph(c));return `<button type="button" class="uno-card uno-${escape(c.color)}" aria-label="${escape(colorNames[c.color])} ${escape(label(c))}" ${attrs}><span class="uno-corner" aria-hidden="true">${g}</span><span class="uno-oval" aria-hidden="true"><strong>${g}</strong></span><span class="uno-corner bottom" aria-hidden="true">${g}</span><span class="uno-card-name" aria-hidden="true">${escape(label(c))}</span></button>`}
  function colors(card){return card.color==='wild'?`<div class="uno-colors" role="group" aria-label="اختر اللون">${Object.keys(colorNames).filter(x=>x!=='wild').map(c=>`<button data-color="${c}" class="uno-color-${c}" aria-label="${colorNames[c]}">${colorNames[c]}</button>`).join('')}</div>`:''}
  function render(s){view=s;if(layer.classList.contains('hidden'))return;const self=s.players.find(p=>p.id===s.selfId),myTurn=s.status==='playing'&&s.players[s.turn]?.id===s.selfId&&!s.pending;
    if(s.status==='lobby'){body().innerHTML=`<div class="uno-info"><h3>رمز الغرفة ${escape(s.code)}</h3><p>أرسل الرمز لأصدقائك. يبدأ المضيف عند انضمام لاعبين.</p><div class="uno-players">${s.players.map(p=>`<span data-player-uid="${escape(p.uid||'')}">${escape(p.name)}</span>`).join('')}</div>${s.hostId===s.selfId?`<button id="unoStart">ابدأ اللعب</button>${s.players.length===1?'<button id="unoPractice">العب تدريبياً عبر الإنترنت الآن</button><p>منافسون آليون • النتائج خارج التصنيف</p>':''}`:'<p>بانتظار المضيف…</p>'}</div>`;if($('#unoStart'))$('#unoStart').onclick=()=>emit('uno:start');$('#unoPractice')?.addEventListener('click',()=>emit('uno:practice'));return}
    if(s.status==='round-end'||s.status==='finished'){body().innerHTML=`<div class="uno-info"><h3>${s.winner?.champion?'بطل أونو':'نهاية الجولة'}: ${escape(s.winner?.name)}</h3><p>+${s.winner?.reward||0} نقطة</p><div class="uno-players">${s.players.map(p=>`<span><b data-player-uid="${escape(p.uid||'')}">${escape(p.name)}</b> • ${p.score} نقطة</span>`).join('')}</div>${s.status==='round-end'&&s.hostId===s.selfId?'<button id="unoStart">جولة جديدة</button>':''}</div>`;if($('#unoStart'))$('#unoStart').onclick=()=>emit('uno:start');return}
    const seats=s.players.map((p,i)=>`<div class="uno-seat ${i===s.turn?'active':''} ${p.id===s.selfId?'self':''}"><b data-player-uid="${escape(p.uid||'')}">${escape(p.name)}${p.id===s.selfId?' (أنت)':''}</b><span class="uno-back-count" aria-label="${p.count} ورقات">${p.count} 🂠</span><small>${p.score} نقطة</small></div>`).join('');
    body().innerHTML=`<div class="uno-table"><p class="uno-meta">${s.practice?'تدريب عبر الإنترنت • النتائج خارج التصنيف • ':''}الجولة ${s.round} • غرفة ${escape(s.code)} • الاتجاه ${s.direction===1?'↶':'↷'}</p><div class="uno-seats">${seats}</div><div class="uno-center"><div class="uno-pile" aria-label="رزمة السحب"><span>أونو</span></div>${cardHTML(s.top,'disabled')}<b class="uno-current-color" style="--active-color:${{red:'#d7253a',yellow:'#e7b51f',green:'#15945a',blue:'#256fbe'}[s.color]||'#fff'}"><i></i>${colorNames[s.color]}</b></div><p class="uno-turn">${s.pending?s.pending.target===s.selfId?'عليك سحب أربع ورقات أو الاعتراض':'بانتظار قرار اللاعب التالي':myTurn?'دورك الآن':`دور ${escape(s.players[s.turn]?.name||'اللاعب')}`}</p><div class="uno-hand" aria-label="ورقاتك">${s.hand.map(c=>cardHTML(c,`data-card="${c.id}" ${!myTurn||s.drawnId&&s.drawnId!==c.id?'disabled':''}`)).join('')}</div><div class="uno-actions">${myTurn?`<button id="unoDraw" ${s.drawnId?'disabled':''}>اسحب ورقة</button>${s.drawnId?'<button id="unoKeep">احتفظ بالورقة وأنهِ دورك</button>':''}`:''}<button id="unoCall" ${s.hand.length!==2&&s.uno!==s.selfId?'disabled':''}>أونو!</button>${s.uno&&s.uno!==s.selfId?'<button id="unoCatch">أمسك أونو (+2)</button>':''}${s.pending?.target===s.selfId?'<button id="unoAccept">اسحب +4</button><button id="unoChallenge">اعتراض على +4</button>':''}</div><div id="unoColorPicker" class="uno-color-picker"></div></div>`;
    $('#unoDraw')?.addEventListener('click',()=>emit('uno:draw'));$('#unoKeep')?.addEventListener('click',()=>emit('uno:keep'));
    $('#unoCall')?.addEventListener('click',()=>{if(s.hand.length===2){declared=true;say('سيتم إعلان أونو عند لعب الورقة التالية')}else emit('uno:call')});
    $('#unoCatch')?.addEventListener('click',()=>emit('uno:catch'));$('#unoAccept')?.addEventListener('click',()=>emit('uno:penalty',{challenge:false}));$('#unoChallenge')?.addEventListener('click',()=>emit('uno:penalty',{challenge:true}));
    body().querySelectorAll('[data-card]').forEach(el=>el.onclick=()=>{const c=s.hand.find(x=>x.id===Number(el.dataset.card));if(!c)return;const play=color=>{pendingMotion={id:c.id,from:window.CardMotion?.rect(el),card:el.cloneNode(true)};emit('uno:play',{cardId:c.id,color,uno:declared},r=>{if(r?.ok)declared=false;else pendingMotion=null})};if(c.color==='wild'){const picker=$('#unoColorPicker');picker.innerHTML=colors(c);picker.querySelectorAll('[data-color]').forEach(btn=>btn.onclick=()=>play(btn.dataset.color))}else play()});
  }
  document.addEventListener('click',e=>{if(e.target.closest('#unoEntry'))entry()});
  socket.on('uno:state',s=>{
    if(session?.code!==s.code)return;
    const prev=view,visible=!layer.classList.contains('hidden');
    const from=visible&&prev?.status==='playing'&&prev.top?.id!==s.top?.id
      ?pendingMotion?.id===s.top?.id?pendingMotion.from:window.CardMotion?.rect(body().querySelectorAll('.uno-seat')[prev.turn])
      :null;
    const playedCard=pendingMotion?.id===s.top?.id?pendingMotion.card:null;
    render(s);
    if(!visible||s.status!=='playing')return;
    if(!prev||prev.status!=='playing'||prev.round!==s.round){window.CardMotion?.deal(body().querySelector('.uno-hand'));window.CardMotion?.sound('draw');return;}
    if(prev.top?.id!==s.top?.id){const target=body().querySelector('.uno-center .uno-card');window.CardMotion?.fly(from,target,playedCard||target,'throw');window.CardMotion?.sound('throw');pendingMotion=null;return;}
    if(s.hand.length>prev.hand.length){const target=body().querySelector('.uno-hand [data-card]:last-child');window.CardMotion?.fly(body().querySelector('.uno-pile'),target,target,'draw');window.CardMotion?.sound('draw');}
    else if(s.players.some((p,i)=>p.count>prev.players[i]?.count)){window.CardMotion?.sound('draw');}
  });
  socket.on('connect',restore);
  window.addEventListener('iam-omani-auth',restore);
  window.IAM_OMANI_UNO={open:entry};
})();
