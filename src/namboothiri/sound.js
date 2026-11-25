export function createSound(settings) {
  let context;
  let buzz;
  let level = -1;

  const tones = {
    shot: [760, 355, .09, 'triangle', .07],
    perfect: [1090, 510, .13, 'triangle', .1],
    hit: [430, 940, .105, 'sine', .11],
    refill: [540, 1180, .22, 'sine', .1],
    bite: [205, 72, .2, 'triangle', .11],
    cleared: [520, 880, .24, 'sine', .09],
  };

  return {
    unlock() {
      if (!settings.sound) return;
      try {
        if (!context) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          context = new Audio();
          const oscillator = context.createOscillator();
          oscillator.type = 'triangle';
          oscillator.frequency.value = 171;
          buzz = context.createGain();
          buzz.gain.value = 0;
          oscillator.connect(buzz).connect(context.destination);
          oscillator.start();
        }
        if (context.state !== 'running') context.resume().catch(() => {});
      } catch { /* Audio is optional. */ }
    },

    threat(amount) {
      if (!context || !buzz) return;
      const next = settings.sound ? amount : 0;
      if (next === level) return;
      level = next;
      buzz.gain.setTargetAtTime(next, context.currentTime, .08);
    },

    play(name) {
      if (!settings.sound || context?.state !== 'running') return;
      const [start, end, duration, shape, volume] = tones[name];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const time = context.currentTime;
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(start, time);
      oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(.001, time + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + duration);
    },
  };
}
