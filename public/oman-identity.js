(() => {
  const V='27';
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const PARTS=[1,2,3,4,5].map(n=>`/assets/v25/landmarks.${String(n).padStart(2,'0')}.b64?v=${V}`);
  let sheetUrl='';

  const pos={sahwa:['0','0'],municipality:['-100%','0'],opera:['0','-100%'],riyam:['-100%','-100%']};

  const icons={
    host:`<svg viewBox="0 0 48 48" fill="none"><path d="M9 37V18l15-8 15 8v19" stroke="white" stroke-width="2.8"/><path d="M16 37V25h16v12M20 18h8" stroke="#ffd879" stroke-width="2.8"/><path d="M6 37h36" stroke="#54e6ff" stroke-width="2.8"/></svg>`,
    join:`<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="20" r="7" stroke="white" stroke-width="2.8"/><path d="M10 39c2-8 7-12 14-12s12 4 14 12" stroke="#54e6ff" stroke-width="2.8"/><path d="M38 9v11M33 14h10" stroke="#ffd879" stroke-width="2.8"/></svg>`,
    display:`<svg viewBox="0 0 48 48" fill="none"><rect x="7" y="9" width="34" height="25" rx="4" stroke="white" stroke-width="2.8"/><path d="M17 40h14M24 34v6" stroke="#54e6ff" stroke-width="2.8"/><path d="m18 17 12 5-12 5V17Z" fill="#ff56cf"/></svg>`,
    music:`<svg viewBox="0 0 40 40" fill="none"><path d="M15 28V11l16-3v17" stroke="white" stroke-width="2.4"/><circle cx="11" cy="29" r="5" fill="#8e55ff"/><circle cx="27" cy="26" r="5" fill="#ff59c8"/></svg>`,
    sound:`<svg viewBox="0 0 40 40" fill="none"><path d="M9 23h6l8 6V11l-8 6H9v6Z" stroke="white" stroke-width="2.4"/><path d="M28 15c4 3 4 7 0 10M31 11c7 5 7 13 0 18" stroke="#50e4ff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    install:`<svg viewBox="0 0 40 40" fill="none"><path d="M20 7v18m0 0-7-7m7 7 7-7" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 30h22" stroke="#ffd879" stroke-width="2.6" stroke-linecap="round"/></svg>`
  };

  function avatarSvg(kind){
    if(kind==='woman') return `<svg viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#1ee6ff"/><stop offset="1" stop-color="#ff4cc8"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="#111957" stroke="url(#g)" stroke-width="4"/><path d="M22 78c3-22 13-37 28-37s25 15 28 37" fill="#8c164f"/><circle cx="50" cy="40" r="18" fill="#e7b18e"/><path d="M30 41c0-21 10-31 20-31 13 0 23 12 23 32-7-8-15-12-24-12-7 0-13 3-19 11Z" fill="#a41d58"/><path d="M31 36c6-9 12-13 20-13 8 0 15 4 22 13" fill="none" stroke="#ffd25f" stroke-width="3"/><circle cx="44" cy="40" r="2"/><circle cx="56" cy="40" r="2"/><path d="M44 49c4 3 8 3 12 0" fill="none" stroke="#8a443b" stroke-width="2"/></svg>`;
    return `<svg viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#1ee6ff"/><stop offset="1" stop-color="#ff4cc8"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="#111957" stroke="url(#g)" stroke-width="4"/><path d="M25 83c3-22 12-35 25-35s22 13 25 35" fill="#f7f2e8"/><circle cx="50" cy="41" r="18" fill="#d89b72"/><path d="M33 47c3 13 10 18 17 18 8 0 15-6 18-18-5 5-11 7-18 7-6 0-12-2-17-7Z" fill="#3b241f"/><path d="M27 27c7-14 38-17 47 0-8-2-15-4-23-4-9 0-16 2-24 4Z" fill="#efe3c8" stroke="#c9355b" stroke-width="3"/><path d="M30 24c11-6 27-7 41 0" stroke="#3aa0b8" stroke-width="3" fill="none"/><circle cx="44" cy="40" r="2"/><circle cx="56" cy="40" r="2"/></svg>`;
  }

  const avatarTypes={
    '🦁':['man',null],
    '🦅':['woman',null],
    '🐪':['landmark','sahwa'],
    '🐬':['landmark','riyam'],
    '⛰️':['landmark','opera'],
    '🏰':['landmark','municipality'],
    '🗡️':['landmark','sahwa'],
    '⛵':['landmark','riyam']
  };

  async function buildSheet(){
    const parts=await Promise.all(PARTS.map(async path=>{
      const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error(path);
      return (await r.text()).replace(/\s+/g,'');
    }));
    const raw=parts.join('');
    const bin=atob(raw), bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));
    await new Promise((ok,bad)=>{const im=new Image();im.onload=()=>im.naturalWidth>=400?ok():bad();im.onerror=bad;im.src=url});
    sheetUrl=url; return url;
  }

  function crop(type, cls=''){
    const box=document.createElement('span'); box.className=`v27-crop ${type} ${cls}`.trim();
    const im=document.createElement('img'); im.src=sheetUrl; im.alt=''; im.draggable=false; im.decoding='sync';
    const [x,y]=pos[type]; Object.assign(im.style,{left:x,top:y}); box.appendChild(im); return box;
  }

  function addScene(screen,type,cls,style){
    const host=q(screen); if(!host||host.querySelector(`.v27-scene.${cls}`)) return;
    const box=crop(type,`v27-scene ${cls}`); Object.assign(box.style,style); host.prepend(box);
  }
  function trail(host,cls){if(!host||host.querySelector(`.v27-trail.${cls}`))return;const i=document.createElement('i');i.className=`v27-trail ${cls}`;host.prepend(i)}

  function hydrateScenes(){
    addScene('#homeScreen','municipality','home-municipality',{width:'112%',height:'52%',left:'-6%',bottom:'-7%',opacity:'.46'});
    addScene('#homeScreen','riyam','home-riyam',{width:'34%',height:'30%',right:'-8%',top:'12%',opacity:'.3'}); trail(q('#homeScreen'),'t1');trail(q('#homeScreen'),'t2');
    addScene('#hostCreateScreen','municipality','create-municipality',{width:'118%',height:'64%',left:'-10%',bottom:'-8%',opacity:'.75'});
    addScene('#hostCreateScreen','sahwa','create-sahwa',{width:'34%',height:'33%',left:'33%',top:'-2%',opacity:'.96'});
    addScene('#hostCreateScreen','riyam','create-riyam',{width:'26%',height:'26%',right:'-5%',top:'3%',opacity:'.7'});trail(q('#hostCreateScreen'),'t1');trail(q('#hostCreateScreen'),'t2');
    addScene('#joinScreen','opera','join-opera',{width:'84%',height:'63%',left:'-13%',bottom:'-5%',opacity:'.95'});
    addScene('#joinScreen','sahwa','join-sahwa',{width:'31%',height:'31%',left:'31%',top:'-2%',opacity:'.96'});
    addScene('#joinScreen','riyam','join-riyam',{width:'28%',height:'28%',right:'-4%',top:'1%',opacity:'.82'});trail(q('#joinScreen'),'t1');trail(q('#joinScreen'),'t2');
    addScene('#displayJoinScreen','riyam','displayjoin-riyam',{width:'56%',height:'54%',left:'-10%',bottom:'0',opacity:'.88'});
    addScene('#displayJoinScreen','sahwa','displayjoin-sahwa',{width:'31%',height:'31%',right:'3%',top:'3%',opacity:'.9'});trail(q('#displayJoinScreen'),'t1');
    addScene('#hostLobbyScreen','municipality','lobby-municipality',{width:'92%',height:'56%',left:'4%',bottom:'-16%',opacity:'.34'});
    addScene('#hostLobbyScreen','sahwa','lobby-sahwa',{width:'22%',height:'24%',right:'2%',top:'2%',opacity:'.62'});
    addScene('#playerLobbyScreen','opera','player-opera',{width:'95%',height:'58%',left:'-10%',bottom:'-15%',opacity:'.48'});
    addScene('#playerLobbyScreen','riyam','player-riyam',{width:'38%',height:'34%',right:'-7%',top:'2%',opacity:'.48'});
    addScene('#questionScreen','riyam','question-riyam',{width:'48%',height:'54%',left:'-14%',bottom:'1%',opacity:'.9'});
    addScene('#questionScreen','opera','question-opera',{width:'62%',height:'51%',left:'27%',bottom:'-15%',opacity:'.69'});
    addScene('#questionScreen','sahwa','question-sahwa',{width:'20%',height:'22%',right:'-2%',top:'2%',opacity:'.8'});trail(q('#questionScreen'),'t1');trail(q('#questionScreen'),'t2');
    addScene('#resultScreen','municipality','result-municipality',{width:'62%',height:'48%',left:'-8%',bottom:'-12%',opacity:'.59'});
    addScene('#resultScreen','opera','result-opera',{width:'58%',height:'46%',right:'-10%',bottom:'-14%',opacity:'.55'});
    addScene('#resultScreen','sahwa','result-sahwa',{width:'22%',height:'24%',left:'39%',top:'0',opacity:'.75'});trail(q('#resultScreen'),'t1');
    addScene('#finalScreen','municipality','final-municipality',{width:'62%',height:'48%',left:'-7%',bottom:'-10%',opacity:'.66'});
    addScene('#finalScreen','opera','final-opera',{width:'61%',height:'48%',right:'-10%',bottom:'-11%',opacity:'.62'});
    addScene('#finalScreen','sahwa','final-sahwa',{width:'25%',height:'28%',left:'38%',top:'-1%',opacity:'.96'});
    addScene('#finalScreen','riyam','final-riyam',{width:'24%',height:'26%',right:'-5%',top:'10%',opacity:'.55'});trail(q('#finalScreen'),'t1');trail(q('#finalScreen'),'t2');
    addScene('#displayScreen','riyam','display-riyam',{width:'46%',height:'52%',left:'-11%',bottom:'2%',opacity:'.84'});
    addScene('#displayScreen','opera','display-opera',{width:'64%',height:'52%',left:'26%',bottom:'-13%',opacity:'.64'});
    addScene('#displayScreen','sahwa','display-sahwa',{width:'20%',height:'22%',right:'0',top:'1%',opacity:'.78'});trail(q('#displayScreen'),'t1');trail(q('#displayScreen'),'t2');
  }

  function hydrateTower(){qa('.floating-trophy').forEach(el=>{if(el.querySelector('.v27-crop.sahwa'))return;el.textContent='';const c=crop('sahwa');c.style.width='100%';c.style.height='100%';el.appendChild(c)})}

  function landmarkAvatar(type){const c=crop(type,'v27-avatar-art');c.style.width='100%';c.style.height='100%';return c.outerHTML}
  function avatarMarkup(token){const [kind,type]=avatarTypes[token]||['man'];return kind==='landmark'?landmarkAvatar(type):`<span class="v27-svg-avatar">${avatarSvg(kind)}</span>`}

  function setupAvatars(){const buttons=qa('#avatars .avatar'),tokens=['🦁','🦅','🐪','🐬','⛰️','🏰','🗡️','⛵'];buttons.forEach((b,i)=>{const t=tokens[i];b.innerHTML=`${avatarMarkup(t)}<span class="avatar-token">${t}</span>`})}
  function hydrateAvatarOutputs(root=document){const sels=['.player-chip span:first-child','.avatar-mini','.board-row > span:nth-child(2)','.winner > span','#myAvatar'];sels.forEach(sel=>root.querySelectorAll?.(sel).forEach(el=>{if(el.dataset.v27Avatar)return;const t=el.textContent.trim();if(!avatarTypes[t])return;el.dataset.v27Avatar='1';el.innerHTML=avatarMarkup(t)}))}

  function khanjar(color='#ffca64'){return `<svg viewBox="0 0 64 64"><path d="M26 8c3 1 9 1 12 0l-1 9c5 5 7 12 4 18-3 7-8 13-15 20-3 3-6 3-9 0 8-6 13-12 15-19 2-7 0-13-5-18L26 8Z" fill="none" stroke="${color}" stroke-width="3"/><path d="M21 17h22M24 22h16" stroke="${color}" stroke-width="3" stroke-linecap="round"/><path d="M36 35c-4 3-8 5-13 6" stroke="${color}" stroke-width="3" stroke-linecap="round"/></svg>`}
  function hydrateMedals(){qa('.podium-row .medal').forEach((el,i)=>{if(el.dataset.v27)return;el.dataset.v27='1';el.innerHTML=khanjar(['#ffd15b','#dce5f6','#d8894c'][i]||'#ffd15b')});qa('.winner > div:first-child').forEach((el,i)=>{if(el.dataset.v27)return;el.dataset.v27='1';el.innerHTML=khanjar(['#ffd15b','#dce5f6','#d8894c'][i]||'#ffd15b')})}

  function setupIcons(){const cards=qa('#homeScreen .mode-card .mode-icon');if(cards[0])cards[0].innerHTML=icons.host;if(cards[1])cards[1].innerHTML=icons.join;if(cards[2])cards[2].innerHTML=icons.display;const m=q('#musicBtn');if(m)m.innerHTML=icons.music;const s=q('#soundBtn');if(s)s.innerHTML=icons.sound;const i=q('#installBtn');if(i)i.innerHTML=icons.install;qa('.panel-icon').forEach((el,idx)=>{el.innerHTML=idx===0?icons.host:idx===1?icons.join:icons.display;el.style.width='68px';el.style.margin='0 auto 8px'});const stats=qa('#homeScreen .hero-stats > div');if(stats[0])stats[0].innerHTML=`<b>${khanjar('#ffd26a')}</b><span>عُماني</span>`}

  function applyCopy(){document.title='أنا عُماني | I Am Omani';const d=q('meta[name="description"]');if(d)d.content='أنا عُماني — مسابقات حية عن عُمان بهوية عُمانية فاخرة، تحديات جماعية وترتيب لحظي.';const b=q('.brand span:last-child');if(b)b.innerHTML='<b>I AM OMANI</b><small>أنا عُماني</small>';const h=q('#homeScreen .hero h1');if(h)h.innerHTML='<span>أنا عُماني</span>';const e=q('#homeScreen .eyebrow');if(e)e.textContent='I AM OMANI • QUIZ ARENA';const p=q('#homeScreen .hero p');if(p)p.textContent='اعرف عُمان… وتحدَّ غيرك في مسابقات حية من ساحات الولايات ومجالس القرى.';const f=q('#finalScreen .final-title h1');if(f)f.textContent='أبطال أنا عُماني'}

  function ensureCss(){let l=q('link[data-v27-theme]');if(!l){l=document.createElement('link');l.rel='stylesheet';l.dataset.v27Theme='1';document.head.appendChild(l)}l.href=`/oman-v27.css?v=${V}`;const man=q('link[rel="manifest"]');if(man)man.href=`/manifest.json?v=${V}`}

  async function init(){
    ensureCss();
    document.body.classList.remove('oman-v20','oman-v21','oman-v22','oman-v23','oman-v24','oman-v25','oman-v26');document.body.classList.add('oman-v27','premium-oman-final');
    applyCopy();setupIcons();
    try{await buildSheet();setupAvatars();hydrateScenes();hydrateTower();hydrateAvatarOutputs();hydrateMedals();document.documentElement.dataset.omanAssets='ready-v27'}catch(err){console.error('V27 assets',err);document.documentElement.dataset.omanAssets='error-v27'}
  }

  init();
  let raf=0;new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(!sheetUrl)return;hydrateTower();hydrateAvatarOutputs();hydrateMedals()})}).observe(document.body,{subtree:true,childList:true,characterData:true});
})();