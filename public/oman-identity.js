(() => {
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];

  document.documentElement.style.setProperty('--oman-gold', '#f2bd63');
  document.title = 'أنا عُماني';
  const desc = q('meta[name="description"]');
  if (desc) desc.content = 'أنا عُماني | I Am Omani — مسابقات حية بهوية عُمانية، ساحات الولايات ومجالس القرى';
  let apple = q('meta[name="apple-mobile-web-app-title"]');
  if (!apple) { apple=document.createElement('meta'); apple.name='apple-mobile-web-app-title'; document.head.appendChild(apple); }
  apple.content = 'أنا عُماني';
  let touch = q('link[rel="apple-touch-icon"]');
  if (!touch) { touch=document.createElement('link'); touch.rel='apple-touch-icon'; document.head.appendChild(touch); }
  touch.href='/icon.svg?v=4';
  let favicon=q('link[rel="icon"]');
  if(favicon) favicon.href='/icon.svg?v=4';

  const brand = q('.brand span:last-child');
  if (brand) brand.innerHTML = '<b>I AM OMANI</b><small>أنا عُماني</small>';
  const heroTitle = q('#homeScreen .hero h1');
  if (heroTitle) heroTitle.innerHTML = '<span>أنا عُماني</span>';
  const eyebrow = q('#homeScreen .eyebrow');
  if (eyebrow) eyebrow.textContent = 'I AM OMANI • LIVE QUIZ';
  const heroP = q('#homeScreen .hero p');
  if (heroP) heroP.textContent = 'اعرف عُمان... وتحدَّ غيرك في ساحات الولايات ومجالس القرى.';
  const finalTitle = q('#finalScreen .final-title h1');
  if (finalTitle) finalTitle.textContent = 'أبطال أنا عُماني';
  const displayBrand = q('#displayScreen .display-head b');
  if (displayBrand) displayBrand.textContent = 'أنا عُماني — تحدّي المعرفة';

  qa('.floating-trophy').forEach(el => {
    el.innerHTML = '<img class="oman-hero-tower" src="/sahwa-tower.svg?v=4" alt="برج الصحوة">';
  });

  const host=q('.host-card'), player=q('.player-card'), display=q('.display-card');
  if (host && !host.querySelector('.landmark-art')) host.insertAdjacentHTML('afterbegin','<img class="landmark-art municipality-art" src="/muscat-municipality.svg" alt="مبنى بلدية مسقط">');
  if (player && !player.querySelector('.landmark-art')) player.insertAdjacentHTML('afterbegin','<img class="landmark-art opera-art" src="/royal-opera.svg" alt="دار الأوبرا السلطانية مسقط">');
  if (display && !display.querySelector('.landmark-art')) display.insertAdjacentHTML('afterbegin','<img class="landmark-art riyam-art" src="/riyam.svg" alt="مبخرة ريام">');

  const style=document.createElement('style');
  style.textContent=`
    .brand b{letter-spacing:.12em}.brand small{color:#f4c76f!important}
    .oman-hero-tower{width:min(190px,42vw);height:auto;display:block;filter:drop-shadow(0 0 14px rgba(255,188,75,.7)) drop-shadow(0 0 30px rgba(109,74,255,.55));animation:omanFloat 4s ease-in-out infinite}
    .floating-trophy{font-size:0!important;overflow:visible!important}
    @keyframes omanFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    .mode-card{position:relative;overflow:visible!important;isolation:isolate;min-height:156px;padding-top:52px!important}
    .mode-card>div,.mode-card>.mode-icon,.mode-card>.arrow{position:relative;z-index:2}
    .landmark-art{position:absolute;z-index:1;pointer-events:none;object-fit:contain;filter:drop-shadow(0 0 12px rgba(255,190,80,.65));opacity:.96}
    .municipality-art{width:176px;right:14px;top:-57px}.opera-art{width:185px;right:20px;top:-55px}.riyam-art{width:118px;right:34px;top:-72px}
    .mode-card::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,transparent 10%,rgba(7,9,20,.16) 48%,rgba(7,9,20,.52));z-index:1;pointer-events:none}
    #musicBtn{position:relative}.music-on::after{content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:#f4c76f;bottom:6px;right:6px;box-shadow:0 0 8px #f4c76f}
    @media(max-width:720px){.landmark-art{transform:scale(.9)}.municipality-art,.opera-art{right:8px}.riyam-art{right:20px}}
  `;
  document.head.appendChild(style);

  const topActions=q('.top-actions');
  if(topActions&&!q('#musicBtn')){const btn=document.createElement('button');btn.id='musicBtn';btn.className='icon-btn music-on';btn.title='الموسيقى العُمانية الهادئة';btn.textContent='🎵';topActions.prepend(btn);}

  class OmanAmbient{
    constructor(){this.ctx=null;this.master=null;this.timer=null;this.step=0;this.enabled=localStorage.getItem('iamOmaniMusic')!=='off';this.sequence=[293.66,311.13,369.99,392,440,466.16,554.37,440,392,369.99,311.13,293.66]}
    ensure(){if(!this.enabled)return;if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.035;this.master.connect(this.ctx.destination)}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});if(!this.timer)this.start()}
    pluck(freq,when,vol=.055){const c=this.ctx,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type='triangle';o.frequency.setValueAtTime(freq,when);o.frequency.exponentialRampToValueAtTime(freq*.998,when+.7);f.type='lowpass';f.frequency.value=1450;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(vol,when+.018);g.gain.exponentialRampToValueAtTime(.0001,when+1.45);o.connect(f);f.connect(g);g.connect(this.master);o.start(when);o.stop(when+1.55)}
    drum(when){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(92,when);o.frequency.exponentialRampToValueAtTime(52,when+.16);g.gain.setValueAtTime(.045,when);g.gain.exponentialRampToValueAtTime(.0001,when+.28);o.connect(g);g.connect(this.master);o.start(when);o.stop(when+.3)}
    phrase(){if(!this.enabled||!this.ctx)return;const now=this.ctx.currentTime+.04;for(let i=0;i<4;i++)this.pluck(this.sequence[(this.step+i)%this.sequence.length],now+i*.78,i===0?.06:.045);this.drum(now);this.drum(now+1.56);this.step=(this.step+3)%this.sequence.length}
    start(){this.phrase();this.timer=setInterval(()=>this.phrase(),3300)}
    stop(){if(this.timer){clearInterval(this.timer);this.timer=null}if(this.master&&this.ctx)this.master.gain.setTargetAtTime(.0001,this.ctx.currentTime,.12)}
    setEnabled(on){this.enabled=on;localStorage.setItem('iamOmaniMusic',on?'on':'off');if(on){this.ensure();if(this.master)this.master.gain.setTargetAtTime(.035,this.ctx.currentTime,.18)}else this.stop()}
    setQuestionMode(active){if(this.master&&this.ctx&&this.enabled)this.master.gain.setTargetAtTime(active?.012:.035,this.ctx.currentTime,.4)}
  }
  const ambient=new OmanAmbient(),musicBtn=q('#musicBtn');
  const refresh=()=>{if(!musicBtn)return;musicBtn.textContent=ambient.enabled?'🎵':'🎶';musicBtn.classList.toggle('music-on',ambient.enabled);musicBtn.title=ambient.enabled?'إيقاف الموسيقى العُمانية':'تشغيل الموسيقى العُمانية'};
  refresh();musicBtn?.addEventListener('click',e=>{e.stopPropagation();ambient.setEnabled(!ambient.enabled);refresh()});
  document.addEventListener('pointerdown',()=>ambient.ensure(),{once:true,passive:true});
  document.addEventListener('keydown',()=>ambient.ensure(),{once:true});
  const observer=new MutationObserver(()=>ambient.setQuestionMode(q('.screen.active')?.id==='questionScreen'));
  qa('.screen').forEach(s=>observer.observe(s,{attributes:true,attributeFilter:['class']}));
})();
