(() => {
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const V='23';
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
      return URL.createObjectURL(new Blob([buf],{type:isPng?'image/png':mime}));
    }
    const raw=new TextDecoder().decode(buf).replace(/\s+/g,'');
    if(!raw || !/^[A-Za-z0-9+/=]+$/.test(raw)) throw new Error(`invalid ${path}`);
    return `data:${mime};base64,${raw}`;
  }

  function injectStyles(){
    if(q('#oman-v23-img-style')) return;
    const s=document.createElement('style');
    s.id='oman-v23-img-style';
    s.textContent=`
      .floating-trophy{background:none!important;overflow:visible!important}
      .floating-trophy .oman-landmark-img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center bottom!important;filter:drop-shadow(0 22px 38px rgba(0,0,0,.5)) drop-shadow(0 0 24px rgba(255,194,91,.22));pointer-events:none}
      .mode-card::before{display:none!important}
      .mode-card .oman-card-landmark{position:absolute!important;z-index:2!important;top:-92px!important;right:10px!important;width:300px!important;height:205px!important;object-fit:contain!important;object-position:center bottom!important;filter:drop-shadow(0 20px 26px rgba(0,0,0,.55)) drop-shadow(0 0 12px rgba(232,189,106,.22));pointer-events:none!important}
      .mode-card.display-card .oman-card-landmark{width:225px!important;height:225px!important;top:-110px!important;right:34px!important}
      @media(max-width:760px){
        .mode-card .oman-card-landmark{width:255px!important;height:178px!important;top:-82px!important;right:8px!important}
        .mode-card.display-card .oman-card-landmark{width:182px!important;height:195px!important;top:-98px!important;right:28px!important}
      }
      #homeScreen .floating-trophy{display:block!important;opacity:1!important;visibility:visible!important}
    `;
    document.head.appendChild(s);
  }

  function setPhotoVar(name,url){ root.setProperty(name,`url("${url}")`); }

  function putImg(host,url,cls,alt){
    if(!host) return;
    let img=host.querySelector(`img.${cls}`);
    if(!img){
      img=document.createElement('img');
      img.className=cls;
      host.prepend(img);
    }
    img.src=url;
    img.alt=alt||'';
    img.decoding='async';
    img.loading='eager';
  }

  async function loadOne(path,varName,onReady){
    try{
      const url=await visualAsset(path);
      if(varName) setPhotoVar(varName,url);
      if(onReady) onReady(url);
      return url;
    }catch(err){
      console.error('Omani asset failed',path,err);
      return null;
    }
  }

  async function applyVisualAssets(){
    injectStyles();
    document.documentElement.dataset.omanAssets='loading';

    const sahwa=await loadOne('/assets/sahwa-hero.webp','--oman-sahwa-photo',url=>{
      qa('.floating-trophy').forEach(el=>{
        el.innerHTML='';
        putImg(el,url,'oman-landmark-img','برج الصحوة');
        el.setAttribute('aria-label','برج الصحوة');
      });
      let favicon=q('link[rel="icon"]');
      if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon)}
      favicon.href=url; favicon.type='image/webp';
      let touch=q('link[rel="apple-touch-icon"]');
      if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';document.head.appendChild(touch)}
      touch.href=url; touch.sizes='512x512';
    });

    const municipality=await loadOne('/assets/municipality-card.webp','--oman-municipality-photo',url=>putImg(q('.mode-card.host-card'),url,'oman-card-landmark','مبنى بلدية مسقط'));
    const opera=await loadOne('/assets/opera-card.webp','--oman-opera-photo',url=>putImg(q('.mode-card.player-card'),url,'oman-card-landmark','دار الأوبرا السلطانية'));
    const riyam=await loadOne('/assets/riyam-card.webp','--oman-riyam-photo',url=>putImg(q('.mode-card.display-card'),url,'oman-card-landmark','مبخرة ريام'));
    const heritage=await loadOne('/oman-heritage-bg.b64','--oman-home-bg');

    document.documentElement.dataset.omanAssets=(sahwa && (municipality||opera||riyam||heritage))?'ready':'partial';
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
  document.body.classList.remove('oman-v20','oman-v21','oman-v22');
  document.body.classList.add('premium-oman-final','oman-v23');
  const top=q('.top-actions'); if(top&&!q('#musicBtn')){const b=document.createElement('button');b.id='musicBtn';b.className='icon-btn';b.title='الموسيقى العُمانية';b.textContent='🎵';top.prepend(b)}
  applyVisualAssets();
})();
