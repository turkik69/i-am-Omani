(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const LEVELS = [
    {level:1,name:'مستكشف عُمان',xp:0,icon:'🧭'},
    {level:2,name:'رحّالة',xp:500,icon:'🐪'},
    {level:3,name:'عارف بالديار',xp:1500,icon:'🗺️'},
    {level:4,name:'خبير المجلس',xp:3500,icon:'🏘️'},
    {level:5,name:'فارس المعرفة',xp:7000,icon:'🗡️'},
    {level:6,name:'شيخ التحدي',xp:12000,icon:'🏅'},
    {level:7,name:'نخبة عُمان',xp:20000,icon:'👑'},
    {level:8,name:'أسطورة عُمان',xp:35000,icon:'🏆'}
  ];

  const CATEGORIES = [
    {id:'oman',name:'عُمان',icon:'🇴🇲',desc:'تاريخ، معالم، ولايات وتراث'},
    {id:'sports',name:'رياضة',icon:'⚽',desc:'كرة القدم والرياضات العالمية'},
    {id:'culture',name:'ثقافة عامة',icon:'📚',desc:'معرفة وأدب وفنون'},
    {id:'geography',name:'جغرافيا',icon:'🌍',desc:'دول ومدن وطبيعة'},
    {id:'science',name:'علوم',icon:'🔬',desc:'فضاء وطبيعة وعلوم'},
    {id:'social',name:'مجتمع وتراث',icon:'☕',desc:'عادات وتراث وموروث عُماني'},
    {id:'mixed',name:'متنوعة',icon:'🎲',desc:'مزيج من جميع المجالات'}
  ];

  const BANKS = {
    oman:[
      ['كم عدد محافظات سلطنة عُمان؟',['9','10','11','12'],2,'عُمان'],
      ['ما عاصمة سلطنة عُمان؟',['صحار','نزوى','مسقط','صلالة'],2,'عُمان'],
      ['أي قلعة تشتهر ببرجها الدائري الكبير؟',['قلعة نزوى','قلعة صحار','قلعة مطرح','قلعة طاقة'],0,'عُمان'],
      ['في أي محافظة تشتهر تجارة اللبان تاريخيًا؟',['مسقط','ظفار','البريمي','مسندم'],1,'عُمان'],
      ['أي موقع عُماني مُدرج ضمن قائمة التراث العالمي لليونسكو؟',['قلعة بهلاء','برج الصحوة','دار الأوبرا','سوق مطرح'],0,'عُمان'],
      ['ما أعلى جبل في سلطنة عُمان؟',['الجبل الأخضر','جبل سمحان','جبل شمس','جبل حارم'],2,'عُمان']
    ],
    sports:[
      ['كم لاعبًا يبدأ به فريق كرة القدم داخل الملعب؟',['9','10','11','12'],2,'رياضة'],
      ['كم حلقة في شعار الألعاب الأولمبية؟',['4','5','6','7'],1,'رياضة'],
      ['كم لاعبًا يوجد في فريق الكرة الطائرة داخل الملعب؟',['5','6','7','8'],1,'رياضة'],
      ['كم تبلغ مسافة سباق الماراثون تقريبًا؟',['21.1 كم','30 كم','42.195 كم','50 كم'],2,'رياضة'],
      ['كم نقطة تحتسب للرميّة الحرة في كرة السلة؟',['1','2','3','4'],0,'رياضة'],
      ['ما المصطلح المستخدم للنقطة صفر في التنس؟',['Love','Zero','Blank','Nil'],0,'رياضة']
    ],
    culture:[
      ['من كتب رواية الحرب والسلام؟',['تولستوي','تشيخوف','بوشكين','دوستويفسكي'],0,'ثقافة'],
      ['أي فن يعتمد أساسًا على تشكيل الكلمات والحروف بصريًا؟',['النحت','الخط','الخزف','المسرح'],1,'ثقافة'],
      ['ما اللغة الأكثر انتشارًا من حيث عدد المتحدثين الأصليين؟',['الإنجليزية','الإسبانية','العربية','الصينية المندرينية'],3,'ثقافة'],
      ['من رسم لوحة الموناليزا؟',['بيكاسو','ليوناردو دافنشي','فان غوخ','مونيه'],1,'ثقافة'],
      ['أي آلة موسيقية تحتوي عادةً على مفاتيح سوداء وبيضاء؟',['العود','البيانو','الكمان','الناي'],1,'ثقافة'],
      ['في أي قارة تقع الأهرامات المصرية؟',['آسيا','أفريقيا','أوروبا','أمريكا الجنوبية'],1,'ثقافة']
    ],
    geography:[
      ['ما أكبر محيط على سطح الأرض؟',['الأطلسي','الهندي','الهادئ','المتجمد الشمالي'],2,'جغرافيا'],
      ['ما أكبر دولة في العالم من حيث المساحة؟',['كندا','الصين','روسيا','الولايات المتحدة'],2,'جغرافيا'],
      ['أي نهر يمر بمدينة القاهرة؟',['الأمازون','النيل','الدانوب','السين'],1,'جغرافيا'],
      ['ما عاصمة اليابان؟',['أوساكا','كيوتو','طوكيو','ناغويا'],2,'جغرافيا'],
      ['في أي قارة تقع البرازيل؟',['آسيا','أفريقيا','أمريكا الجنوبية','أوروبا'],2,'جغرافيا'],
      ['ما أكبر صحراء حارة في العالم؟',['الربع الخالي','الصحراء الكبرى','جوبي','كالاهاري'],1,'جغرافيا']
    ],
    science:[
      ['ما الكوكب المعروف بالكوكب الأحمر؟',['الزهرة','المريخ','عطارد','المشتري'],1,'علوم'],
      ['ما الغاز الذي تحتاجه خلايا الإنسان للتنفس؟',['النيتروجين','الأكسجين','الهيدروجين','الهيليوم'],1,'علوم'],
      ['كم عدد كواكب المجموعة الشمسية؟',['7','8','9','10'],1,'علوم'],
      ['ما وحدة قياس شدة التيار الكهربائي؟',['فولت','واط','أمبير','أوم'],2,'علوم'],
      ['أي عضو يضخ الدم في جسم الإنسان؟',['الرئة','القلب','الكبد','الكلية'],1,'علوم'],
      ['ما الحالة التي يتحول فيها الماء إلى بخار؟',['التجمد','التكثف','التبخر','الترسيب'],2,'علوم']
    ],
    social:[
      ['بماذا يُقدَّم غالبًا القهوة العُمانية للضيف؟',['التمر','الخبز فقط','الأرز','الفاكهة فقط'],0,'مجتمع وتراث'],
      ['ما اسم الأداة التراثية العُمانية التي تُلبس على الخصر في المناسبات الرسمية؟',['السيف الياباني','الخنجر العُماني','القوس','الرمح'],1,'مجتمع وتراث'],
      ['أي مادة عطرية ارتبطت تاريخيًا بمحافظة ظفار؟',['العنبر الصناعي','اللبان','الفانيلا','القرفة'],1,'مجتمع وتراث'],
      ['ما اسم نظام الري التقليدي المشهور في عُمان؟',['الأفلاج','القنوات الرومانية','السواقي الجليدية','الخزانات المعلقة'],0,'مجتمع وتراث'],
      ['أي مكان يُعد من أشهر الأسواق التقليدية في مسقط؟',['سوق مطرح','سوق صحار المركزي','سوق عبري الجديد','سوق نزوى الصناعي'],0,'مجتمع وتراث'],
      ['ما الذي يميز المجلس في المجتمع العُماني تقليديًا؟',['مكان لاستقبال الضيوف والتجمع','مخزن للمؤن','ورشة صناعية','مرآب مركبات'],0,'مجتمع وتراث']
    ]
  };
  BANKS.mixed = Object.values(BANKS).flat();

  // Draw unseen questions first; only recycle a category after its available bank is exhausted.
  function drawQuestions(category, count = 6) {
    const bank = BANKS[category] || BANKS.mixed;
    const key = `iamOmaniSeenQuestions:${category}`;
    let seen;
    try { seen = new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch { seen = new Set(); }
    const fingerprint = q => `${q[0]}|${q[1][q[2]]}`;
    const shuffle = items => { const copy = [...items]; for (let i=copy.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; } return copy; };
    let fresh = shuffle(bank.filter(q => !seen.has(fingerprint(q))));
    const selected = fresh.slice(0, count);
    if (selected.length < count) {
      seen.clear();
      selected.push(...shuffle(bank.filter(q => !selected.includes(q))).slice(0, count - selected.length));
    }
    selected.forEach(q => seen.add(fingerprint(q)));
    localStorage.setItem(key, JSON.stringify([...seen]));
    return selected;
  }

  const profileDefault = () => ({
    xp:0,games:0,wins:0,correct:0,fastest:0,maxStreak:0,currentStreak:0,perfect:0,
    categories:{},badges:[],daily:{date:'',games:0,correct:0,fastest:0,claimed:{}},
    lastName:'',lastAvatar:'🇴🇲'
  });
  let profile = (()=>{try{return {...profileDefault(),...JSON.parse(localStorage.getItem('iamOmaniProgress')||'{}')}}catch{return profileDefault()}})();
  let currentCategory = 'mixed';
  let currentDifficulty = 'متوسط';
  let currentMode = 'عادية';
  let pendingSeed = false;
  let game = {correct:0,fastest:0,questions:0,categoryHits:{}};

  let cloudUser=null,cloudFirebase=null,cloudSave=Promise.resolve();
  const save = () => {
    localStorage.setItem('iamOmaniProgress',JSON.stringify(profile));
    if(!cloudUser||!cloudFirebase)return;
    const uid=cloudUser.uid,f=cloudFirebase,snapshot=JSON.parse(JSON.stringify(profile));
    const level=levelInfo(snapshot.xp).cur.level;
    cloudSave=cloudSave.catch(()=>{}).then(()=>f.dbMod.updateDoc(f.dbMod.doc(f.db,'users',uid),{
      progress:snapshot,xp:snapshot.xp,level,badges:snapshot.badges
    })).catch(error=>console.error('Cloud progress save failed',error));
  };
  window.addEventListener('iam-omani-auth',event=>{
    const {user,firebase,profile:account}=event.detail;
    cloudUser=user;cloudFirebase=user?firebase:null;
    if(user){
      profile={...profileDefault(),...(account?.progress||{}),lastName:account?.username||profile.lastName};
      localStorage.setItem('iamOmaniProgress',JSON.stringify(profile));
      renderProfile();decorateSelf();
    }
  });
  const levelInfo = xp => {
    let cur=LEVELS[0]; for(const l of LEVELS) if(xp>=l.xp) cur=l;
    const idx=LEVELS.findIndex(x=>x.level===cur.level), next=LEVELS[idx+1]||null;
    return {cur,next,pct:next?Math.min(100,Math.round((xp-cur.xp)/(next.xp-cur.xp)*100)):100};
  };
  const categoryName = id => CATEGORIES.find(c=>c.id===id)?.name || id;
  const addXP = n => {profile.xp=Math.max(0,(profile.xp||0)+n);};
  const ensureDaily = () => {
    const today=new Date().toISOString().slice(0,10);
    if(profile.daily?.date!==today) profile.daily={date:today,games:0,correct:0,fastest:0,claimed:{}};
  };
  const computeBadges = () => {
    const b=[];
    if(profile.games>=1)b.push({id:'start',icon:'🧭',name:'بداية الرحلة'});
    if(profile.wins>=10)b.push({id:'crown',icon:'👑',name:'تاج المجلس'});
    if(profile.correct>=100)b.push({id:'khanjar',icon:'🗡️',name:'الخنجر الذهبي'});
    if(profile.fastest>=25)b.push({id:'falcon',icon:'⚡',name:'صقر السرعة'});
    if(profile.maxStreak>=10)b.push({id:'streak',icon:'🔥',name:'سلسلة المعرفة'});
    if(profile.perfect>=3)b.push({id:'perfect',icon:'💎',name:'صفاء الإجابة'});
    Object.entries(profile.categories||{}).forEach(([cat,v])=>{if((v.correct||0)>=30)b.push({id:'expert-'+cat,icon:CATEGORIES.find(x=>x.id===cat)?.icon||'🏅',name:`خبير ${categoryName(cat)}`})});
    profile.badges=b; return b;
  };
  const claimDaily = () => {
    ensureDaily(); const d=profile.daily, rewards=[];
    if(d.games>=1&&!d.claimed.game){d.claimed.game=true;addXP(100);rewards.push('تحدي المشاركة +100 XP')}
    if(d.correct>=5&&!d.claimed.correct){d.claimed.correct=true;addXP(200);rewards.push('5 إجابات صحيحة +200 XP')}
    if(d.fastest>=1&&!d.claimed.fastest){d.claimed.fastest=true;addXP(150);rewards.push('أسرع إجابة +150 XP')}
    if(rewards.length) setTimeout(()=>toast('🎁 '+rewards.join(' • ')),500);
  };

  function injectCreateOptions(){
    const fields=$('.council-create-fields'); if(!fields||$('#competitionCategory'))return;
    fields.insertAdjacentHTML('beforebegin',`
      <div class="competition-setup">
        <label>اتجاه المسابقة</label>
        <div id="competitionCategory" class="category-picker">${CATEGORIES.map(c=>`<button type="button" data-cat="${c.id}" class="category-choice ${c.id==='mixed'?'selected':''}"><span>${c.icon}</span><b>${c.name}</b><small>${c.desc}</small></button>`).join('')}<button type="button" id="competitionBaloot" class="category-choice baloot-category"><span>🃏</span><b>الورقة • البلوت</b><small>طاولة من أربعة لاعبين، صن وحكم</small></button></div>
        <div class="setup-row">
          <label>المستوى<select id="competitionDifficulty"><option>سهل</option><option selected>متوسط</option><option>متقدم</option><option>نخبة</option></select></label>
          <label>نمط اللعب<select id="competitionMode"><option>سريعة</option><option selected>عادية</option><option>بطولة</option><option>إقصائية</option></select></label>
        </div>
      </div>`);
    $$('#competitionCategory [data-cat]').forEach(b=>b.onclick=()=>{$$('#competitionCategory [data-cat]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');currentCategory=b.dataset.cat;});
    $('#competitionBaloot').onclick=()=>window.IAM_OMANI_BALOUT?.openHost?.();
    $('#competitionDifficulty').onchange=e=>currentDifficulty=e.target.value;
    $('#competitionMode').onchange=e=>currentMode=e.target.value;
  }

  function questionsForSelection(wilayat){
    const base=drawQuestions(currentCategory).map((q,i)=>({id:i+1,question:q[0],options:q[1],correct:q[2],category:q[3],difficulty:currentDifficulty,time:currentMode==='سريعة'?10:currentDifficulty==='نخبة'?12:15}));
    const local=window.OMANI_LOCAL_QUESTIONS?.(wilayat)||[];
    return base.concat(local.map((q,i)=>({...q,id:base.length+i+1,difficulty:currentDifficulty,time:currentMode==='سريعة'?10:15})));
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#createRoomBtn')){pendingSeed=true;currentDifficulty=$('#competitionDifficulty')?.value||currentDifficulty;currentMode=$('#competitionMode')?.value||currentMode;}
  },true);

  socket.on('room:update',room=>{
    if(pendingSeed&&state.role==='host'&&room?.status==='lobby'){
      pendingSeed=false;
      const qs=questionsForSelection(room.wilayat);
      window.OMANI_SET_QUESTIONS?.(qs);
      socket.emit('host:setQuestions',{questions:qs},r=>{if(r?.ok){$('#questionCount').textContent=r.count;toast(`${CATEGORIES.find(c=>c.id===currentCategory)?.icon||'🎯'} تم تجهيز ${r.count} أسئلة، منها ${qs.length-6} عن ولاية ${room.wilayat}`);}});
    }
    decorateSelf();
  });

  function injectProfile(){
    if(!$('#profileBtn')){
      const b=document.createElement('button');b.id='profileBtn';b.className='icon-btn';b.title='ملفي ومستواي';b.textContent='🏅';$('.top-actions')?.prepend(b);b.onclick=()=>{renderProfile();showProfile();};
    }
    if(!$('#progressProfileScreen')){
      $('#app')?.insertAdjacentHTML('beforeend',`<section id="progressProfileScreen" class="screen"><div class="profile-shell"><button class="back profile-back">→ رجوع</button><div id="progressProfileBody"></div></div></section>`);
      $('.profile-back').onclick=()=>show('home');
    }
  }
  function showProfile(){ $$('.screen').forEach(s=>s.classList.remove('active'));$('#progressProfileScreen')?.classList.add('active');window.scrollTo(0,0); }

  function renderProfile(){
    computeBadges();ensureDaily();const l=levelInfo(profile.xp);const next=l.next?`${profile.xp.toLocaleString()} / ${l.next.xp.toLocaleString()} XP`:`${profile.xp.toLocaleString()} XP • أعلى مستوى`;
    const cats=Object.entries(profile.categories||{}).sort((a,b)=>(b[1].correct||0)-(a[1].correct||0));
    $('#progressProfileBody').innerHTML=`
      <div class="profile-hero-card"><div class="profile-avatar">${profile.lastAvatar||'🇴🇲'}</div><div><small>ملف اللاعب</small><h1>${esc(profile.lastName||'لاعب أنا عُماني')}</h1><div class="level-title">${l.cur.icon} ${l.cur.name} • Lv.${l.cur.level}</div></div></div>
      <div class="xp-card"><div><b>${next}</b><span>${l.next?`${l.pct}% إلى ${l.next.name}`:'وصلت إلى القمة'}</span></div><div class="xp-track"><i style="width:${l.pct}%"></i></div></div>
      <div class="profile-stat-grid"><div><b>${profile.games}</b><span>مسابقة</span></div><div><b>${profile.wins}</b><span>فوز</span></div><div><b>${profile.correct}</b><span>إجابة صحيحة</span></div><div><b>${profile.fastest}</b><span>أسرع إجابة</span></div><div><b>${profile.maxStreak}</b><span>أفضل سلسلة</span></div><div><b>${profile.perfect}</b><span>مسابقة كاملة</span></div></div>
      <div class="profile-section"><h3>🏅 الشارات</h3><div class="badge-grid">${profile.badges.length?profile.badges.map(b=>`<div class="achievement-badge"><span>${b.icon}</span><b>${b.name}</b></div>`).join(''):'<div class="empty-state">ابدأ اللعب لفتح أول شارة.</div>'}</div></div>
      <div class="profile-section"><h3>📊 تخصصاتك</h3><div class="specialty-list">${cats.length?cats.map(([id,v])=>`<div><span>${CATEGORIES.find(c=>c.id===id)?.icon||'🎯'}</span><b>${categoryName(id)}</b><i><em style="width:${Math.min(100,(v.correct||0)*3)}%"></em></i><strong>${v.correct||0}</strong></div>`).join(''):'<div class="empty-state">ستظهر هنا المجالات الأقوى لديك.</div>'}</div></div>
      <div class="profile-section daily-card"><h3>🌅 تحديات اليوم</h3>${dailyRows()}</div>${cloudUser?'<button id="profileSignOut" class="secondary-btn">تسجيل الخروج</button>':''}`;
    if(cloudUser)$('#profileSignOut').onclick=()=>cloudFirebase.authMod.signOut(cloudFirebase.auth);
  }
  function dailyRows(){ensureDaily();const d=profile.daily;return [
    ['شارك في مسابقة',d.games,1,100,d.claimed.game],['أجب 5 إجابات صحيحة',d.correct,5,200,d.claimed.correct],['حقق أسرع إجابة',d.fastest,1,150,d.claimed.fastest]
  ].map(x=>`<div class="daily-row ${x[4]?'done':''}"><span>${x[4]?'✅':'🎯'}</span><div><b>${x[0]}</b><small>${Math.min(x[1],x[2])}/${x[2]} • +${x[3]} XP</small></div></div>`).join('');}

  function decorateSelf(){
    const l=levelInfo(profile.xp);const badge=computeBadges()[0];
    const name=$('#myName');if(name&&state.role==='player'){
      const base=state.player?.name||profile.lastName||'';name.innerHTML=`${esc(base)} <span class="mini-level">Lv.${l.cur.level} ${l.cur.icon}</span>${badge?` <span title="${badge.name}">${badge.icon}</span>`:''}`;
    }
  }

  socket.on('join:approved',payload=>{profile.lastName=payload?.player?.name||profile.lastName;profile.lastAvatar=payload?.player?.avatar||profile.lastAvatar;save();setTimeout(decorateSelf,100)});
  socket.on('quiz:question',q=>{if(q.number===1){game={correct:0,fastest:0,questions:0,categoryHits:{}};profile.currentStreak=0;}game.questions++;game.currentCategory=(q.category||'متنوعة');});
  socket.on('quiz:result',r=>{
    if(state.role!=='player'||!state.player)return;
    const me=r.podium?.find(x=>x.name===state.player.name);
    if(me){
      game.correct++;profile.correct++;profile.currentStreak=(profile.currentStreak||0)+1;profile.maxStreak=Math.max(profile.maxStreak||0,profile.currentStreak);addXP(100);
      const id=CATEGORIES.find(c=>c.name===game.currentCategory)?.id||currentCategory||'mixed';profile.categories[id]=profile.categories[id]||{correct:0};profile.categories[id].correct++;
      if(me.rank===1){game.fastest++;profile.fastest++;addXP(50);}
      if(profile.currentStreak>0&&profile.currentStreak%5===0)addXP(150);
    } else profile.currentStreak=0;
    save();
  });
  socket.on('quiz:finished',board=>{
    if(state.role!=='player'||!state.player)return;
    const me=board.find(x=>x.name===state.player.name);if(!me)return;
    profile.games++;addXP(50);ensureDaily();profile.daily.games++;profile.daily.correct+=game.correct;profile.daily.fastest+=game.fastest;
    if(me.rank===1){profile.wins++;addXP(300)}else if(me.rank===2)addXP(200);else if(me.rank===3)addXP(120);
    if(game.questions>0&&game.correct===game.questions){profile.perfect++;addXP(250)}
    computeBadges();claimDaily();save();setTimeout(()=>{decorateSelf();renderProfile();toast(`⭐ كسبت XP • مستواك الآن ${levelInfo(profile.xp).cur.name}`)},900);
  });

  injectProfile();
  setTimeout(injectCreateOptions,120);
  const observer=new MutationObserver(()=>{injectCreateOptions();});observer.observe(document.body,{childList:true,subtree:true});
})();
