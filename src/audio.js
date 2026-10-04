// WebAudio 효과음 (파일 없이 합성) + 한국어 음성 안내(speechSynthesis).
import { load, save } from './save.js';

let ctx = null;
let master = null;
let muted = false;
let speechPrimed = false;

muted = load('nyang.muted', 0) === 1;   // 소리 끔 설정 (세 게임 공용)

// 모바일 브라우저는 첫 터치 때 오디오를 깨워야 한다.
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  // iOS: 첫 음성은 사용자 터치 안에서 한 번 깨워 둬야 이후 안내가 나온다
  if (!speechPrimed && window.speechSynthesis) {
    speechPrimed = true;
    try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch { /* 무시 */ }
  }
}

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  save('nyang.muted', m ? 1 : 0);
  if (m && window.speechSynthesis) speechSynthesis.cancel();
}

function tone(freq, start, dur, { type = 'sine', vol = 0.4, slide = 0 } = {}) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap()     { tone(660, 0, 0.08, { type: 'triangle', vol: 0.25 }); },
  // 사탕 '뽁' — n 번째일수록 살짝 높아짐
  pop(n = 0) { tone(520 + n * 45, 0, 0.12, { type: 'sine', vol: 0.45, slide: 380 }); },
  machine() {
    tone(180, 0, 0.12, { type: 'square', vol: 0.12, slide: -60 });
    tone(240, 0.06, 0.1, { type: 'square', vol: 0.1, slide: -80 });
  },
  give()    { tone(700, 0, 0.1, { type: 'triangle', vol: 0.3, slide: -250 }); tone(500, 0.08, 0.1, { type: 'triangle', vol: 0.25 }); },
  count(n)  { tone(440 * Math.pow(2, Math.min(n, 20) / 12), 0, 0.16, { type: 'triangle', vol: 0.35 }); },
  correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, { type: 'triangle', vol: 0.35 })); },
  // 오답도 무섭지 않게: 부드러운 '뿌잉'
  oops()    { tone(392, 0, 0.18, { type: 'sine', vol: 0.3, slide: -90 }); tone(330, 0.16, 0.22, { type: 'sine', vol: 0.25, slide: -60 }); },
  coin()    { tone(988, 0, 0.08, { type: 'square', vol: 0.12 }); tone(1319, 0.07, 0.25, { type: 'square', vol: 0.12 }); },
  hop()     { tone(300, 0, 0.15, { type: 'sine', vol: 0.25, slide: 400 }); },
  fanfare() {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.25, { type: 'triangle', vol: 0.32 }));
  },
};

// 글을 아직 잘 못 읽는 아이를 위한 음성 안내
let koVoice = null;
function pickVoice() {
  if (!window.speechSynthesis) return;
  koVoice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('ko')) || null;
}
if (window.speechSynthesis) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export function speak(text) {
  if (muted || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    if (koVoice) u.voice = koVoice;
    u.rate = 1.0;
    u.pitch = 1.25;
    speechSynthesis.speak(u);
  } catch { /* 음성 미지원 */ }
}
