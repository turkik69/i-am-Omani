(() => {
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const V='25';
  const PARTS=[1,2,3,4,5].map(n=>`/assets/v25/landmarks.${String(n).padStart(2,'0')}.b64?v=${V}`);

  function injectStyles(sheet){
    let s=q('#oman-v25-sprite-style');
    if(!s){s=document.createElement('style');s.id='oman-v25-sprite-style';document.head.appendChild(s)}
    s.textContent=`
      #homeScreen .floating-trophy{display:block!important;opacity:1!important;visibility:visible!important;background:none!important;overflow:hidden!important;width:min(390px,92vw)!important;height:min(260px,61vw)!important;top:18px!important}
      .oman-landmark-sprite{display:block!important;background-image:url("${sheet}")!important;background-repeat:no-repeat!important;background-size:200% 200%!important;pointer-events:none!important;filter:drop-shadow(0 18px 28px rgba(0,0,0,.48)) drop-shadow(0 0 18px rgba(245,190,90,.22))}
      .oman-landmark-sprite.sahwa{background-position:0% 0%!important}
      .oman-landmark-sprite.municipality{background-position:100% 0%!important}
      .oman-landmark-sprite.opera{background-position:0% 100%!important}
      .oman-landmark-sprite.riyam{background-position:100% 100%!important}
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

  function putSprite(host,type,cls,label){
    if(!host) return;
    host.querySelectorAll('.oman-landmark-img,.oman-landmark-sprite,.oman-card-landmark').forEach(n=>n.remove());
    const el=document.createElement('span');
    el.className=`oman-landmark-sprite ${type} ${cls||''}`.trim();
    el.setAttribute('role','img');
    el.setAttribute('aria-label',label||'');
    host.prepend(el);
  }

  async function getSheet(){
    const parts=await Promise.all(PARTS.map(async path=>{
      const r=await fetch(path,{cache:'no-store'});
      if(!r.ok) throw new Error(`${path} ${r.status}`);
      return (await r.text()).replace(/\s+/g,'');
    }));
    const raw=parts.join('');
    if(!raw.startsWith('/9j/') || !raw.endsWith('/2Q==')) throw new Error('invalid JPEG base64');
    const url=`data:image/jpeg;base64,${raw}`;
    await new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error('JPEG decode failed'));img.src=url});
    return url;
  }

  async function applyVisualAssets(){
    document.documentElement.dataset.omanAssets='loading';
    try{
      const sheet=await getSheet();
      injectStyles(sheet);
      qa('.floating-trophy').forEach(el=>{el.innerHTML='';putSprite(el,'sahwa','','برج الصحوة')});
      putSprite(q('.mode-card.host-card'),'municipality','oman-card-landmark','مبنى بلدية مسقط');
      putSprite(q('.mode-card.player-card'),'opera','oman-card-landmark','دار الأوبرا السلطانية');
      putSprite(q('.mode-card.display-card'),'riyam','oman-card-landmark','مبخرة ريام');
      document.documentElement.dataset.omanAssets='ready';
    }catch(err){
      console.error('Omani v25 assets failed',err);
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
  document.body.classList.remove('oman-v20','oman-v21','oman-v22','oman-v23','oman-v24');
  document.body.classList.add('premium-oman-final','oman-v25');
  const top=q('.top-actions'); if(top&&!q('#musicBtn')){const b=document.createElement('button');b.id='musicBtn';b.className='icon-btn';b.title='الموسيقى العُمانية';b.textContent='🎵';top.prepend(b)}

  applyVisualAssets();
})();
