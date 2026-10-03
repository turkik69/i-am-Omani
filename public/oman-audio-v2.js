(() => {
  const KEY = 'iamOmaniTrackMusic';
  const button = document.querySelector('#musicBtn');
  const audio = new Audio('/omani-traditional.mp3?v=44');
  audio.loop = true;
  audio.preload = 'metadata';
  let enabled = localStorage.getItem(KEY) !== 'off';
  let active = !document.hidden;
  let playVersion = 0;
  let playPending = false;
  let audioContext = null;
  let musicGain = null;
  const backgroundLevel = () => document.querySelector('.screen.active')?.id === 'questionScreen' ? .003 : .008;

  function connectQuietAudio() {
    if (musicGain) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    try {
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      gain.gain.value = backgroundLevel();
      source.connect(gain);
      gain.connect(context.destination);
      audioContext = context;
      musicGain = gain;
      // iOS ignores media-element volume; the GainNode controls its real output.
      audio.volume = 1;
    } catch (error) {
      context.close().catch(() => {});
      console.warn('Omani music gain:', error);
    }
  }

  function updateVolume() {
    const level = backgroundLevel();
    if (musicGain && audioContext) {
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
    const version = ++playVersion;
    playPending = true;
    // Keep play() in the user gesture for mobile browsers.
    audio.play().then(() => {
      playPending = false;
      if (version !== playVersion || !active || document.hidden || !enabled) audio.pause();
      updateButton();
    }).catch(error => {
      playPending = false;
      if (version !== playVersion || !active) return;
      console.warn('Omani music playback:', error);
      updateButton();
      notify('تعذر تشغيل الموسيقى. اضغط زر ♫ للمحاولة مجددًا.');
    });
  }

  function stop() {
    playVersion++;
    playPending = false;
    audio.pause();
    try { audio.currentTime = 0; } catch { /* Media may not have loaded yet. */ }
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
    updateButton();
  }

  button?.addEventListener('click', event => {
    event.stopPropagation();
    if (enabled && !audio.paused) {
      enabled = false;
      stop();
    } else {
      enabled = true;
      active = true;
      play();
    }
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
    updateButton();
  });
  document.addEventListener('pointerdown', event => {
    if (active && enabled && audio.paused && !event.target.closest?.('#musicBtn')) {
      play();
    }
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { active = false; stop(); }
    else { active = true; updateButton(); }
  });
  window.addEventListener('pagehide', () => { active = false; stop(); });
  window.addEventListener('beforeunload', () => { active = false; stop(); });
  window.addEventListener('pageshow', () => { active = !document.hidden; updateButton(); });
  document.addEventListener('freeze', () => { active = false; stop(); });
  audio.addEventListener('playing', () => {
    if (!active || document.hidden || !enabled) stop();
    else updateButton();
  });
  audio.addEventListener('pause', updateButton);
  new MutationObserver(updateVolume).observe(document.querySelector('main'), {
    subtree: true, attributes: true, attributeFilter: ['class']
  });
  updateVolume();
  updateButton();
  window.OMANI_MUSIC_STATUS = () => ({
    level: musicGain?.gain.value ?? audio.volume,
    routedThroughGain: !!musicGain,
    playing: !audio.paused
  });
})();
