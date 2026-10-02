(() => {
  const STORAGE='iamOmaniTrackMusic';
  let enabled=localStorage.getItem(STORAGE)!=='off';
  let audio=null, objectUrl=null, loading=null;
  const normalVolume=.075;
  const questionVolume=.026;
  const q=s=>document.querySelector(s);
  const isQuestion=()=>q('.screen.active')?.id==='questionScreen';
  const setButton=()=>{const b=q('#musicBtn');if(!b)return;b.textContent=enabled?'🎵':'🔇';b.classList.toggle('music-on',enabled);b.title=enabled?'إيقاف الموسيقى العُمانية':'تشغيل الموسيقى العُمانية'};

  async function source(){
    if(window.OMAN_MUSIC_SRC)return window.OMAN_MUSIC_SRC;
    const r=await fetch('/omani-bg10.b64?v=33',{cache:'no-store'});
    if(!r.ok)throw new Error('audio source unavailable');
    const b64=(await r.text()).replace(/\s+/g,'');
    const bin=atob(b64),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    objectUrl=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));
    return objectUrl;
  }
  async function load(){
    if(audio)return audio;if(loading)return loading;
    loading=(async()=>{const src=await source();audio=new Audio(src);audio.loop=true;audio.preload='auto';audio.playsInline=true;audio.volume=isQuestion()?questionVolume:normalVolume;audio.addEventListener('error',()=>console.warn('Omani background music failed to load'));return audio})();
    return loading;
  }
  async function play(){if(!enabled)return;try{const a=await load();a.volume=isQuestion()?questionVolume:normalVolume;await a.play()}catch(e){console.warn('Omani background music waits for a user gesture:',e?.message||e)}}
  function pause(){audio?.pause()}
  function applyVolume(){if(audio)audio.volume=isQuestion()?questionVolume:normalVolume}
  document.addEventListener('pointerdown',()=>play(),{once:true,passive:true});
  document.addEventListener('touchend',()=>play(),{once:true,passive:true});
  document.addEventListener('keydown',()=>play(),{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(enabled)play()});
  document.addEventListener('click',e=>{const b=e.target.closest?.('#musicBtn');if(!b)return;e.preventDefault();e.stopPropagation();enabled=!enabled;localStorage.setItem(STORAGE,enabled?'on':'off');setButton();if(enabled)play();else pause()},true);
  const obs=new MutationObserver(applyVolume);document.querySelectorAll('.screen').forEach(s=>obs.observe(s,{attributes:true,attributeFilter:['class']}));
  window.IAM_OMANI_MUSIC={play,pause,isEnabled:()=>enabled};
  setButton();
})();
