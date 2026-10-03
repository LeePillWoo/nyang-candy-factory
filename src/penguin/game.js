// 펭귄 남극탐험 — 정답 깃발이 서 있는 길로 달려가는 수학 달리기
//
// 원근: 땅 위 (x, z) → 화면. z = 앞쪽 거리, 펭귄은 z = ZP 에 서 있다.
//   화면 y = 지평선 + FY / z,  화면 x = 가운데 + x * FX / z,  크기 = FX / z
// 길은 세 갈래(x = -1, 0, 1). 물체는 지평선(z = FAR)에서 생겨 앞으로 다가온다.
import { sfx, speak, unlockAudio, isMuted, setMuted } from '../audio.js';
import { makeProblemSet, MODES } from '../problems.js';
import { safeInsets, visibleArea, onViewportChange } from '../viewport.js';
import * as D from './draw.js';
import { SPRITES, loadSprites, drawSpriteFrame } from '../sprites.js';

const GATES = 5;              // 한 판 = 문제 5개 → 기지 도착
const ZP = 2;                 // 펭귄이 서 있는 깊이
const FAR = 52;               // 지평선 깊이 (여기서 물체가 생긴다)
const SPEED = 6;              // 달리는 속도 (단위/초)
const THINK = { 1: 6.5, 2: 6.5, 3: 7, 4: 7 };  // 깃발이 나타나서 펭귄에 닿기까지 시간(초). 문제는 깃발 위 간판에 있어 가까워져야 읽힌다
const HOLE_RATE = { 1: 0.35, 2: 0.3, 3: 0.25, 4: 0.2 };  // 생기는 물체 중 얼음 구멍 비율 (어려울수록 줄여 계산에 집중)
const JUMP_TIME = 0.75;
// 깃발 통과 슬로모션 — 어려울수록 일찍, 더 느리게 (생각할 시간). 실제로 느린 시간 ≈ NEAR / (6 × SLOW)초: 3 · 5.4 · 8.3 · 12초
const SLOW = { 1: 0.25, 2: 0.2, 3: 0.16, 4: 0.13 };      // 배속
const SLOW_NEAR = { 1: 4.5, 2: 6.5, 3: 8, 4: 9.5 };      // 깃발이 이만큼(깊이) 가까워지면 느려지기 시작
const SAY_NEAR = 16;          // 간판이 읽힐 만큼 가까워지면 문제를 읽어 준다
const SLOW_HOLD = 0.6;        // 통과 뒤 슬로모션을 유지하는 시간(실제 초)
const OP_WORD = { add: '더하기', sub: '빼기', mul: '곱하기', div: '나누기', ten: '더하기' };

const $ = (s) => document.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const store = {
  load(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 저장 불가 */ } },
};

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

// ── 무대 크기 · 원근 ─────────────────────────────────────
let W = 1280, H = 800, PORTRAIT = false;
const P = { horizon: 0, playerY: 0, fx: 0, fy: 0, cx: 0 };
function setLayout(portrait, height) {
  PORTRAIT = portrait;
  W = portrait ? 720 : 1280;
  H = portrait ? height : 800;
  // 세로 화면은 문제판 바로 아래를 지평선으로 (얼음길을 넓게)
  P.horizon = Math.round(portrait ? Math.max(430, H * 0.3) : H * 0.4);
  P.playerY = H - (portrait ? 190 : 165);
  P.fy = (P.playerY - P.horizon) * ZP;
  P.fx = W * (portrait ? 0.29 : 0.24) * ZP;
  P.cx = W / 2;
}
const proj = (x, z) => ({ x: P.cx + x * P.fx / z, y: P.horizon + P.fy / z, s: P.fx / z });

