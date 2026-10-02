(() => {
  const KEY = 'iamOmaniTrackMusic';
  const button = document.querySelector('#musicBtn');
  const audio = new Audio('/omani-traditional.mp3?v=44');
  audio.loop = true;
  audio.preload = 'metadata';
  let enabled = localStorage.getItem(KEY) !== 'off';
  let attempted = false;

  function updateVolume() {
    audio.volume = document.querySelector('.screen.active')?.id === 'questionScreen' ? .06 : .15;
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
    if (!enabled || document.hidden || !audio.paused) return;
    updateVolume();
    // Keep play() in the user gesture for mobile browsers.
    audio.play().then(updateButton).catch(error => {
      console.warn('Omani music playback:', error);
      updateButton();
      notify('تعذر تشغيل الموسيقى. اضغط زر ♫ للمحاولة مجددًا.');
    });
  }

  button?.addEventListener('click', event => {
    event.stopPropagation();
    attempted = true;
    if (!audio.paused) {
      enabled = false;
      audio.pause();
    } else {
      enabled = true;
      play();
    }
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
    updateButton();
  });
  document.addEventListener('pointerdown', event => {
    if (!attempted && enabled && !event.target.closest?.('#musicBtn')) {
      attempted = true;
      play();
    }
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.pause();
    else if (attempted) play();
    updateButton();
  });
  audio.addEventListener('playing', updateButton);
  audio.addEventListener('pause', updateButton);
  new MutationObserver(updateVolume).observe(document.querySelector('main'), {
    subtree: true, attributes: true, attributeFilter: ['class']
  });
  updateVolume();
  updateButton();
})();
