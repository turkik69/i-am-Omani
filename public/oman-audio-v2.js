(() => {
  const KEY = 'iamOmaniTrackMusic';
  const button = document.querySelector('#musicBtn');
  const audio = new Audio('/omani-traditional.mp3?v=75');
  audio.loop = true;
  audio.preload = 'metadata';
  audio.playsInline = true;
  let enabled = localStorage.getItem(KEY) !== 'off';
  let active = !document.hidden;
  let playVersion = 0;
  let playPending = false;
  let audioContext = null;
  let musicGain = null;
  // Keep the soundtrack modest during questions, but a little louder than before.
  const backgroundLevel = () => document.querySelector('.screen.active')?.id === 'questionScreen' ? .0045 : .012;

  function connectQuietAudio() {
    if (musicGain) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    let context;
    try { context = new AudioContextClass({ latencyHint: 'playback' }); }
    catch { context = new AudioContextClass(); }
    try {
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      gain.gain.value = backgroundLevel();
      source.connect(gain);
      gain.connect(context.destination);
      audioContext = context;
      musicGain = gain;
      audio.volume = 1;
    } catch (error) {
      context.close().catch(() => {});
      console.warn('Omani music gain:', error);
    }
  }

  function updateVolume() {
    const level = backgroundLevel();
    if (musicGain && audioContext && audioContext.state !== 'closed') {
      musicGain.gain.setTargetAtTime(level, audioContext.currentTime, .12);
    } else {
      audio.volume = level;
    }
  }
  function updateButton() {
    if (!button) return;
    const playing = !audio.paused;
    button.textContent = playing ? '🎵' : '♫';
    button.classList.toggle('music-on', playing);
    button.title = playing ? 'إيقاف الموسيقى العُمانية' : 'تشغيل الموسيقى العُمانية';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(playing));
    button.dataset.musicLevel = String(musicGain?.gain.value ?? audio.volume);
    button.dataset.gainRouted = String(!!musicGain);
  }
  function notify(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }
  function play() {
    if (!enabled || !active || document.hidden || !audio.paused || playPending) return;
    connectQuietAudio();
    if (audioContext?.state === 'suspended') audioContext.resume().catch(error => console.warn('Omani music resume:', error));
    updateVolume();
    if (!musicGain && audio.volume > backgroundLevel() * 2) {
      notify('تعذر خفض صوت الموسيقى على هذا الجهاز.');
      return;
    }
    const version = ++playVersion;
    playPending = true;
    audio.play().then(() => {
      playPending = false;
      if (version !== playVersion || !active || document.hidden || !enabled) stop(false);
      updateButton();
    }).catch(error => {
      playPending = false;
      if (version !== playVersion || !active) return;
      console.warn('Omani music playback:', error);
      updateButton();
      notify('تعذر تشغيل الموسيقى. اضغط زر ♫ للمحاولة مجددًا.');
    });
  }

  function stop(reset=true) {
    playVersion++;
    playPending = false;
    try { audio.pause(); } catch {}
    if (reset) { try { audio.currentTime = 0; } catch {} }
    if (audioContext?.state === 'running') audioContext.suspend().catch(() => {});
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'none'; } catch {}
    }
    updateButton();
  }
  function hardStop() {
    active = false;
    stop(true);
  }

  button?.addEventListener('click', event => {
    event.stopPropagation();
    if (enabled && !audio.paused) {
      enabled = false;
      stop(true);
    } else {
      enabled = true;
      active = true;
      play();
    }
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
    updateButton();
  });
  document.addEventListener('pointerdown', event => {
    if (active && enabled && audio.paused && !event.target.closest?.('#musicBtn')) play();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hardStop();
    else { active = true; updateButton(); }
  });
  window.addEventListener('pagehide', hardStop, {capture:true});
  window.addEventListener('beforeunload', hardStop, {capture:true});
  window.addEventListener('blur', () => { if (document.hidden) hardStop(); });
  window.addEventListener('pageshow', () => { active = !document.hidden; updateButton(); });
  document.addEventListener('freeze', hardStop);
  audio.addEventListener('playing', () => {
    if (!active || document.hidden || !enabled) hardStop();
    else updateButton();
  });
  audio.addEventListener('pause', updateButton);

  // Observe only screen switches instead of every class mutation in the whole app.
  // This keeps the same behaviour while cutting unnecessary work on phones.
  const volumeObserver = new MutationObserver(updateVolume);
  document.querySelectorAll('.screen').forEach(screen => {
    volumeObserver.observe(screen, { attributes:true, attributeFilter:['class'] });
  });

  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.setActionHandler('stop', hardStop); } catch {}
    try { navigator.mediaSession.setActionHandler('pause', () => stop(false)); } catch {}
  }
  updateVolume();
  updateButton();
  window.OMANI_MUSIC_STOP = hardStop;
  window.OMANI_MUSIC_STATUS = () => ({level:musicGain?.gain.value ?? audio.volume,routedThroughGain:!!musicGain,playing:!audio.paused});
})();
