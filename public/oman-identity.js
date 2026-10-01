(() => {
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  document.title='أنا عُماني';
  const desc=q('meta[name="description"]');
  if(desc) desc.content='أنا عُماني | I Am Omani — ألعاب ومسابقات جماعية حية بهوية عُمانية';
  let apple=q('meta[name="apple-mobile-web-app-title"]');
  if(!apple){apple=document.createElement('meta');apple.name='apple-mobile-web-app-title';document.head.appendChild(apple)}
  apple.content='أنا عُماني';

  if(!q('link[data-oman-home-final]')){
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='/oman-home-v2.css?v=17';
    css.dataset.omanHomeFinal='1';
    document.head.appendChild(css);
  }

  document.documentElement.style.setProperty('--oman-sahwa-photo','url("/assets/sahwa-approved.png?v=17")');
  const assets={
    '--oman-home-bg':'/oman-heritage-bg.b64?v=17',
    '--oman-municipality-photo':'/municipality-photo.b64?v=17',
    '--oman-opera-photo':'/opera-photo.b64?v=17',
    '--oman-riyam-photo':'/riyam-photo.b64?v=17'
  };
  Object.entries(assets).forEach(([variable,url])=>{
    fetch(url,{cache:'no-store'})
      .then(r=>r.ok?r.text():Promise.reject())
      .then(b64=>document.documentElement.style.setProperty(variable,`url("data:image/webp;base64,${b64.trim()}")`))
      .catch(()=>{});
  });

  const brand=q('.brand span:last-child'); if(brand) brand.innerHTML='<b>I AM OMANI</b><small>أنا عُماني</small>';
  const hero=q('#homeScreen .hero h1'); if(hero) hero.innerHTML='<span>أنا عُماني</span>';
  const eyebrow=q('#homeScreen .eyebrow'); if(eyebrow) eyebrow.textContent='I AM OMANI • LIVE GAMES';
  const heroP=q('#homeScreen .hero p'); if(heroP) heroP.textContent='العب، نافس، واكتشف عُمان… في ساحات الولايات ومجالس القرى.';
  const finalTitle=q('#finalScreen .final-title h1'); if(finalTitle) finalTitle.textContent='أبطال أنا عُماني';
  const displayBrand=q('#displayScreen .display-head b'); if(displayBrand) displayBrand.textContent='أنا عُماني — تحديات عُمانية مباشرة';
  qa('.floating-trophy').forEach(el=>{el.innerHTML='';el.setAttribute('aria-label','برج الصحوة')});
  qa('.landmark-art').forEach(el=>el.remove());
  document.body.classList.add('premium-oman-final');

  const top=q('.top-actions');
  if(top&&!q('#musicBtn')){const b=document.createElement('button');b.id='musicBtn';b.className='icon-btn';b.title='الموسيقى العُمانية';b.textContent='🎵';top.prepend(b)}
})();
