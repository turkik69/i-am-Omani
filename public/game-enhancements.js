(() => {
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  let ctx=null, master=null, enabled=true;
  function ensure(){
    if(!AudioCtx||!enabled)return null;
    if(!ctx){ctx=new AudioCtx();master=ctx.createGain();master.gain.value=.18;master.connect(ctx.destination)}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return ctx;
  }
  function tone(freq,dur=.08,type='sine',gain=.16,delay=0){
    const c=ensure(); if(!c)return;
    const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);
  }
  function noise(dur=.06,gain=.12,delay=0,highpass=800){
    const c=ensure();if(!c)return;
    const len=Math.max(1,Math.floor(c.sampleRate*dur)),buf=c.createBuffer(1,len,c.sampleRate),a=buf.getChannelData(0);
    for(let i=0;i<len;i++)a[i]=(Math.random()*2-1)*(1-i/len);
    const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime+delay;
    src.buffer=buf;f.type='highpass';f.frequency.value=highpass;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    src.connect(f);f.connect(g);g.connect(master);src.start(t);
  }
  const SFX={
    ui(){tone(520,.045,'triangle',.06)},
    select(){tone(620,.055,'triangle',.07);tone(820,.07,'sine',.05,.045)},
    shuffle(){for(let i=0;i<5;i++)noise(.07,.12,i*.055,700+i*130);tone(180,.08,'triangle',.05,.28)},
    deal(){for(let i=0;i<4;i++){noise(.045,.10,i*.09,1000);tone(260+i*22,.045,'triangle',.04,i*.09)}},
    card(){noise(.045,.13,0,1200);tone(210,.065,'triangle',.06,.015)},
    turn(){tone(740,.09,'sine',.10);tone(980,.12,'sine',.09,.09)},
    join(){tone(440,.09,'sine',.08);tone(660,.11,'sine',.08,.07)},
    start(){tone(320,.08,'square',.05);tone(480,.09,'square',.06,.08);tone(720,.14,'triangle',.09,.17)},
    tick(){tone(980,.035,'sine',.035)},
    answer(){tone(360,.05,'triangle',.06);tone(520,.06,'triangle',.05,.04)},
    win(){[523,659,784,1046].forEach((f,i)=>tone(f,.20,'triangle',.09,i*.1));setTimeout(()=>noise(.20,.07,0,1600),260)},
    lose(){tone(420,.12,'sine',.07);tone(330,.16,'sine',.07,.12);tone(250,.2,'sine',.06,.27)}
  };
  window.IAMSFX={play:name=>SFX[name]?.(),setEnabled:v=>{enabled=!!v;if(enabled)ensure()},isEnabled:()=>enabled};
  document.addEventListener('pointerdown',ensure,{once:true,passive:true});

  document.addEventListener('click',e=>{
    const sound=e.target.closest?.('#soundBtn');
    if(sound){setTimeout(()=>{enabled=sound.textContent!=='🔇';if(enabled)ensure()},0);return}
    if(e.target.closest?.('.baloot-card'))SFX.card();
    else if(e.target.closest?.('.game-choice,[data-baloot-entry]'))SFX.select();
    else if(e.target.closest?.('.baloot-btn'))SFX.ui();
    else if(e.target.closest?.('#answers .answer-btn'))SFX.answer();
  },true);

  let lastHand=false,lastTurn=false,lastRound='';
  const scanBaloot=()=>{
    const hand=$('.baloot-hand');
    if(hand&&!lastHand){lastHand=true;SFX.shuffle();setTimeout(()=>SFX.deal(),320)}
    if(!hand)lastHand=false;
    const turn=$$('.baloot-wait').find(x=>/دورك الآن/.test(x.textContent||''));
    if(!!turn&&!lastTurn)SFX.turn();
    lastTurn=!!turn;
    const round=$('#balootBody h3')?.textContent||'';
    if(/انتهت الجولة/.test(round)&&round!==lastRound){lastRound=round;SFX.win()}
  };
  new MutationObserver(scanBaloot).observe(document.documentElement,{subtree:true,childList:true,characterData:true});

  let lastTick='';
  new MutationObserver(()=>{
    const screen=$('#questionScreen');const t=$('#timerText');
    if(!screen?.classList.contains('active')||!t)return;
    const n=Number(t.textContent);if(n>0&&n<=5&&t.textContent!==lastTick){lastTick=t.textContent;SFX.tick()}
  }).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});

  function addBalootEntry(){
    const picker=$('#competitionCategory');if(!picker||picker.querySelector('[data-baloot-entry]'))return;
    const b=document.createElement('button');
    b.type='button';b.className='category-choice baloot-category-choice';b.dataset.balootEntry='1';
    b.innerHTML='<span style="display:grid;place-items:center"><img src="/baloot-icon.svg?v=33" alt="" style="width:42px;height:42px;object-fit:contain"></span><b>الورقة • البلوت</b><small>صن، حكم، وتحديات الطاولات</small>';
    b.addEventListener('click',()=>{
      SFX.select();
      const choice=$('.game-choice[data-game="baloot"]');
      if(choice)choice.click();
      setTimeout(()=>$('.host-card')?.click(),40);
    });
    picker.appendChild(b);
  }
  new MutationObserver(addBalootEntry).observe(document.documentElement,{subtree:true,childList:true});
  addBalootEntry();
})();
