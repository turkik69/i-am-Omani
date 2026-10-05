(() => {
  const q = selector => document.querySelector(selector);
  const qa = selector => [...document.querySelectorAll(selector)];
  const art = window.OMANI_HERITAGE_ART || {};

  function figure(type) {
    const element = document.createElement('span');
    element.className = `omani-character heritage-figure ${type}`;
    element.setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.src = art[type];
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    element.appendChild(image);
    return element;
  }

  function add(selector, type) {
    const host = q(selector);
    if (!host || !art[type] || host.querySelector(`:scope > .omani-character.${type}`)) return;
    host.appendChild(figure(type));
  }

  function decorateStatic() {
    add('#homeScreen', 'mussar-khanjar');
    add('#hostCreateScreen', 'palm-weaver');
    add('#joinScreen', 'traditional-woman');
    add('#displayJoinScreen', 'palm-weaver');
    add('#hostLobbyScreen', 'mussar-khanjar');
    add('#playerLobbyScreen', 'traditional-woman');
    add('#questionScreen', 'mussar-khanjar');
    add('#resultScreen', 'traditional-woman');
    add('#finalScreen', 'mussar-khanjar');
    add('#finalScreen', 'traditional-woman');
    add('#displayScreen', 'traditional-woman');
  }

  function decorateCardGames(root=document) {
    root.querySelectorAll?.('.baloot-panel').forEach(panel => {
      if (!panel.querySelector(':scope > .omani-character.palm-weaver') && art['palm-weaver']) panel.appendChild(figure('palm-weaver'));
    });
    root.querySelectorAll?.('.uno-intro').forEach(panel => {
      if (!panel.querySelector(':scope > .omani-character.mussar-khanjar') && art['mussar-khanjar']) panel.appendChild(figure('mussar-khanjar'));
    });
  }

  document.documentElement.dataset.omaniCharacters = 'heritage';
  decorateStatic();
  decorateCardGames();

  // Important: do not observe the entire live quiz DOM. The timer/progress text changes many
  // times per second on iPhone and a subtree MutationObserver here used to rescan the whole app,
  // causing sustained CPU usage, heat and eventual UI freezes. Card-game decorations are added
  // only when those screens are opened/created.
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-game="baloot"],[data-game="uno"],.baloot-card,.uno-card')) {
      setTimeout(() => decorateCardGames(), 0);
      setTimeout(() => decorateCardGames(), 250);
    }
  }, { passive:true });

  window.addEventListener('iam-omani-card-game-opened', event => {
    decorateCardGames(event.detail?.root || document);
  });

  if (!document.querySelector('script[data-host-owner-guard]')) {
    const guard = document.createElement('script');
    guard.src = '/host-owner-guard.js?v=76';
    guard.dataset.hostOwnerGuard = '1';
    document.body.appendChild(guard);
  }
})();
