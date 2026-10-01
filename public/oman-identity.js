(() => {
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  document.title='أنا عُماني';
  const desc=q('meta[name="description"]');
  if(desc) desc.content='أنا عُماني | I Am Omani — ألعاب ومسابقات جماعية حية بهوية عُمانية';

  let apple=q('meta[name="apple-mobile-web-app-title"]');
  if(!apple){apple=document.createElement('meta');apple.name='apple-mobile-web-app-title';document.head.appendChild(apple)}
  apple.content='أنا عُماني';

  const manifest=q('link[rel="manifest"]'); if(manifest) manifest.href='/manifest.json?v=18';
  let favicon=q('link[rel="icon"]');
  if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon)}
  favicon.href='/assets/sahwa-hero.webp?v=18'; favicon.type='image/webp';
  let touch=q('link[rel="apple-touch-icon"]');
  if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';document.head.appendChild(touch)}
  touch.href='/assets/sahwa-hero.webp?v=18'; touch.sizes='512x512';

  if(!q('link[data-oman-home-final]')){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='/oman-home-v2.css?v=18';
    css.dataset.omanHomeFinal='1';
    document.head.appendChild(css);
  }

  const root=document.documentElement.style;
  root.setProperty('--oman-sahwa-photo','url("/assets/sahwa-hero.webp?v=18")');
  root.setProperty('--oman-municipality-photo','url("/assets/municipality-card.webp?v=18")');
  root.setProperty('--oman-opera-photo','url("/assets/opera-card.webp?v=18")');
  root.setProperty('--oman-riyam-photo','url("/assets/riyam-card.webp?v=18")');

  fetch('/oman-heritage-bg.b64?v=18',{cache:'no-store'})
    .then(r=>r.ok?r.text():Promise.reject())
    .then(b64=>root.setProperty('--oman-home-bg',`url("data:image/webp;base64,${b64.trim()}")`))
    .catch(()=>root.setProperty('--oman-home-bg','linear-gradient(180deg,#071426,#06101d)'));

  const brand=q('.brand span:last-child'); if(brand) brand.innerHTML='<b>I AM OMANI</b><small>أنا عُماني</small>';
  const hero=q('#homeScreen .hero h1'); if(hero) hero.innerHTML='<span>أنا عُماني</span>';
  const eyebrow=q('#homeScreen .eyebrow'); if(eyebrow) eyebrow.textContent='I AM OMANI • LIVE GAMES';
  const heroP=q('#homeScreen .hero p'); if(heroP) heroP.textContent='العب، نافس، واكتشف عُمان… في ساحات الولايات ومجالس القرى.';
  const finalTitle=q('#finalScreen .final-title h1'); if(finalTitle) finalTitle.textContent='أبطال أنا عُماني';
  const displayBrand=q('#displayScreen .display-head b'); if(displayBrand) displayBrand.textContent='أنا عُماني — تحديات عُمانية مباشرة';
  qa('.floating-trophy').forEach(el=>{el.innerHTML='';el.setAttribute('aria-label','برج الصحوة')});
  qa('.landmark-art').forEach(el=>el.remove());
  document.body.classList.add('premium-oman-final','oman-v18');

  const top=q('.top-actions');
  if(top&&!q('#musicBtn')){const b=document.createElement('button');b.id='musicBtn';b.className='icon-btn';b.title='الموسيقى العُمانية';b.textContent='🎵';top.prepend(b)}
})();
