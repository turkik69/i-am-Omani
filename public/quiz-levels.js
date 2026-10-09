(() => {
  const LEVEL_KEY='iamOmaniQuizLevels';
  const DIFFS=['سهل','متوسط','متقدم','نخبة'];
  const app=document.querySelector('#app');
  if(!app||!window.socket)return;

  let config={total:1,current:1,base:'متوسط',category:'mixed',mode:'عادية'};
  let cumulative=new Map();
  let lastBoard=[];
  let advancing=false;
  let trackedCode=null;

  function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function load(){
    try{const saved=JSON.parse(sessionStorage.getItem(LEVEL_KEY)||'null');if(saved&&saved.code===window.state?.code)config={...config,...saved};}catch{}
  }
  function save(){try{sessionStorage.setItem(LEVEL_KEY,JSON.stringify({...config,code:window.state?.code||null}));}catch{}}
  function difficultyFor(level){
    const base=Math.max(0,DIFFS.indexOf(config.base));
    return DIFFS[Math.min(DIFFS.length-1,base+Math.max(0,level-1))]||'متوسط';
  }
  function questionCount(){return config.mode==='سريعة'?5:(config.mode==='بطولة'||config.mode==='إقصائية'?8:6);}
  function addBoard(board){
    lastBoard=Array.isArray(board)?board:[];
    for(const p of lastBoard){
      const key=p.uid||p.name;
      const prev=cumulative.get(key)||{...p,score:0,correct:0};
      prev.score+=(Number(p.score)||0); prev.correct+=(Number(p.correct)||0); prev.name=p.name;prev.avatar=p.avatar;prev.uid=p.uid;prev.hasPhoto=p.hasPhoto;
      cumulative.set(key,prev);
    }
  }
  function cumulativeBoard(){
    return [...cumulative.values()].sort((a,b)=>b.score-a.score).map((p,i)=>({...p,rank:i+1}));
  }
  function renderCumulative(){
    const board=cumulativeBoard();
    if(window.renderLeaderboard&&document.querySelector('#finalBoard'))window.renderLeaderboard(board);
    const final=document.querySelector('#finalBoard');
    if(final&&window.playerAvatarHTML)final.innerHTML=board.map((p,i)=>`<div class="board-row"><span class="rank">#${i+1}</span><span>${window.playerAvatarHTML(p)}</span><b>${esc(p.name)}</b><strong>${p.score} XP</strong></div>`).join('');
  }

  app.insertAdjacentHTML('beforeend',`
    <section id="levelBreakScreen" class="screen compact-screen">
      <div class="panel glow-panel" style="text-align:center;max-width:560px">
        <div style="font-size:3rem">🏆</div>
        <h2 id="levelBreakTitle">اكتمل المستوى</h2>
        <p id="levelBreakText" class="muted"></p>
        <div id="levelBreakBoard" class="leaderboard" style="margin-top:14px"></div>
        <div id="levelHostActions" class="host-only hidden">
          <button id="continueLevelBtn" class="primary-btn">الانتقال للمستوى التالي ←</button>
          <button id="stopLevelsBtn" class="secondary-btn">إنهاء المسابقة هنا</button>
        </div>
        <div id="levelPlayerWait" class="player-wait">بانتظار قرار مشرف المسابقة…</div>
      </div>
    </section>
  `);

  function showBreak(){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.querySelector('#levelBreakScreen')?.classList.add('active');
    document.querySelector('#levelBreakTitle').textContent=`اكتمل المستوى ${config.current} من ${config.total}`;
    const next= difficultyFor(config.current+1);
    document.querySelector('#levelBreakText').textContent=`المستوى التالي سيكون أصعب بدرجة: ${next}. هل تريد مواصلة التحدي؟`;
    const board=cumulativeBoard();
    const box=document.querySelector('#levelBreakBoard');
    if(box)box.innerHTML=board.map((p,i)=>`<div class="board-row"><span class="rank">#${i+1}</span><span>${window.playerAvatarHTML?.(p)||''}</span><b>${esc(p.name)}</b><strong>${p.score} XP</strong></div>`).join('');
    const host=window.state?.role==='host';
    document.querySelector('#levelHostActions')?.classList.toggle('hidden',!host);
    document.querySelector('#levelPlayerWait')?.classList.toggle('hidden',host);
  }

  async function prepareNextLevel(){
    if(advancing)return;
    advancing=true;
    const nextLevel=config.current+1;
    const difficulty=difficultyFor(nextLevel);
    try{
      const qs=new URLSearchParams({category:config.category,difficulty,count:String(questionCount())});
      const res=await fetch('/api/questions?'+qs.toString(),{cache:'no-store'});
      if(!res.ok)throw new Error('questions');
      const data=await res.json();
      if(!Array.isArray(data.questions)||!data.questions.length)throw new Error('questions');
      socket.emit('host:reset');
      await new Promise(r=>setTimeout(r,180));
      socket.emit('host:setQuestions',{questions:data.questions},setRes=>{
        if(!setRes?.ok){advancing=false;window.toast?.(setRes?.error||'تعذر تجهيز المستوى التالي');return;}
        config.current=nextLevel; save();
        socket.emit('host:start',{},startRes=>{
          advancing=false;
          if(!startRes?.ok)window.toast?.(startRes?.error||'تعذر بدء المستوى التالي');
          else window.toast?.(`بدأ المستوى ${config.current} — ${difficulty}`);
        });
      });
    }catch{
      advancing=false;
      window.toast?.('تعذر تحميل أسئلة المستوى التالي. حاول مجددًا.');
    }
  }

  document.querySelector('#continueLevelBtn')?.addEventListener('click',prepareNextLevel);
  document.querySelector('#stopLevelsBtn')?.addEventListener('click',()=>{
    document.querySelector('#finalScreen')?.classList.add('active');
    document.querySelector('#levelBreakScreen')?.classList.remove('active');
    renderCumulative();
  });

  window.IAM_OMANI_LEVELS={
    configure(next){config={...config,...next,current:1};cumulative.clear();save();},
    get:()=>({...config})
  };

  socket.on('quiz:question',q=>{
    if(trackedCode!==window.state?.code){trackedCode=window.state?.code||null;cumulative.clear();}
    load();
    const tag=document.querySelector('#difficulty');
    if(tag&&config.total>1)tag.textContent=`${q.difficulty||difficultyFor(config.current)} • المستوى ${config.current}/${config.total}`;
  });

  socket.on('quiz:finished',board=>{
    load();
    addBoard(board);
    renderCumulative();
    if(window.state?.role==='host'&&config.total>1&&config.current<config.total){
      setTimeout(showBreak,120);
    }
  });

  socket.on('quiz:reset',()=>{
    if(config.total>1&&config.current<config.total&&window.state?.role!=='host')setTimeout(showBreak,80);
  });
})();