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
  touch.href='/icon.svg?v=6';
  const favicon=q('link[rel="icon"]');
  if(favicon) favicon.href='/icon.svg?v=6';

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

  // Premium landmark artwork is supplied by oman-premium.css.
  qa('.floating-trophy').forEach(el => { el.innerHTML=''; el.setAttribute('aria-label','برج الصحوة'); });
  qa('.landmark-art').forEach(el => el.remove());
  document.body.classList.add('premium-oman-v2');

  const topActions=q('.top-actions');
  if(topActions&&!q('#musicBtn')){
    const btn=document.createElement('button');
    btn.id='musicBtn';
    btn.className='icon-btn';
    btn.title='الموسيقى العُمانية';
    btn.textContent='🎵';
    topActions.prepend(btn);
  }

  class OmaniMusic {
    constructor(){
      this.enabled=localStorage.getItem('iamOmaniMusic')!=='off';
      this.audio=null;
      this.menuVolume=.085;
      this.questionVolume=.032;
      this.fadeTimer=null;
      this.loadPromise=null;
    }
    isQuestion(){ return q('.screen.active')?.id==='questionScreen'; }
    loadAsset(){
      if(window.OMAN_MUSIC_SRC) return Promise.resolve();
      if(this.loadPromise) return this.loadPromise;
      this.loadPromise=new Promise(resolve=>{
        const s=document.createElement('script');
        s.src='/oman-music.js?v=1';
        s.async=true;
        s.onload=resolve;
        s.onerror=resolve;
        document.head.appendChild(s);
      });
      return this.loadPromise;
    }
    async ensure(){
      if(!this.enabled) return;
      await this.loadAsset();
      if(!window.OMAN_MUSIC_SRC) return;
      if(!this.audio){
        this.audio=new Audio(window.OMAN_MUSIC_SRC);
        this.audio.loop=true;
        this.audio.preload='auto';
        this.audio.volume=this.isQuestion()?this.questionVolume:this.menuVolume;
      }
      const promise=this.audio.play();
      if(promise?.catch) promise.catch(()=>{});
    }
    setEnabled(on){
      this.enabled=on;
      localStorage.setItem('iamOmaniMusic',on?'on':'off');
      if(on) this.ensure();
      else this.audio?.pause();
    }
    setQuestionMode(active){
      if(!this.audio) return;
      const target=active?this.questionVolume:this.menuVolume;
      const start=this.audio.volume;
      let step=0;
      clearInterval(this.fadeTimer);
      this.fadeTimer=setInterval(()=>{
        step++;
        this.audio.volume=Math.max(0,Math.min(1,start+(target-start)*(step/12)));
        if(step>=12) clearInterval(this.fadeTimer);
      },35);
    }
  }

  const music=new OmaniMusic();
  const musicBtn=q('#musicBtn');
  const refreshMusicButton=()=>{
    if(!musicBtn) return;
    musicBtn.textContent=music.enabled?'🎵':'🎶';
    musicBtn.classList.toggle('music-on',music.enabled);
    musicBtn.title=music.enabled?'إيقاف الموسيقى العُمانية':'تشغيل الموسيقى العُمانية';
  };
  refreshMusicButton();
  musicBtn?.addEventListener('click',e=>{
    e.stopPropagation();
    music.setEnabled(!music.enabled);
    refreshMusicButton();
  });

  // Safari/iOS only permits media playback after the first user gesture.
  const unlock=()=>music.ensure();
  document.addEventListener('pointerdown',unlock,{once:true,passive:true});
  document.addEventListener('keydown',unlock,{once:true});

  const observer=new MutationObserver(()=>music.setQuestionMode(music.isQuestion()));
  qa('.screen').forEach(s=>observer.observe(s,{attributes:true,attributeFilter:['class']}));
})();
