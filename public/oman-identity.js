(() => {
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const V='21';
  const root=document.documentElement.style;

  async function base64Asset(path,mime='image/webp'){
    const r=await fetch(`${path}?v=${V}`,{cache:'no-store'});
    if(!r.ok) throw new Error(`asset ${path} ${r.status}`);
    const raw=(await r.text()).replace(/\s+/g,'');
    if(!raw) throw new Error(`empty ${path}`);
    return `data:${mime};base64,${raw}`;
  }

  async function applyVisualAssets(){
    try{
      const [sahwa,municipality,opera,riyam,heritage]=await Promise.all([
        base64Asset('/assets/sahwa-hero.webp'),
        base64Asset('/assets/municipality-card.webp'),
        base64Asset('/assets/opera-card.webp'),
        base64Asset('/assets/riyam-card.webp'),
        base64Asset('/oman-heritage-bg.b64')
      ]);
      root.setProperty('--oman-sahwa-photo',`url("${sahwa}")`);
      root.setProperty('--oman-municipality-photo',`url("${municipality}")`);
      root.setProperty('--oman-opera-photo',`url("${opera}")`);
      root.setProperty('--oman-riyam-photo',`url("${riyam}")`);
      root.setProperty('--oman-home-bg',`url("${heritage}")`);
      qa('.floating-trophy').forEach(el=>{
        el.innerHTML='';
        el.setAttribute('aria-label','برج الصحوة');
        el.style.backgroundImage=`url("${sahwa}")`;
        el.style.backgroundRepeat='no-repeat';
        el.style.backgroundPosition='center bottom';
        el.style.backgroundSize='contain';
      });
      let favicon=q('link[rel="icon"]');
      if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon)}
      favicon.href=sahwa; favicon.type='image/webp';
      let touch=q('link[rel="apple-touch-icon"]');
      if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';document.head.appendChild(touch)}
      touch.href=sahwa;
      touch.sizes='512x512';
      document.documentElement.dataset.omanAssets='ready';
    }catch(err){
      console.error('Omani visual assets failed',err);
      root.setProperty('--oman-home-bg','linear-gradient(180deg,#071426,#06101d)');
      document.documentElement.dataset.omanAssets='error';
    }
  }

  document.title='أنا عُماني';
  const desc=q('meta[name="description"]');
  if(desc) desc.content='أنا عُماني | I Am Omani — ألعاب ومسابقات جماعية حية بهوية عُمانية';
  let apple=q('meta[name="apple-mobile-web-app-title"]');
  if(!apple){apple=document.createElement('meta');apple.name='apple-mobile-web-app-title';document.head.appendChild(apple)}
  apple.content='أنا عُماني';
  const manifest=q('link[rel="manifest"]'); if(manifest) manifest.href=`/manifest.json?v=${V}`;
  let css=q('link[data-oman-home-final]');
  if(!css){css=document.createElement('link');css.rel='stylesheet';css.dataset.omanHomeFinal='1';document.head.appendChild(css)}
  css.href=`/oman-home-v2.css?v=${V}`;

  const brand=q('.brand span:last-child'); if(brand) brand.innerHTML='<b>I AM OMANI</b><small>أنا عُماني</small>';
  const hero=q('#homeScreen .hero h1'); if(hero) hero.innerHTML='<span>أنا عُماني</span>';
  const eyebrow=q('#homeScreen .eyebrow'); if(eyebrow) eyebrow.textContent='I AM OMANI • LIVE GAMES';
  const heroP=q('#homeScreen .hero p'); if(heroP) heroP.textContent='العب، نافس، واكتشف عُمان… في ساحات الولايات ومجالس القرى.';
  document.body.classList.add('premium-oman-final','oman-v21');
  const top=q('.top-actions'); if(top&&!q('#musicBtn')){const b=document.createElement('button');b.id='musicBtn';b.className='icon-btn';b.title='الموسيقى العُمانية';b.textContent='🎵';top.prepend(b)}
  applyVisualAssets();
})();
