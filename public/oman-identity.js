(() => {
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const V='22';
  const root=document.documentElement.style;

  async function visualAsset(path,mime='image/webp'){
    const r=await fetch(`${path}?v=${V}`,{cache:'no-store'});
    if(!r.ok) throw new Error(`asset ${path} ${r.status}`);
    const buf=await r.arrayBuffer();
    if(!buf.byteLength) throw new Error(`empty ${path}`);
    const u8=new Uint8Array(buf);
    const isWebP=u8.length>12 && u8[0]===0x52 && u8[1]===0x49 && u8[2]===0x46 && u8[3]===0x46 && u8[8]===0x57 && u8[9]===0x45 && u8[10]===0x42 && u8[11]===0x50;
    const isPng=u8.length>8 && u8[0]===0x89 && u8[1]===0x50 && u8[2]===0x4e && u8[3]===0x47;
    if(isWebP || isPng){
      const type=isPng?'image/png':mime;
      return URL.createObjectURL(new Blob([buf],{type}));
    }
    const raw=new TextDecoder().decode(buf).replace(/\s+/g,'');
    if(!raw || !/^[A-Za-z0-9+/=]+$/.test(raw)) throw new Error(`invalid ${path}`);
    return `data:${mime};base64,${raw}`;
  }

  function setPhotoVar(name,url){
    root.setProperty(name,`url("${url}")`);
  }

  async function loadOne(path,varName,onReady){
    try{
      const url=await visualAsset(path);
      if(varName) setPhotoVar(varName,url);
      if(onReady) onReady(url);
      return true;
    }catch(err){
      console.error('Omani asset failed',path,err);
      return false;
    }
  }

  async function applyVisualAssets(){
    document.documentElement.dataset.omanAssets='loading';

    const sahwaOk=await loadOne('/assets/sahwa-hero.webp','--oman-sahwa-photo',sahwa=>{
      qa('.floating-trophy').forEach(el=>{
        el.innerHTML='';
        el.setAttribute('aria-label','برج الصحوة');
        el.style.setProperty('background-image',`url("${sahwa}")`,'important');
        el.style.setProperty('background-repeat','no-repeat','important');
        el.style.setProperty('background-position','center bottom','important');
        el.style.setProperty('background-size','contain','important');
      });
      let favicon=q('link[rel="icon"]');
      if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon)}
      favicon.href=sahwa; favicon.type='image/webp';
      let touch=q('link[rel="apple-touch-icon"]');
      if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';document.head.appendChild(touch)}
      touch.href=sahwa; touch.sizes='512x512';
    });

    const results=await Promise.all([
      loadOne('/assets/municipality-card.webp','--oman-municipality-photo'),
      loadOne('/assets/opera-card.webp','--oman-opera-photo'),
      loadOne('/assets/riyam-card.webp','--oman-riyam-photo'),
      loadOne('/oman-heritage-bg.b64','--oman-home-bg')
    ]);

    document.documentElement.dataset.omanAssets=(sahwaOk && results.some(Boolean))?'ready':'partial';
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
  document.body.classList.remove('oman-v20','oman-v21');
  document.body.classList.add('premium-oman-final','oman-v22');
  const top=q('.top-actions'); if(top&&!q('#musicBtn')){const b=document.createElement('button');b.id='musicBtn';b.className='icon-btn';b.title='الموسيقى العُمانية';b.textContent='🎵';top.prepend(b)}
  applyVisualAssets();
})();
