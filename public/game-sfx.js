(() => {
  let context;
  let noiseBuffer;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  function ready() {
    if (!AudioContext || window.OMANI_SFX_ENABLED?.() === false) return null;
    try {
      context ||= new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (!noiseBuffer) {
        noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * .2), context.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .48;
      }
      return context;
    } catch { return null; }
  }
  function tone(ctx, frequency, delay = 0, duration = .14, level = .055, type = 'sine') {
    const at = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + .014);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at); oscillator.stop(at + duration + .015);
  }
  function paper(ctx, delay = 0, duration = .085, level = .035, low = 750, high = 3500) {
    const at = ctx.currentTime + delay;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'bandpass'; filter.Q.value = .85;
    filter.frequency.setValueAtTime(high, at);
    filter.frequency.exponentialRampToValueAtTime(low, at + duration);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + .009);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(at); source.stop(at + duration + .01);
  }
  const sounds = {
    'ui-click': c => tone(c, 600, 0, .06, .018, 'triangle'),
    'join': c => { tone(c, 480, 0, .13, .045); tone(c, 720, .09, .17, .045); },
    'quiz-start': c => { tone(c, 390, 0, .13, .045); tone(c, 580, .11, .16, .045); },
    'quiz-answer': c => tone(c, 780, 0, .085, .04, 'triangle'),
    'quiz-correct': c => { tone(c, 523, 0, .16, .06); tone(c, 659, .12, .18, .06); tone(c, 784, .24, .28, .065); },
    'quiz-wrong': c => { tone(c, 330, 0, .13, .045, 'triangle'); tone(c, 240, .1, .22, .04, 'triangle'); },
    'tick': c => tone(c, 880, 0, .055, .026),
    'victory': c => [523,659,784,1046].forEach((f,i)=>tone(c,f,i*.13,.33,.06,'triangle')),
    'card-shuffle': c => [0,.06,.11,.17,.23].forEach((d,i)=>paper(c,d,.08,.035,850+i*120,3000)),
    'card-deal': c => [0,.11,.22,.33].forEach(d=>{paper(c,d,.09,.055,650,2400);tone(c,145,d+.04,.055,.025,'triangle')}),
    'card-play': c => {paper(c,0,.115,.065,430,2800);tone(c,130,.095,.09,.035,'triangle')},
    'trump': c => {tone(c,392,0,.23,.05,'triangle');tone(c,588,.14,.28,.055,'triangle')},
    'trick': c => {paper(c,0,.09,.05,650,2000);tone(c,620,.11,.18,.055);tone(c,830,.23,.23,.055)},
    'round-end': c => [392,523,659,784].forEach((f,i)=>tone(c,f,i*.16,.3,.055,'triangle'))
  };
  window.GameSFX = { play(name) {const ctx=ready();if(ctx) sounds[name]?.(ctx);} };
})();
