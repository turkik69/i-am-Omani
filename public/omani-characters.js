(() => {
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  let spriteUrl='';

  async function loadSprite(){
    try{
      const r=await fetch('/omani-characters-ref.b64?v=38',{cache:'no-store'});
      if(!r.ok) throw new Error('character sprite unavailable');
      const raw=(await r.text()).replace(/\s+/g,'');
      const bin=atob(raw), bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      spriteUrl=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
      document.documentElement.style.setProperty('--omani-character-sprite',`url("${spriteUrl}")`);
      document.documentElement.dataset.omaniCharacters='photo';
    }catch(e){
      console.warn('Omani character references:',e?.message||e);
      document.documentElement.dataset.omaniCharacters='error';
    }
  }

  const khanjar=()=>`<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="k1" x1="0" x2="1"><stop stop-color="#fff7e5"/><stop offset=".38" stop-color="#d6b36d"/><stop offset=".72" stop-color="#f2d28b"/><stop offset="1" stop-color="#aa7b35"/></linearGradient></defs><path d="M49 10c6 3 16 3 22 0l-2 19c8 8 12 18 10 30-3 17-15 33-35 50-5 5-12 4-17-1 18-15 29-30 33-43 4-14 0-26-10-35L49 10Z" fill="none" stroke="url(#k1)" stroke-width="5"/><path d="M39 29h42M43 38h34" stroke="url(#k1)" stroke-width="5" stroke-linecap="round"/><path d="M40 67c16 2 29 10 39 24" fill="none" stroke="url(#k1)" stroke-width="4"/></svg>`;

  function make(type){
    const e=document.createElement('span');
    e.className=`omani-character ${type}`;
    if(type==='khanjar') e.innerHTML=khanjar();
    else {
      const photo=document.createElement('span');
      photo.className='omani-character-photo';
      photo.setAttribute('aria-hidden','true');
      e.appendChild(photo);
    }
    return e;
  }
  function add(sel,type){const host=q(sel);if(!host||host.querySelector(`:scope > .omani-character.${type}`))return;host.appendChild(make(type))}

  function decorate(){
    add('#homeScreen','elder');add('#homeScreen','woman');
    add('#hostCreateScreen','young');add('#hostCreateScreen','khanjar');
    add('#joinScreen','woman');
    add('#questionScreen','elder');
    add('#resultScreen','khanjar');
    add('#finalScreen','young');add('#finalScreen','khanjar');
    qa('.baloot-panel').forEach(p=>{
      if(!p.querySelector(':scope > .omani-character.elder'))p.appendChild(make('elder'));
      if(!p.querySelector(':scope > .omani-character.khanjar'))p.appendChild(make('khanjar'));
    });
  }

  function avatars(){
    const btns=qa('#avatars .avatar');if(btns.length<3)return;
    const defs=[['elder','🧔'],['woman','👩'],['young','🧑']];
    defs.forEach(([type,token],i)=>{
      const b=btns[i];if(!b||b.dataset.omanPhoto)return;
      b.dataset.omanPhoto=type;b.dataset.token=token;
      b.innerHTML=`<span class="avatar-photo ${type}" aria-hidden="true"></span><span class="avatar-token">${token}</span>`;
    });
  }

  async function init(){
    await loadSprite();
    decorate();
    new MutationObserver(()=>{decorate();avatars()}).observe(document.body,{subtree:true,childList:true});
  }
  init();
})();
