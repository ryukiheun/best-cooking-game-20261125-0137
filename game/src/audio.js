// All sound is synthesised with WebAudio: short oscillator blips, no audio
// files and no network. Audio starts only after the first user gesture.

let context = null;

function getContext() {
  if (context) return context;
  const AudioClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioClass) return null;
  context = new AudioClass();
  return context;
}

function playTone(frequency, seconds, type, volume) {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + seconds);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + seconds);
}

export function playChopSound() {
  playTone(180, 0.08, 'square', 0.08);
}

export function playPickupSound() {
  playTone(520, 0.09, 'sine', 0.1);
}

export function playSizzleSound() {
  playTone(1400, 0.12, 'sawtooth', 0.03);
}

export function playServeSound() {
  playTone(660, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(880, 0.18, 'sine', 0.12), 110);
}

export function playErrorSound() {
  playTone(140, 0.2, 'square', 0.09);
}

export function playTickSound() {
  playTone(980, 0.05, 'sine', 0.05);
}
