(() => {
  const STORAGE='iamOmaniTrackMusic';
  let enabled=localStorage.getItem(STORAGE)!=='off';
  let audio=null, objectUrl=null, loading=null;
  const normalVolume=.065;
  const questionVolume=.022;

  const q=s=>document.querySelector(s);
  const isQuestion=()=>q('.screen.active')?.id==='questionScreen';
  const setButton=()=>{
    const b=q('#musicBtn'); if(!b)return;
    b.textContent=enabled?'🎵':'🔇';
    b.classList.toggle('music-on',enabled);
    b.title=enabled?'إيقاف الموسيقى العُمانية':'تشغيل الموسيقى العُمانية';
  };

  async function load(){
    if(audio) return audio;
    if(loading) return loading;
    loading=(async()=>{
      const r=await fetch('/omani-bg10.b64?v=1',{cache:'force-cache'});
      if(!r.ok) throw new Error('audio source unavailable');
      const b64=(await r.text()).trim();
      const bin=atob(b64); const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      objectUrl=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));
      audio=new Audio(objectUrl);
      audio.loop=true; audio.preload='auto'; audio.volume=isQuestion()?questionVolume:normalVolume;
      return audio;
    })();
    return loading;
  }

  async function play(){
    if(!enabled)return;
    try{const a=await load(); a.volume=isQuestion()?questionVolume:normalVolume; await a.play();}
    catch(e){console.warn('Omani background music:',e?.message||e);}
  }
  function pause(){audio?.pause();}
  function applyVolume(){if(audio)audio.volume=isQuestion()?questionVolume:normalVolume;}

  document.addEventListener('pointerdown',()=>play(),{once:true,passive:true});
  document.addEventListener('keydown',()=>play(),{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(enabled)play();});

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#musicBtn'); if(!b)return;
    e.preventDefault(); e.stopPropagation();
    enabled=!enabled; localStorage.setItem(STORAGE,enabled?'on':'off');
    setButton(); if(enabled)play(); else pause();
  },true);

  const obs=new MutationObserver(applyVolume);
  document.querySelectorAll('.screen').forEach(s=>obs.observe(s,{attributes:true,attributeFilter:['class']}));
  setButton();
})();
