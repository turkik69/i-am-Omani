(() => {
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];

  document.documentElement.style.setProperty('--oman-gold', '#f2bd63');
  document.title = 'أنا عُماني';

  const desc = q('meta[name="description"]');
  if (desc) desc.content = 'أنا عُماني | I Am Omani — منصة ألعاب ومسابقات عُمانية حية، من تحديات المعرفة إلى البلوت وبطولات المجالس';

  let apple = q('meta[name="apple-mobile-web-app-title"]');
  if (!apple) {
    apple = document.createElement('meta');
    apple.name = 'apple-mobile-web-app-title';
    document.head.appendChild(apple);
  }
  apple.content = 'أنا عُماني';

  let touch = q('link[rel="apple-touch-icon"]');
  if (!touch) {
    touch = document.createElement('link');
    touch.rel = 'apple-touch-icon';
    document.head.appendChild(touch);
  }
  touch.href = '/icon.svg?v=8';

  const favicon = q('link[rel="icon"]');
  if (favicon) favicon.href = '/icon.svg?v=8';

  // Load the final Omani visual layer after all legacy styles so it always wins.
  if (!q('link[data-oman-home-v2]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/oman-home-v2.css?v=2';
    css.dataset.omanHomeV2 = '1';
    document.head.appendChild(css);
  }

  const brand = q('.brand span:last-child');
  if (brand) brand.innerHTML = '<b>I AM OMANI</b><small>أنا عُماني</small>';

  const heroTitle = q('#homeScreen .hero h1');
  if (heroTitle) heroTitle.innerHTML = '<span>أنا عُماني</span>';

  const eyebrow = q('#homeScreen .eyebrow');
  if (eyebrow) eyebrow.textContent = 'I AM OMANI • LIVE GAMES';

  const heroP = q('#homeScreen .hero p');
  if (heroP) heroP.textContent = 'العب، نافس، واكتشف عُمان… في ساحات الولايات ومجالس القرى.';

  const finalTitle = q('#finalScreen .final-title h1');
  if (finalTitle) finalTitle.textContent = 'أبطال أنا عُماني';

  const displayBrand = q('#displayScreen .display-head b');
  if (displayBrand) displayBrand.textContent = 'أنا عُماني — تحديات وألعاب مباشرة';

  qa('.floating-trophy').forEach(el => {
    el.innerHTML = '';
    el.setAttribute('aria-label', 'برج الصحوة');
  });

  qa('.landmark-art').forEach(el => el.remove());
  document.body.classList.add('premium-oman-v3');

  // The actual playback is handled only by oman-audio-v2.js.
  const topActions = q('.top-actions');
  if (topActions && !q('#musicBtn')) {
    const btn = document.createElement('button');
    btn.id = 'musicBtn';
    btn.className = 'icon-btn';
    btn.title = 'الموسيقى العُمانية';
    btn.textContent = '🎵';
    topActions.prepend(btn);
  }

  // Load the game catalog and Wilayat identity layer.
  if (!q('link[data-game-catalog]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/game-catalog.css?v=1';
    css.dataset.gameCatalog = '1';
    document.head.appendChild(css);
  }
  const loadScript = src => new Promise(resolve => {
    if ([...document.scripts].some(s => s.src.includes(src.split('?')[0]))) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = resolve;
    document.body.appendChild(s);
  });
  (async () => {
    await loadScript('/oman-wilayat-themes.js?v=1');
    await loadScript('/game-catalog.js?v=1');
  })();
})();