class PenguinGame {
  constructor() {
    this.stage = $('#stage');
    this.canvas = $('#scene');
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this.coins = store.load('nyang.coins', 0);
    this.diff = store.load('penguin.diff', 1);
    this.state = 'menu';
    this.reset();
    this.fit();
    onViewportChange(() => this.fit());
    this.bindUI();
    this.renderCoins();
    this.showMenu();

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  reset() {
    this.objects = [];
    this.particles = [];
    this.dist = 0;
    this.speed = SPEED;
    this.nextSpawn = 14;
    this.nextMound = 0;
    this.lane = 0;
    this.px = 0;
    this.jumpT = null;
    this.fallT = 0;
    this.moodT = 0;
    this.mood = 'run';
    this.phase = 'idle';
    this.phaseT = 0;
    this.gateIndex = 0;
    this.timeScale = 1;
    this.slowHold = 0;
    this.results = [];
    this.missed = [];
    this.fish = 0;
    this.earned = 0;
    this.arrived = 0;
    this.flagUp = 0;
  }

  // ── 화면 맞춤 (사탕 공장과 같은 방식) ─────────────────────
  fit() {
    const { l, r, t, b } = safeInsets();
    const area = visibleArea();
    const vw = Math.max(1, area.w - l - r), vh = Math.max(1, area.h - t - b);
    const portrait = vh > vw;
    const height = portrait ? clamp(Math.round(720 * vh / vw), 1100, 1640) : 800;
    if (portrait !== PORTRAIT || height !== H || !this.laidOut) {
      setLayout(portrait, height);
      this.laidOut = true;
      this.stage.classList.toggle('portrait', portrait);
      this.stage.style.width = `${W}px`;
      this.stage.style.height = `${H}px`;
    }
    const s = Math.min(vw / W, vh / H);
    this.scale = s;
    this.stage.style.transform = `translate(${area.x + l + (vw - W * s) / 2}px, ${area.y + t + (vh - H * s) / 2}px) scale(${s})`;
    const k = Math.min(2.5, Math.max(1, s * (window.devicePixelRatio || 1)));
    const cw = Math.round(W * k), ch = Math.round(H * k);
    if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
    this.stage.classList.add('ready');
  }

  // ── 입력 ────────────────────────────────────────────
  bindUI() {
    document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });

    const press = (btn, fn) => btn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
    press($('#pad .left'), () => this.steer(-1));
    press($('#pad .right'), () => this.steer(1));
    press($('#pad .jump'), () => this.jump());

