(() => {
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const khanjar=()=>`<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="k1" x1="0" x2="1"><stop stop-color="#fff7e5"/><stop offset=".38" stop-color="#d6b36d"/><stop offset=".72" stop-color="#f2d28b"/><stop offset="1" stop-color="#aa7b35"/></linearGradient></defs><path d="M49 10c6 3 16 3 22 0l-2 19c8 8 12 18 10 30-3 17-15 33-35 50-5 5-12 4-17-1 18-15 29-30 33-43 4-14 0-26-10-35L49 10Z" fill="none" stroke="url(#k1)" stroke-width="5"/><path d="M39 29h42M43 38h34" stroke="url(#k1)" stroke-width="5" stroke-linecap="round"/><path d="M40 67c16 2 29 10 39 24" fill="none" stroke="url(#k1)" stroke-width="4"/></svg>`;
  const photoMap={elder:'styled-seated-man',young:'styled-khanjar-man',boy:'styled-boy-younger',boyOlder:'styled-boy-older',majlis:'styled-seated-man',bisht:'styled-khanjar-man',khanjarMan:'styled-khanjar-man'};
  function photo(type){const e=document.createElement('span');e.className=`omani-character ${type}`;const im=document.createElement('img');im.src=`/characters/${photoMap[type]||photoMap.young}.png?v=46`;im.alt='شخصية عُمانية';im.loading='lazy';im.decoding='async';e.appendChild(im);return e}
  function addPhoto(sel,type){const host=q(sel);if(!host||host.querySelector(`:scope > .omani-character.${type}`))return;host.appendChild(photo(type))}
  function addKhanjar(sel){const host=q(sel);if(!host||host.querySelector(':scope > .omani-character.khanjar'))return;const e=document.createElement('span');e.className='omani-character khanjar';e.innerHTML=khanjar();host.appendChild(e)}
  function decorate(){
    addPhoto('#homeScreen','bisht');
    addPhoto('#hostCreateScreen','young');addKhanjar('#hostCreateScreen');
    addPhoto('#questionScreen','elder');
    addPhoto('#resultScreen','elder');addKhanjar('#resultScreen');
    addPhoto('#finalScreen','boy');addPhoto('#finalScreen','boyOlder');addKhanjar('#finalScreen');
    qa('.baloot-panel').forEach(p=>{if(!p.querySelector(':scope > .omani-character.majlis'))p.appendChild(photo('majlis'));if(!p.querySelector(':scope > .omani-character.khanjar')){const e=document.createElement('span');e.className='omani-character khanjar';e.innerHTML=khanjar();p.appendChild(e)}});
    qa('.uno-intro').forEach(p=>{if(!p.querySelector(':scope > .omani-character.young'))p.appendChild(photo('young'));});
  }
  document.documentElement.dataset.omaniCharacters='illustrated';decorate();
  new MutationObserver(decorate).observe(document.body,{subtree:true,childList:true});
})();
