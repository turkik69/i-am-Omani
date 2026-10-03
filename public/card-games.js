(() => {
  const socket=window.socket,$=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={hand:'هند',sixtyone:'61'};
  const rank=v=>v===0?'★':v===1?'A':({11:'J',12:'Q',13:'K'}[v]||v);
  const label=c=>c?`${rank(c.v)} ${c.s}`:'—';
  const red=c=>c.s==='♥'||c.s==='♦';
  const layer=document.createElement('div');layer.className='cards-layer hidden';
  layer.innerHTML='<div class="cards-shell"><header><h2 id="cardsTitle">الورقة</h2><button id="cardsClose" type="button">إغلاق</button></header><div id="cardsBody"></div></div>';
  document.body.appendChild(layer);$('#cardsClose').onclick=()=>layer.classList.add('hidden');
  let mode=null,session=null,state=null,chosen=new Set(),draft=[];
  try{session=JSON.parse(localStorage.getItem('iamOmaniCardsSession')||'null')}catch{}
  const body=()=>$('#cardsBody');
  function say(message){let el=$('#cardsMessage');if(!el){el=document.createElement('p');el.id='cardsMessage';body().prepend(el);}el.textContent=message;}
  function call(name,data={},onSuccess=()=>{}){socket.emit(`cards:${name}`,{...data,code:session?.code,token:session?.token},r=>{if(!r?.ok)return say(r?.error||'تعذرت الحركة');onSuccess(r)})}
  const save=r=>{session={code:r.code,token:r.token};localStorage.setItem('iamOmaniCardsSession',JSON.stringify(session));chosen.clear();draft=[];};
  async function restore(){
    const user=window.IAmOmaniFirebase?.user;
    if(!session?.token||!user||!socket.connected)return;
    let idToken;try{idToken=await user.getIdToken()}catch{return}
    socket.emit('cards:reconnect',{...session,idToken},r=>{if(!r?.ok){session=null;localStorage.removeItem('iamOmaniCardsSession')}});
  }
  function entry(kind){mode=kind;layer.classList.remove('hidden');$('#cardsTitle').textContent=`${names[kind]} • أنا عُماني`;if(state&&session&&state.code===session.code&&state.mode===kind)return render(state);
    body().innerHTML=`<section class="cards-intro"><h3>${names[kind]}</h3><p>${kind==='hand'?'لاعبان إلى خمسة • 106 أوراق • خمس جولات':'فريقان • 4 أو 6 لاعبين • أوراق المال والحكم'}</p><p class="join-identity">الاسم من ملفك الشخصي: ${esc(window.IAmOmaniFirebase?.profile?.nickname||window.IAmOmaniFirebase?.profile?.username||"سجّل الدخول")}</p>${kind==='sixtyone'?'<label>عدد اللاعبين<select id="cardsSeats"><option value="6">6 لاعبين</option><option value="4">4 لاعبين</option></select></label>':''}<div class="cards-actions"><button id="cardsCreate">إنشاء غرفة</button><label>رمز الغرفة<input id="cardsCode" inputmode="numeric" maxlength="6" placeholder="000000"></label><button id="cardsJoin">انضمام</button></div></section>`;
    $('#cardsCreate').onclick=async()=>{const user=window.IAmOmaniFirebase?.user;if(!user)return say('سجّل الدخول أولًا');socket.emit('cards:create',{mode:kind,idToken:await user.getIdToken(),required:$('#cardsSeats')?.value},r=>{if(!r?.ok)return say(r?.error||'تعذر إنشاء الغرفة');save(r);restore()});};
    $('#cardsJoin').onclick=async()=>{const user=window.IAmOmaniFirebase?.user;if(!user)return say('سجّل الدخول أولًا');socket.emit('cards:join',{code:$('#cardsCode').value.trim(),idToken:await user.getIdToken()},r=>{if(!r?.ok)return say(r?.error||'تعذر الانضمام');save(r);restore()});};
  }
  function card(c,active=true){return `<button type="button" class="playing-card ${red(c)?'red':''} ${chosen.has(c.id)?'selected':''}" data-card="${esc(c.id)}" ${active?'':'disabled'} aria-label="${esc(label(c))}"><b>${esc(rank(c.v))}</b><span>${esc(c.s)}</span></button>`}
  function players(s){return `<div class="cards-players">${s.players.map((p,i)=>`<span class="${s.turn===i&&s.status==='playing'?'current':''}"><span data-player-uid="${esc(p.uid||'')}">${esc(p.name)}</span> · ${p.count} ورقة ${s.mode==='hand'?`· ${p.score} نقطة`:`· فريق ${(i%2)+1}`}</span>`).join('')}</div>`}
  function lobby(s){body().innerHTML=`<section class="cards-intro"><h3>رمز الغرفة: <strong>${esc(s.code)}</strong></h3><p>أرسل الرمز للاعبين. ${s.mode==='sixtyone'?`تحتاج ${s.required} لاعبين`:'تحتاج لاعبين على الأقل'} للبدء.</p>${players(s)}${s.hostId===s.selfId?'<button id="cardsStart">ابدأ الجولة</button>':'<p>بانتظار المضيف…</p>'}</section>`;$('#cardsStart')?.addEventListener('click',()=>call('start'));}
  function result(s){const rows=s.mode==='hand'?s.roundResult?.scores?.map(p=>`${esc(p.name)}: ${p.delta>0?'+':''}${p.delta} (المجموع ${p.total})`).join('<br>'):s.result?.message;
    body().innerHTML=`<section class="cards-intro"><h3>${s.status==='finished'?'نهاية اللعبة':`نهاية الجولة ${s.round}`}</h3><p>${rows||''}</p>${s.mode==='sixtyone'?`<p>أوراق المال: ${s.result?.money?.join(' – ')||'—'} · الأوراق الخارجية: ${s.external.join(' – ')}</p>`:''}${players(s)}${s.status==='round-end'&&s.hostId===s.selfId?'<button id="cardsStart">الجولة التالية</button>':''}</section>`;$('#cardsStart')?.addEventListener('click',()=>call('start'));}
  function hand(s){const mine=s.players[s.turn]?.id===s.selfId,canAct=mine&&s.status==='playing',available=s.hand.filter(c=>!draft.flat().includes(c.id));
    body().innerHTML=`<div class="cards-table"><p>هند • الجولة ${s.round}/5 • غرفة ${esc(s.code)}</p>${players(s)}<div class="cards-center"><div><small>الرزمة</small><strong>${s.stock} ورقة</strong></div><div><small>كومة النار</small>${s.top?`<strong>${esc(label(s.top))}</strong>`:'<strong>فارغة</strong>'}</div></div><p class="cards-turn">${mine?s.stage==='draw'?'دورك: اسحب من الرزمة أو النار':'اختر مجموعة للنزول أو ورقة للرمي':`دور ${esc(s.players[s.turn]?.name)}`}</p><div class="cards-hand">${available.map(c=>card(c,canAct&&s.stage!=='draw')).join('')}</div>${canAct?`<div class="cards-actions">${s.stage==='draw'?'<button id="cardsDraw">اسحب من الرزمة</button><button id="cardsFire">اسحب من النار</button>':`<button id="cardsAddGroup">أضف مجموعة</button><button id="cardsMeld">نزّل المجموعات ${draft.length?`(${draft.length})`:''}</button><button id="cardsDiscard">ارمِ ورقة</button>`}</div>`:''}${draft.length?`<p>المجموعات المختارة: ${draft.map(g=>g.map(id=>esc(label(s.hand.find(c=>c.id===id)))).join('، ')).join(' / ')} <button id="cardsClear">مسح</button></p>`:''}<h4>المجموعات على الطاولة</h4><div class="cards-melds">${(s.melds||[]).map((g,i)=>`<div><span>${g.cards.map(label).map(esc).join(' • ')}</span>${canAct&&s.stage!=='draw'?`<button data-attach="${i}">ركّب الورقة المختارة</button>`:''}</div>`).join('')||'<p>لم تُنزّل أي مجموعة بعد</p>'}</div></div>`;
    body().querySelectorAll('[data-card]').forEach(el=>el.onclick=()=>{const id=el.dataset.card;chosen.has(id)?chosen.delete(id):chosen.add(id);el.classList.toggle('selected',chosen.has(id))});
    $('#cardsDraw')?.addEventListener('click',()=>call('draw',{from:'stock'}));$('#cardsFire')?.addEventListener('click',()=>call('draw',{from:'discard'}));
    $('#cardsAddGroup')?.addEventListener('click',()=>{if(chosen.size<3)return say('اختر ثلاث أوراق على الأقل');draft.push([...chosen]);chosen.clear();render(s)});
    $('#cardsMeld')?.addEventListener('click',()=>{const groups=[...draft];if(chosen.size)groups.push([...chosen]);if(!groups.length)return say('اختر الأوراق أولًا');call('meld',{groups},()=>{draft=[];chosen.clear()})});
    $('#cardsClear')?.addEventListener('click',()=>{draft=[];chosen.clear();render(s)});
    $('#cardsDiscard')?.addEventListener('click',()=>{if(chosen.size!==1)return say('اختر ورقة واحدة للرمي');call('discard',{cardId:[...chosen][0]},()=>{chosen.clear();draft=[]})});
    body().querySelectorAll('[data-attach]').forEach(el=>el.onclick=()=>{if(chosen.size!==1)return say('اختر ورقة واحدة للتركيب');call('attach',{index:Number(el.dataset.attach),cardId:[...chosen][0]},()=>chosen.clear())});
  }
  function sixty(s){const mine=s.players[s.turn]?.id===s.selfId,canPlay=mine&&s.status==='playing';body().innerHTML=`<div class="cards-table"><p>61 • الجولة ${s.round} • غرفة ${esc(s.code)}</p>${players(s)}<div class="cards-score"><span>فريق 1: ${s.teamMoney[0]} أوراق مال • ${s.teamSecondary[0]} ثانوية</span><span>فريق 2: ${s.teamMoney[1]} أوراق مال • ${s.teamSecondary[1]} ثانوية</span></div><div class="cards-center"><div>الحكم: <strong>${esc(s.trump)}</strong></div><div>السحب: <strong>${s.stock}</strong></div><div>الأوراق الخارجية: <strong>${s.external.join(' – ')}</strong></div></div><p class="cards-turn">${canPlay?'دورك: العب أي ورقة':`دور ${esc(s.players[s.turn]?.name)}`}</p><div class="cards-trick">${s.trick.map(x=>`<span>${esc(s.players[x.seat]?.name)}: <b>${esc(label(x.card))}</b></span>`).join('')||'بانتظار أول ورقة'}</div><div class="cards-hand">${s.hand.map(c=>card(c,canPlay)).join('')}</div></div>`;body().querySelectorAll('[data-card]').forEach(el=>el.onclick=()=>call('play',{cardId:el.dataset.card}));}
  function render(s){state=s;mode=s.mode;if(layer.classList.contains('hidden'))return;$('#cardsTitle').textContent=`${names[s.mode]} • أنا عُماني`;if(s.status==='lobby')return lobby(s);if(s.status==='round-end'||s.status==='finished')return result(s);s.mode==='hand'?hand(s):sixty(s)}
  document.addEventListener('click',e=>{if(e.target.closest('#handEntry'))entry('hand');if(e.target.closest('#sixtyoneEntry'))entry('sixtyone')});
  socket.on('cards:state',s=>{if(session?.code===s.code)render(s)});
  socket.on('connect',restore);
  window.addEventListener('iam-omani-auth',restore);
  window.IAM_OMANI_CARDS={open:entry};
})();