    // 화면 밀기: 좌우 = 길 바꾸기, 위 = 점프
    let start = null;
    this.canvas.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!start) return;
      const dx = (e.clientX - start.x) / this.scale, dy = (e.clientY - start.y) / this.scale;
      start = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) this.steer(Math.sign(dx));
      else if (dy < -50) this.jump();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.steer(-1);
      else if (e.key === 'ArrowRight') this.steer(1);
      else if (e.key === 'ArrowUp' || e.key === ' ') { e.preventDefault(); this.jump(); }
    });

    document.querySelectorAll('.diff[data-diff]').forEach((b) => b.addEventListener('click', () => {
      sfx.tap();
      this.diff = Number(b.dataset.diff);
      store.save('penguin.diff', this.diff);
      this.renderDiff();
    }));
    this.renderDiff();
    document.querySelectorAll('.mode[data-mode]').forEach((b) => b.addEventListener('click', () => {
      sfx.tap();
      this.start(b.dataset.mode);
    }));

    $('#btn-home').addEventListener('click', () => { sfx.tap(); this.showMenu(); });
    const snd = $('#btn-sound');
    const renderSnd = () => { snd.textContent = isMuted() ? '🔇' : '🔊'; };
    snd.addEventListener('click', () => { setMuted(!isMuted()); renderSnd(); sfx.tap(); });
    renderSnd();
    $('#result .again').addEventListener('click', () => { sfx.tap(); this.start(this.mode); });
    $('#result .home').addEventListener('click', () => { sfx.tap(); this.showMenu(); });
  }

  steer(d) {
    if (this.state !== 'run' || this.fallT > 0 || this.phase === 'home') return;
    const next = clamp(this.lane + d, -1, 1);
    if (next === this.lane) return;
    this.lane = next;
    sfx.tap();
    this.renderChips();
  }

  jump() {
    if (this.state !== 'run' || this.fallT > 0 || this.jumpT !== null || this.phase === 'home') return;
    this.jumpT = 0;
    sfx.hop();
  }

  renderDiff() {
    document.querySelectorAll('.diff[data-diff]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.diff) === this.diff)));
  }

  renderCoins() { $('#coin-count').textContent = this.coins; }

  addCoins(n) {
    if (n <= 0) return;
    this.coins += n;
    this.earned += n;
    store.save('nyang.coins', this.coins);
    this.renderCoins();
    const c = $('#coins');
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    sfx.coin();
  }

  renderDots() {
    const box = $('#dots');
    box.innerHTML = '';
    for (let i = 0; i < GATES; i++) {
      const d = document.createElement('div');
      const r = this.results[i];
      d.className = 'dot' + (r === 'star' ? ' done' : r === 'miss' ? ' ok' : i === this.gateIndex && this.state === 'run' ? ' now' : '');
      d.textContent = r === 'star' ? '⭐' : r === 'miss' ? '💙' : '';
      box.appendChild(d);
    }
  }

  // ── 화면 전환 ────────────────────────────────────────
  showMenu() {
    this.state = 'menu';
    this.runId = (this.runId || 0) + 1;
    this.reset();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $('#menu').hidden = false;
    $('#result').hidden = true;
    $('#quiz').hidden = true;
    $('#pad').hidden = true;
    $('#dots').hidden = true;
    $('#btn-home').hidden = true;
  }

  start(mode) {
    this.mode = mode;
    this.reset();
    this.runId = (this.runId || 0) + 1;
    $('#fish-count').textContent = 0;
    this.problems = makeProblemSet(mode, 'number', GATES, this.diff);
    this.state = 'run';
    this.phase = 'gap';
    this.phaseT = 2.2;
    $('#menu').hidden = true;
    $('#result').hidden = true;
    $('#quiz').hidden = true;
    $('#pad').hidden = false;
    $('#dots').hidden = false;
    $('#btn-home').hidden = false;
    this.renderDots();
    speak('출발! 정답 깃발이 있는 길로 달려가요!');
  }

  // 문제를 띄우고, 저 멀리에 정답 깃발 세 개를 세운다
  ask() {
    const p = this.problems[this.gateIndex];
    this.problem = p;
    const z = ZP + SPEED * THINK[p.diff];
    // 깃발 바로 앞뒤의 얼음 구멍은 치워서 계산에만 집중하게
    this.objects = this.objects.filter((o) => !(o.kind === 'hole' && Math.abs(o.z - z) < 10));
    this.objects.push({ kind: 'gate', z, x: 0, p, choices: p.choices.slice(), picked: null, said: false });
    this.phase = 'quiz';
    const quiz = $('#quiz');
    const ex = quiz.querySelector('.q-expr');
    ex.innerHTML = `${p.left}<span class="q">?</span>${p.right}`;
    const len = (p.left + p.right).length + String(p.answer).length;
    ex.classList.toggle('long', len > 11);
    const chips = quiz.querySelectorAll('.q-choices span');
    p.choices.forEach((n, i) => { chips[i].textContent = n; chips[i].className = `lane${i}`; });
    quiz.querySelector('.q-msg').textContent = '정답 깃발 쪽 길로 가요!';
    // 문제는 깃발 위 간판에 걸려 다가온다. 위 문제판은 통과한 뒤 결과를 보여 줄 때만
    quiz.hidden = true;
    this.renderChips();
    this.renderDots();
  }

  sayProblem(p) {
    if (p.mode === 'ten') speak(`${p.a} 더하기 몇은 10?`);
    else speak(`${p.a} ${OP_WORD[p.mode]} ${p.b}는?`);
  }

  renderChips() {
    const chips = document.querySelectorAll('#quiz .q-choices span');
    chips.forEach((c, i) => c.classList.toggle('here', i === this.lane + 1));
  }

  passGate(g) {
    const i = this.lane + 1;
    const n = g.choices[i];
    const p = g.p;
    const right = g.choices.indexOf(p.answer);
    g.picked = i;
    this.slowHold = SLOW_HOLD;
    g.right = right;
    const chips = document.querySelectorAll('#quiz .q-choices span');
    const msg = $('#quiz .q-msg');
    $('#quiz .q-expr').innerHTML = `${p.left}<span class="ans">${p.answer}</span>${p.right}`;
    const quiz = $('#quiz');
    quiz.hidden = false;
    quiz.style.animation = 'none'; void quiz.offsetWidth; quiz.style.animation = '';
    if (n === p.answer) {
      this.results.push('star');
      sfx.correct();
      this.setMood('happy', 1.3);
      this.burst(P.cx + this.px * P.fx / ZP, P.playerY - 120, 24);
      chips[i].classList.add('right');
      msg.textContent = '딩동댕! 잘했어요! 🎉';
      speak('딩동댕!');
      this.addCoins(3 + (p.diff - 1));
    } else {
      this.results.push('miss');
      this.missed.push(p);
      sfx.oops();
      this.setMood('oops', 1.0);
      this.speed = SPEED * 0.35;   // 살짝 미끄러질 뿐, 벌은 없음
      chips[i].classList.add('wrong');
      chips[right].classList.add('right');
      msg.textContent = `정답은 ${p.answer}! 다음엔 맞힐 수 있어요`;
      speak(`정답은 ${p.answer}!`);
    }
    this.gateIndex++;
    this.renderDots();
    this.phase = 'gap';
    this.phaseT = 2.6;
  }

  setMood(m, sec) { this.mood = m; this.moodT = sec; }

  // ── 물체 만들기 ──────────────────────────────────────
  spawnStuff() {
    // 깃발 근처에는 구멍을 만들지 않는다 (계산에 집중)
    const gate = this.objects.find((o) => o.kind === 'gate' && o.picked === null);
    if (gate && Math.abs(gate.z - FAR) < 16) return;
    if (this.phase === 'home') return;
    const lane = pick([-1, 0, 1]);
    if (Math.random() < HOLE_RATE[this.diff]) {
      this.objects.push({ kind: 'hole', x: lane, z: FAR });
    } else {
      // 물고기 한 줄
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.objects.push({ kind: 'fish', x: lane, z: FAR + i * 1.6, color: pick(['#ffa53c', '#5bc0f8', '#ff8fab']) });
    }
  }

  burst(x, y, n) {
    const colors = ['#ff6b8b', '#ffb347', '#5ccf95', '#5bc0f8', '#a77bf3', '#ffd84d'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 250 + Math.random() * 350;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 250, g: 900, life: 1.2 + Math.random() * 0.5, age: 0, color: pick(colors), kind: Math.random() < 0.5 ? 'star' : 'dot', spin: Math.random() * 6 });
    }
  }
  splash(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI * (0.15 + Math.random() * 0.7), v = 200 + Math.random() * 250;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, life: 0.8, age: 0, color: '#6fb6ef', kind: 'drop', spin: 0 });
    }
  }

  // ── 루프 ────────────────────────────────────────────
  update(dt) {
    // 깃발 통과 슬로모션: 깃발이 코앞에 오면 느려지고, 지나간 뒤 잠깐 유지했다가 원래 속도로
    const gate = this.state === 'run' && this.objects.find((o) => o.kind === 'gate' && o.picked === null);
    const near = gate && gate.z - ZP < SLOW_NEAR[this.diff] && this.fallT <= 0;
    if (gate && !gate.said && gate.z - ZP < SAY_NEAR) { gate.said = true; this.sayProblem(gate.p); }
    if (this.slowHold > 0) this.slowHold -= dt;
    const target = near || this.slowHold > 0 ? SLOW[this.diff] : 1;
    this.timeScale += (target - this.timeScale) * Math.min(1, dt * (target < 1 ? 8 : 3));
    const realDt = dt;
    dt *= this.timeScale;

    this.time += dt;
    for (const p of this.particles) { p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.particles = this.particles.filter((p) => p.age < p.life);
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood = 'run'; }

    if (this.state === 'menu') {
      // 메뉴 뒤에서도 천천히 달린다
      this.dist += SPEED * 0.5 * dt;
      this.moveDecor(SPEED * 0.5 * dt);
      return;
    }
    if (this.state !== 'run') { this.moveDecor(0); return; }

    // 펭귄 좌우 이동 · 점프 · 빠짐
    // 좌우 이동은 슬로모션이어도 실제 시간으로 (버튼 반응이 굼뜨지 않게)
    this.px += clamp(this.lane - this.px, -7 * realDt, 7 * realDt);
    if (this.jumpT !== null) { this.jumpT += dt; if (this.jumpT >= JUMP_TIME) this.jumpT = null; }
    if (this.fallT > 0) {
      this.fallT -= dt;
      this.speed = 0;
      if (this.fallT <= 0) { this.mood = 'run'; sfx.hop(); }
    } else if (this.phase !== 'home') {
      this.speed += (SPEED - this.speed) * Math.min(1, dt * 1.6);
    }

    const dz = this.speed * dt;
    this.dist += dz;
    this.moveDecor(dz);

    // 지평선에서 새 물체
    if (this.phase !== 'home' && this.dist >= this.nextSpawn) {
      this.spawnStuff();
      this.nextSpawn = this.dist + 9 + Math.random() * 7;
    }

    // 다가오기 + 펭귄 자리(ZP)를 지나는 순간 판정
    for (const o of this.objects) {
      if (o.kind === 'mound') continue;
      const before = o.z;
      o.z -= dz;
      if (before > ZP && o.z <= ZP) this.cross(o);
    }
    this.objects = this.objects.filter((o) => o.z > 0.6 && !o.gone);

    // 진행 단계
    if (this.phase === 'gap') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        $('#quiz').hidden = true;
        if (this.gateIndex < GATES) this.ask();
        else this.goHome();
      }
    } else if (this.phase === 'home') {
      const base = this.objects.find((o) => o.kind === 'base');
      if (base && base.z <= ZP + 5) {
        base.z = ZP + 5;
        this.speed = 0;
        if (!this.arrived) this.arrive();
      } else if (base) {
        this.speed += (SPEED - this.speed) * Math.min(1, dt * 1.6);
      }
      if (this.arrived) {
        this.flagUp = Math.min(1, this.flagUp + dt * 0.7);
        this.arrived += dt;
      }
    }
  }

  moveDecor(dz) {
    for (const o of this.objects) if (o.kind === 'mound') o.z -= dz;
    this.objects = this.objects.filter((o) => o.kind !== 'mound' || o.z > 0.8);
    if (this.dist >= this.nextMound) {
      for (const sx of [-2.5, 2.5]) this.objects.push({ kind: 'mound', x: sx + (Math.random() - 0.5) * 0.6, z: FAR });
      this.nextMound = this.dist + 5 + Math.random() * 3;
    }
  }

  cross(o) {
    const near = Math.abs(this.px - o.x) < 0.45;
    const lift = this.jumpLift();
    if (o.kind === 'gate') { this.passGate(o); return; }
    if (o.kind === 'hole' && near && lift < 0.12 && this.fallT <= 0) {
      this.fallT = 1.2;
      this.jumpT = null;
      this.mood = 'fall';
      this.moodT = 0;
      sfx.oops();
      this.splash(P.cx + this.px * P.fx / ZP, P.playerY);
    }
    if (o.kind === 'fish' && Math.abs(this.px - o.x) < 0.5) {
      o.gone = true;
      this.fish++;
      sfx.pop(this.fish % 8);
      $('#fish-count').textContent = this.fish;
      const fc = $('#fish');
      fc.classList.remove('bump'); void fc.offsetWidth; fc.classList.add('bump');
    }
  }

  jumpLift() {
    if (this.jumpT === null) return 0;
    return Math.sin((this.jumpT / JUMP_TIME) * Math.PI);  // 0 ~ 1
  }

  goHome() {
    this.phase = 'home';
    this.objects.push({ kind: 'base', x: 0, z: FAR });
    speak('남극 기지가 보여요!');
  }

  arrive() {
    this.arrived = 0.001;
    this.lane = 0;
    this.setMood('happy', 99);
    sfx.fanfare();
    this.burst(W / 2, P.horizon + 40, 40);
    $('#pad').hidden = true;
    // 물고기 2마리마다 코인 1개
    this.addCoins(Math.floor(this.fish / 2));
    const id = this.runId;
    setTimeout(() => { if (this.state === 'run' && this.runId === id) this.showResult(); }, 2400);
  }

  showResult() {
    this.state = 'result';
    const stars = this.results.filter((r) => r === 'star').length;
    const box = $('#result');
    const st = box.querySelector('.stars');
    st.innerHTML = '';
    for (let i = 0; i < GATES; i++) {
      const s = document.createElement('span');
      s.textContent = '⭐';
      if (i >= stars) s.className = 'off';
      s.style.animationDelay = `${0.15 + i * 0.12}s`;
      st.appendChild(s);
    }
    box.querySelector('.earned').innerHTML = `🐟 ${this.fish}마리 · 코인 <b>+${this.earned}</b>`;
    const review = box.querySelector('.review');
    review.innerHTML = '';
    if (this.missed.length) {
      const h = document.createElement('p');
      h.className = 'review-title';
      h.textContent = '다시 보기';
      review.appendChild(h);
      for (const p of this.missed) {
        const d = document.createElement('p');
        d.innerHTML = `${p.left}<b>${p.answer}</b>${p.right}`;
        review.appendChild(d);
      }
    }
    box.hidden = false;
    $('#dots').hidden = true;
    $('#quiz').hidden = true;
    speak(stars >= 4 ? '최고의 탐험가예요!' : '기지에 도착했어요! 수고했어요!');
  }

  // ── 그리기 ──────────────────────────────────────────
  draw() {
    const ctx = this.ctx;
    const t = this.time;
    // 슬로모션일 때 펭귄 쪽으로 살짝 당겨 보기
    const zoom = 1 + (1 - this.timeScale) / (1 - SLOW[this.diff]) * 0.08;
    ctx.save();
    if (zoom > 1.001) {
      const zx = P.cx + this.px * P.fx / ZP, zy = P.playerY - 60;
      ctx.translate(zx, zy); ctx.scale(zoom, zoom); ctx.translate(-zx, -zy);
    }
    D.drawSky(ctx, W, P.horizon, t);
    D.drawGround(ctx, W, H, P.horizon, proj, this.dist, FAR);

    // 먼 것부터
    const items = this.objects.slice();
    items.push({ kind: 'penguin', z: ZP - 0.001 });
    items.sort((a, b) => b.z - a.z);
    for (const o of items) {
      if (o.kind === 'penguin') { this.drawPenguin(ctx, t); continue; }
      if (o.z > FAR + 0.5 || o.z < 0.6) continue;
      const alpha = clamp((FAR + 0.5 - o.z) / 6, 0, 1);
      const p = proj(o.x, o.z);
      switch (o.kind) {
        case 'mound': D.drawMound(ctx, p, alpha); break;
        case 'hole': D.drawHole(ctx, p, alpha, t); break;
        case 'fish': {
          ctx.save(); ctx.globalAlpha = alpha;
          D.drawFish(ctx, p.x, p.y - p.s * (0.28 + Math.abs(Math.sin(t * 5 + o.z)) * 0.12), p.s * 0.3, t, o.color);
          ctx.restore();
          break;
        }
        case 'gate':
          D.drawQuizSign(ctx, p, [o.p.left, '?', o.p.right], alpha, o.picked === null ? null : o.p.answer);
          o.choices.forEach((n, i) => {
            const state = o.picked === null ? null : i === o.right ? 'right' : i === o.picked ? 'wrong' : 'dim';
            D.drawFlag(ctx, proj(i - 1, o.z), n, i, alpha * (state === 'dim' ? 0.5 : 1), state);
          });
          break;
        case 'base': D.drawBase(ctx, p, alpha, this.flagUp, t); break;
      }
    }
    for (const p of this.particles) D.drawParticle(ctx, p);
    ctx.restore();
    // 슬로모션 테두리 그늘
    const k = (1 - this.timeScale) / (1 - SLOW[this.diff]);
    if (k > 0.02) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(20, 60, 110, 0)');
      g.addColorStop(1, `rgba(20, 60, 110, ${0.28 * k})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  drawPenguin(ctx, t) {
    const S = Math.min(PORTRAIT ? 150 : 170, P.fx / ZP * 0.62);
    const x = P.cx + this.px * P.fx / ZP;
    const running = this.state === 'menu' || (this.state === 'run' && this.speed > 0.5 && !this.arrived);
    const mood = this.fallT > 0 ? 'fall' : this.mood;
    const dir = clamp((this.lane - this.px) * 2, -1, 1);
    const lift = this.jumpLift() * S * 0.7;
    const fallP = this.fallT > 0 ? clamp((1.2 - this.fallT) / 0.25, 0, 1) * clamp(this.fallT / 0.25, 0, 1) : 0;
    if (SPRITES.penguin.image) this.drawPenguinSprite(ctx, t, x, S, { running, mood, dir, lift, fallP });
    else D.drawPenguin(ctx, x, P.playerY, S, { t, view: mood === 'run' ? 'back' : 'front', mood, run: running ? 1 : 0.15, dir, lift, fallP });
  }

  // 펭귄 시트(6×6): 0행 뒷모습 걷기·옆모습, 1행 정면·옆·점프 뒷모습, 3행 놀람, 4행 만세 …
  // [행, 칸] 목록을 fps 로 돌린다
  drawPenguinSprite(ctx, t, x, S, { running, mood, dir, lift, fallP }) {
    const F = PENGUIN_FRAMES;
    let frames;
    if (mood === 'fall') frames = F.fall;
    else if (mood === 'happy') frames = F.happy;
    else if (mood === 'oops') frames = F.oops;
    else if (lift > 2) frames = F.jump;
    else if (dir > 0.15) frames = F.right;
    else if (dir < -0.15) frames = F.left;
    else frames = running ? F.run : F.stand;
    const fps = frames === F.run ? 9 : frames === F.happy ? 4 : 3;
    const i = Math.floor(Math.abs(t || 0) * fps) % frames.length;
    const [row, col] = frames[i] || frames[0];
    const sheet = SPRITES.penguin;
    const scale = S / 130;   // 시트 속 펭귄 키 ≈ 130px
    const y = P.playerY;

    // 그림자
    ctx.save();
    ctx.globalAlpha = 0.18 * (1 - Math.min(0.6, lift / S));
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y, S * 0.34, S * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (mood === 'fall') {
      // 얼음 구멍에 쏙: 물구멍 → 물 위쪽만 보이게 잘라서 → 앞쪽 물결
      ctx.save();
      ctx.lineWidth = Math.max(2, S * 0.03);
      ctx.strokeStyle = D.OUTLINE;
      ctx.fillStyle = '#2a6db0';
      ctx.beginPath(); ctx.ellipse(x, y, S * 0.42, S * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(x - S * 1.5, y - S * 3, S * 3, S * 3); ctx.clip();
      ctx.translate(x, y + S * 0.45 * fallP);
      ctx.rotate(Math.sin(t * 18) * 0.1);
      drawSpriteFrame(ctx, sheet, `row${row}`, col, scale);
      ctx.restore();
      ctx.save();
      ctx.fillStyle = 'rgba(111, 182, 239, .9)';
      ctx.beginPath(); ctx.ellipse(x, y + S * 0.02, S * 0.36, S * 0.08, 0, 0, Math.PI); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(x, y - lift);
    if (running && frames === F.run) ctx.rotate(Math.sin(t * 9) * 0.05);  // 뒤뚱뒤뚱
    drawSpriteFrame(ctx, sheet, `row${row}`, col, scale);
    ctx.restore();
  }
}

const PENGUIN_FRAMES = {
  run:   [[0, 0], [0, 1], [0, 0], [0, 2]],   // 뒷모습 걷기
  stand: [[0, 0]],
  right: [[0, 3]],                            // 오른쪽 길로
  left:  [[1, 2]],                            // 왼쪽 길로
  jump:  [[1, 3]],                            // 발을 든 뒷모습
  happy: [[4, 4], [1, 0], [4, 4], [0, 5]],    // 정면 만세
  oops:  [[3, 5], [4, 0]],                    // 깜짝!
  fall:  [[4, 0]],
};

const go = () => new PenguinGame();
const fontReady = document.fonts && document.fonts.load
  ? Promise.race([document.fonts.load('30px Jua'), new Promise((r) => setTimeout(r, 1500))])
  : Promise.resolve();
// 펭귄 시트만 불러온다 (실패하면 코드로 그린 펭귄으로)
Promise.all([fontReady, loadSprites(['penguin'])]).finally(go);
