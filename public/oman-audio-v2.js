(() => {
  const STORAGE = 'iamOmaniTrackMusic';
  let enabled = localStorage.getItem(STORAGE) !== 'off';
  const audio = new Audio('/omani-traditional.mp3?v=40');
  audio.loop = true;
  audio.preload = 'auto';
  let context, gain;
  const button = document.querySelector('#musicBtn');
  const isQuestion = () => document.querySelector('.screen.active')?.id === 'questionScreen';

  function volume() {
    const level = isQuestion() ? .06 : .15;
    if (gain) gain.gain.value = level;
    else audio.volume = level;
  }
  function prepareSound() {
    if (!context && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
        gain = context.createGain();
        context.createMediaElementSource(audio).connect(gain).connect(context.destination);
        audio.volume = 1;
      } catch (error) {
        console.warn('Omani music audio setup:', error);
        context = null;
        gain = null;
      }
    }
    volume();
    if (context?.state === 'suspended') context.resume().catch(() => {});
  }
  function updateButton() {
    if (!button) return;
    button.textContent = enabled && !audio.paused ? '🎵' : '🔇';
    button.classList.toggle('music-on', enabled && !audio.paused);
    button.title = enabled && !audio.paused ? 'إيقاف الموسيقى العُمانية' : 'تشغيل الموسيقى العُمانية';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(enabled && !audio.paused));
  }
  function play() {
    if (!enabled || document.hidden) return;
    prepareSound();
    audio.play().then(updateButton).catch(error => {
      updateButton();
      console.warn('Omani background music:', error?.message || error);
    });
  }

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest?.('#musicBtn')) play();
  }, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.target !== button) play();
  });
  button?.addEventListener('click', event => {
    event.stopPropagation();
    if (enabled && !audio.paused) {
      enabled = false;
      audio.pause();
    } else {
      enabled = true;
      play();
    }
    localStorage.setItem(STORAGE, enabled ? 'on' : 'off');
    updateButton();
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.pause();
    else play();
    updateButton();
  });
  new MutationObserver(volume).observe(document.querySelector('main'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  audio.addEventListener('playing', updateButton);
  audio.addEventListener('pause', updateButton);
  updateButton();
})();
