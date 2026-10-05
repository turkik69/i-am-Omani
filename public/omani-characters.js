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

  function decorate() {
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
    qa('.baloot-panel').forEach(panel => {
      if (!panel.querySelector(':scope > .omani-character.palm-weaver') && art['palm-weaver']) panel.appendChild(figure('palm-weaver'));
    });
    qa('.uno-intro').forEach(panel => {
      if (!panel.querySelector(':scope > .omani-character.mussar-khanjar') && art['mussar-khanjar']) panel.appendChild(figure('mussar-khanjar'));
    });
  }

  document.documentElement.dataset.omaniCharacters = 'heritage';
  decorate();
  new MutationObserver(decorate).observe(document.body, { subtree:true, childList:true });

  if (!document.querySelector('script[data-host-owner-guard]')) {
    const guard = document.createElement('script');
    guard.src = '/host-owner-guard.js?v=73';
    guard.dataset.hostOwnerGuard = '1';
    document.body.appendChild(guard);
  }
})();
