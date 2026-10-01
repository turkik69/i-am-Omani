(() => {
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const V='24';
  const SHEET=`/assets/omani-landmarks-sheet.webp?v=${V}`;

  function injectStyles(){
    if(q('#oman-v24-sprite-style')) return;
    const s=document.createElement('style');
    s.id='oman-v24-sprite-style';
    s.textContent=`
      .floating-trophy{background:none!important;overflow:visible!important}
      .oman-landmark-sprite{display:block!important;background-image:url('${SHEET}')!important;background-repeat:no-repeat!important;background-size:200% 200%!important;pointer-events:none!important;filter:drop-shadow(0 20px 30px rgba(0,0,0,.48)) drop-shadow(0 0 18px rgba(245,190,90,.20))}
      .oman-landmark-sprite.sahwa{background-position:0% 0%!important}
      .oman-landmark-sprite.municipality{background-position:100% 0%!important}
      .oman-landmark-sprite.opera{background-position:0% 100%!important}
      .oman-landmark-sprite.riyam{background-position:100% 100%!important}
      .floating-trophy .oman-landmark-sprite{width:100%!important;height:100%!important}
      #homeScreen .floating-trophy{display:block!important;opacity:1!important;visibility:visible!important}
      .mode-card{overflow:visible!important;position:relative!important}
      .mode-card::before{display:none!important}
      .mode-card .oman-card-landmark{position:absolute!important;z-index:2!important;top:-88px!important;right:10px!important;width:285px!important;height:190px!important}
      .mode-card.display-card .oman-card-landmark{width:210px!important;height:205px!important;top:-100px!important;right:30px!important}
      @media(max-width:760px){
        .mode-card .oman-card-landmark{width:245px!important;height:165px!important;top:-76px!important;right:8px!important}
        .mode-card.display-card .oman-card-landmark{width:178px!important;height:185px!important;top:-90px!important;right:26px!important}
      }
    `;
    document.head.appendChild(s);
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

  function applyVisualAssets(){
    injectStyles();
    qa('.floating-trophy').forEach(el=>{
      el.innerHTML='';
      putSprite(el,'sahwa','','برج الصحوة');
    });
    putSprite(q('.mode-card.host-card'),'municipality','oman-card-landmark','مبنى بلدية مسقط');
    putSprite(q('.mode-card.player-card'),'opera','oman-card-landmark','دار الأوبرا السلطانية');
    putSprite(q('.mode-card.display-card'),'riyam','oman-card-landmark','مبخرة ريام');
    document.documentElement.dataset.omanAssets='ready';
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
  document.body.classList.remove('oman-v20','oman-v21','oman-v22','oman-v23');
  document.body.classList.add('premium-oman-final','oman-v24');
  const top=q('.top-actions'); if(top&&!q('#musicBtn')){const b=document.createElement('button');b.id='musicBtn';b.className='icon-btn';b.title='الموسيقى العُمانية';b.textContent='🎵';top.prepend(b)}

  applyVisualAssets();
})();
