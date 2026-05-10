/**
 * Play notification sounds using Web Audio API (zero dependencies).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Resume AudioContext on first user interaction (required by mobile browsers)
if (typeof document !== 'undefined') {
  const resumeAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    document.removeEventListener('touchstart', resumeAudio);
    document.removeEventListener('touchend', resumeAudio);
    document.removeEventListener('click', resumeAudio);
  };
  document.addEventListener('touchstart', resumeAudio, { once: true });
  document.addEventListener('touchend', resumeAudio, { once: true });
  document.addEventListener('click', resumeAudio, { once: true });
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not supported or blocked by browser policy
  }
}

/** Single node completed — short high-pitched ding */
export function playNodeComplete() {
  playTone(880, 0.15, 'sine');
  setTimeout(() => playTone(1100, 0.1, 'sine'), 80);
}

/** Entire workflow completed — ascending chime */
export function playWorkflowComplete() {
  playTone(523, 0.12, 'sine');
  setTimeout(() => playTone(659, 0.12, 'sine'), 100);
  setTimeout(() => playTone(784, 0.2, 'sine'), 200);
}

/** Node error — low buzz */
export function playError() {
  playTone(300, 0.15, 'square');
  setTimeout(() => playTone(250, 0.2, 'square'), 120);
}
