(() => {
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const V='26';
  const PARTS=[1,2,3,4,5].map(n=>`/assets/v25/landmarks.${String(n).padStart(2,'0')}.b64?v=${V}`);

  function injectStyles(){
    let s=q('#oman-v26-sprite-style');
    if(!s){s=document.createElement('style');s.id='oman-v26-sprite-style';document.head.appendChild(s)}
    s.textContent=`
      #homeScreen .floating-trophy{display:block!important;opacity:1!important;visibility:visible!important;background:none!important;overflow:hidden!important;width:min(390px,92vw)!important;height:min(260px,61vw)!important;top:18px!important}
      .oman-landmark-sprite{display:block!important;position:relative!important;overflow:hidden!important;pointer-events:none!important;background:none!important}
      .oman-landmark-sprite>img{position:absolute!important;width:200%!important;height:200%!important;max-width:none!important;object-fit:fill!important;filter:drop-shadow(0 18px 28px rgba(0,0,0,.48)) drop-shadow(0 0 18px rgba(245,190,90,.22))}
      .oman-landmark-sprite.sahwa>img{left:0!important;top:0!important}
      .oman-landmark-sprite.municipality>img{left:-100%!important;top:0!important}
      .oman-landmark-sprite.opera>img{left:0!important;top:-100%!important}
      .oman-landmark-sprite.riyam>img{left:-100%!important;top:-100%!important}
      .floating-trophy .oman-landmark-sprite{width:100%!important;height:100%!important}
      .mode-card{overflow:visible!important;position:relative!important}
      .mode-card::before{display:none!important}
      .mode-card .oman-card-landmark{position:absolute!important;z-index:2!important;top:-78px!important;right:14px!important;width:260px!important;height:174px!important}
      .mode-card.display-card .oman-card-landmark{width:220px!important;height:147px!important;top:-72px!important;right:28px!important}
      @media(max-width:760px){
        #homeScreen .floating-trophy{width:min(345px,90vw)!important;height:min(230px,60vw)!important;top:18px!important}
        .mode-card .oman-card-landmark{width:245px!important;height:164px!important;top:-74px!important;right:8px!important}
        .mode-card.display-card .oman-card-landmark{width:205px!important;height:137px!important;top:-68px!important;right:24px!important}
      }
    `;
  }

  function putSprite(host,type,cls,label,sheetUrl){
    if(!host) return;
    host.querySelectorAll('.oman-landmark-img,.oman-landmark-sprite,.oman-card-landmark').forEach(n=>n.remove());
    const el=document.createElement('span');
    el.className=`oman-landmark-sprite ${type} ${cls||''}`.trim();
    el.setAttribute('role','img');
    el.setAttribute('aria-label',label||'');
    const img=document.createElement('img');
    img.src=sheetUrl;
    img.alt='';
    img.decoding='sync';
    img.draggable=false;
    el.appendChild(img);
    host.prepend(el);
  }

  async function getSheetBlobUrl(){
    const parts=await Promise.all(PARTS.map(async path=>{
      const r=await fetch(path,{cache:'no-store'});
      if(!r.ok) throw new Error(`${path} ${r.status}`);
      return (await r.text()).replace(/\s+/g,'');
    }));
    const raw=parts.join('');
    if(!raw.startsWith('/9j/') || !raw.endsWith('/2Q==')) throw new Error('invalid JPEG base64');
    const bin=atob(raw);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));
    await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{if(img.naturalWidth<400||img.naturalHeight<250)reject(new Error('bad landmark sheet size'));else resolve()};img.onerror=()=>reject(new Error('JPEG blob decode failed'));img.src=url});
    return url;
  }

  async function applyVisualAssets(){
    document.documentElement.dataset.omanAssets='loading';
    try{
      const sheet=await getSheetBlobUrl();
      injectStyles();
      qa('.floating-trophy').forEach(el=>{el.innerHTML='';putSprite(el,'sahwa','','برج الصحوة',sheet)});
      putSprite(q('.mode-card.host-card'),'municipality','oman-card-landmark','مبنى بلدية مسقط',sheet);
      putSprite(q('.mode-card.player-card'),'opera','oman-card-landmark','دار الأوبرا السلطانية',sheet);
      putSprite(q('.mode-card.display-card'),'riyam','oman-card-landmark','مبخرة ريام',sheet);
      document.documentElement.dataset.omanAssets='ready';
    }catch(err){
      console.error('Omani v26 assets failed',err);
      document.documentElement.dataset.omanAssets='error';
    }
  }

  document.title='أنا عُماني';
  const desc=q('meta[name="description"]'); if(desc) desc.content='أنا عُماني | I Am Omani — ألعاب ومسابقات جماعية حية بهوية عُمانية';
  let apple=q('meta[name="apple-mobile-web-app-title"]'); if(!apple){apple=document.createElement('meta');apple.name='apple-mobile-web-app-title';document.head.appendChild(apple)} apple.content='أنا عُماني';
  const manifest=q('link[rel="manifest"]'); if(manifest) manifest.href=`/manifest.json?v=${V}`;
  let css=q('link[data-oman-home-final]'); if(!css){css=document.createElement('link');css.rel='stylesheet';css.dataset.omanHomeFinal='1';document.head.appendChild(css)} css.href=`/oman-home-v2.css?v=${V}`;
  const brand=q('.brand span:last-child'); if(brand) brand.innerHTML='<b>I AM OMANI</b><small>أنا عُماني</small>';
  const hero=q('#homeScreen .hero h1'); if(hero) hero.innerHTML='<span>أنا عُماني</span>';
  const eyebrow=q('#homeScreen .eyebrow'); if(eyebrow) eyebrow.textContent='I AM OMANI • LIVE GAMES';
  const heroP=q('#homeScreen .hero p'); if(heroP) heroP.textContent='العب، نافس، واكتشف عُمان… في ساحات الولايات ومجالس القرى.';
  document.body.classList.remove('oman-v20','oman-v21','oman-v22','oman-v23','oman-v24','oman-v25'); document.body.classList.add('premium-oman-final','oman-v26');
  const top=q('.top-actions'); if(top&&!q('#musicBtn')){const b=document.createElement('button');b.id='musicBtn';b.className='icon-btn';b.title='الموسيقى العُمانية';b.textContent='🎵';top.prepend(b)}
  applyVisualAssets();
})();
