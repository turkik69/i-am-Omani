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
    {id:'oman',name:'عُمان',icon:'🇴🇲',desc:'حكام، تاريخ، مؤسسات وولايات'},
    {id:'sports',name:'رياضة عُمانية',icon:'⚽',desc:'لاعبون ورياضيون من عُمان'},
    {id:'culture',name:'ثقافة عُمانية',icon:'📚',desc:'رؤية 2040 وفعاليات ومؤسسات عُمان'},
    {id:'geography',name:'جغرافية عُمان',icon:'🌍',desc:'محافظات وولايات ومناطق'},
    {id:'science',name:'مؤسسات وتنمية',icon:'🔬',desc:'مؤسسات عُمان ورؤيتها الوطنية'},
    {id:'social',name:'مجتمع وتراث',icon:'☕',desc:'عادات وتراث وموروث عُماني'},
    {id:'mixed',name:'عُمان المتنوعة',icon:'🎲',desc:'مزيج من المجالات العُمانية'}
  ];

  const profileDefault = () => ({
    xp:0,games:0,wins:0,correct:0,fastest:0,maxStreak:0,currentStreak:0,perfect:0,
    categories:{},badges:[],daily:{date:'',games:0,correct:0,fastest:0,claimed:{}},
    lastName:'',lastAvatar:'🇴🇲'
  });
  let profile = (()=>{try{return {...profileDefault(),...JSON.parse(localStorage.getItem('iamOmaniProgress')||'{}')}}catch{return profileDefault()}})();
  let currentCategory = 'mixed';
  let currentDifficulty = 'متوسط';
  let currentMode = 'عادية';
  let game = {correct:0,fastest:0,questions:0,categoryHits:{}};

  let cloudUser=null,cloudFirebase=null,cloudSave=Promise.resolve();
  const save = () => {
    localStorage.setItem(cloudUser?'iamOmaniProgress:'+cloudUser.uid:'iamOmaniProgress',JSON.stringify(profile));
    if(!cloudUser||!cloudFirebase)return;
    const user=cloudUser,snapshot=JSON.parse(JSON.stringify(profile));
    cloudSave=cloudSave.catch(()=>{}).then(async()=>{
      const response=await fetch('/api/profile/progress',{method:'PUT',headers:{
        'content-type':'application/json',Authorization:'Bearer '+await user.getIdToken()
      },body:JSON.stringify({progress:snapshot})});
      if(!response.ok)throw Error('تعذر حفظ التقدم');
    }).catch(error=>console.error('Cloud progress save failed',error));
  };
  window.addEventListener('iam-omani-auth',event=>{
    const {user,firebase,profile:account}=event.detail;
    cloudUser=user;cloudFirebase=user?firebase:null;
    if(user){
      let local={};try{local=JSON.parse(localStorage.getItem('iamOmaniProgress:'+user.uid)||'{}')}catch{}
      profile={...profileDefault(),...(account?.progress||local),lastName:account?.nickname||account?.username||local.lastName||''};
      localStorage.setItem('iamOmaniProgress:'+user.uid,JSON.stringify(profile));
      renderProfile();decorateSelf();
    }else{
      profile=profileDefault();renderProfile();
    }
  });
  window.addEventListener('iam-omani-profile-loaded',event=>{
    if(!cloudUser||event.detail?.uid!==cloudUser.uid)return;
    const account=event.detail;
    profile={...profileDefault(),...(account.progress||profile),lastName:account.name||profile.lastName};
    localStorage.setItem('iamOmaniProgress:'+cloudUser.uid,JSON.stringify(profile));
    renderProfile();decorateSelf();
  });
  window.addEventListener('iam-omani-profile-updated',event=>{
    profile.lastName=event.detail?.name||profile.lastName;
    profile.lastAvatar=event.detail?.hasPhoto?'📷':profile.lastAvatar;
    save();renderProfile();decorateSelf();
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

  socket.on('room:update',()=>decorateSelf());

  function injectProfile(){
    if(!$('#profileBtn')){
      const b=document.createElement('button');b.id='profileBtn';b.className='icon-btn';b.title='ملفي الشخصي';b.setAttribute('aria-label','فتح ملفي الشخصي');b.innerHTML=window.avatarHTML?.('OM1')||'👤';$('.top-actions')?.prepend(b);b.onclick=()=>{renderProfile();showProfile();};
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
      <div class="profile-hero-card"><div class="profile-avatar" id="profileHeroAvatar">${window.avatarHTML?.(window.IAmOmaniFirebase?.profile?.avatar||'OM1')||'👤'}</div><div class="profile-hero-copy"><small>هويتي في أنا عُماني</small><h1>${esc(profile.lastName||'لاعب أنا عُماني')}</h1><div class="level-title">${l.cur.icon} ${l.cur.name} • المستوى ${l.cur.level}</div><p>اسمك وصورتك يظهران في المجالس ومنافساتك، بينما تبقى بيانات حسابك خاصة.</p></div></div>
      <div class="xp-card"><div><b>${next}</b><span>${l.next?`${l.pct}% إلى ${l.next.name}`:'وصلت إلى القمة'}</span></div><div class="xp-track"><i style="width:${l.pct}%"></i></div></div>
      <div class="profile-stat-grid"><div><b>${profile.games}</b><span>مسابقة</span></div><div><b>${profile.wins}</b><span>فوز</span></div><div><b>${profile.correct}</b><span>إجابة صحيحة</span></div><div><b>${profile.fastest}</b><span>أسرع إجابة</span></div><div><b>${profile.maxStreak}</b><span>أفضل سلسلة</span></div><div><b>${profile.perfect}</b><span>مسابقة كاملة</span></div></div>
      <div class="profile-section"><h3>🏅 الشارات</h3><div class="badge-grid">${profile.badges.length?profile.badges.map(b=>`<div class="achievement-badge"><span>${b.icon}</span><b>${b.name}</b></div>`).join(''):'<div class="empty-state">ابدأ اللعب لفتح أول شارة.</div>'}</div></div>
      <div class="profile-section"><h3>📊 تخصصاتك</h3><div class="specialty-list">${cats.length?cats.map(([id,v])=>`<div><span>${CATEGORIES.find(c=>c.id===id)?.icon||'🎯'}</span><b>${categoryName(id)}</b><i><em style="width:${Math.min(100,(v.correct||0)*3)}%"></em></i><strong>${v.correct||0}</strong></div>`).join(''):'<div class="empty-state">ستظهر هنا المجالات الأقوى لديك.</div>'}</div></div>
      <div class="profile-section daily-card"><h3>🌅 تحديات اليوم</h3>${dailyRows()}</div>${cloudUser?'<button id="profileSignOut" class="secondary-btn">تسجيل الخروج</button>':''}`;
    if(cloudUser)$('#profileSignOut').onclick=()=>cloudFirebase.authMod.signOut(cloudFirebase.auth);
    window.IAM_OMANI_SYNC_PROFILE_PHOTO?.();
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
