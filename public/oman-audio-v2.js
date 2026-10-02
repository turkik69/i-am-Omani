(() => {
  const STORAGE='iamOmaniTrackMusic';
  let enabled=localStorage.getItem(STORAGE)!=='off';
  let audio=null;
  const normalVolume=.16;
  const questionVolume=.055;
  const q=s=>document.querySelector(s);
  const isQuestion=()=>q('.screen.active')?.id==='questionScreen';
  const setButton=()=>{const b=q('#musicBtn');if(!b)return;b.textContent=enabled?'🎵':'🔇';b.classList.toggle('music-on',enabled);b.title=enabled?'إيقاف الموسيقى العُمانية':'تشغيل الموسيقى العُمانية'};
  function ensureAudio(){
    if(audio)return audio;
    audio=new Audio('/omani-traditional-loop.mp3?v=35');
    audio.loop=true;
    audio.preload='auto';
    audio.playsInline=true;
    audio.volume=isQuestion()?questionVolume:normalVolume;
    audio.addEventListener('error',()=>console.warn('Omani traditional music failed to load'));
    return audio;
  }
  async function play(){if(!enabled)return;try{const a=ensureAudio();a.volume=isQuestion()?questionVolume:normalVolume;await a.play()}catch(e){console.warn('Omani background music waits for a user gesture:',e?.message||e)}}
  function pause(){audio?.pause()}
  function applyVolume(){if(audio)audio.volume=isQuestion()?questionVolume:normalVolume}
  document.addEventListener('pointerdown',()=>play(),{once:true,passive:true});
  document.addEventListener('touchstart',()=>play(),{once:true,passive:true});
  document.addEventListener('touchend',()=>play(),{once:true,passive:true});
  document.addEventListener('click',()=>play(),{once:true,passive:true});
  document.addEventListener('keydown',()=>play(),{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(enabled)play()});
  document.addEventListener('click',e=>{const b=e.target.closest?.('#musicBtn');if(!b)return;e.preventDefault();e.stopPropagation();enabled=!enabled;localStorage.setItem(STORAGE,enabled?'on':'off');setButton();if(enabled)play();else pause()},true);
  const obs=new MutationObserver(applyVolume);document.querySelectorAll('.screen').forEach(s=>obs.observe(s,{attributes:true,attributeFilter:['class']}));
  window.IAM_OMANI_MUSIC={play,pause,isEnabled:()=>enabled};
  setButton();
})();
