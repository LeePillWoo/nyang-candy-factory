// 냥냥 주방 — 요리사가 직접 걸어 다니며 요리하고 배달하는 주방 게임.
//   ① 만두 상자를 누르면 요리사가 걸어가서 만두를 집는다 (누른 횟수만큼 1개씩 / 5개씩)
//   ② 불(화덕)을 누르면 가서 팬에 올려 굽는다 — 굽는 동안 다른 일을 할 수 있다
//   ③ 다 구워지면(띵!) 팬을 눌러 접시를 든다
//   ④ 손님을 누르면 걸어가서 배달 — 만두 수가 그 손님 주문의 답과 같으면 성공
//   틀려도 벌 없음: 손님이 "이건 아니에요" 하고, 다른 손님에게 주거나 버리고 다시 하면 된다.
//   자기 요리사를 누르면 든 만두를 하나 내려놓는다(너무 많이 집었을 때).
//   덤: 콤보 → 피버(코인 2배), VIP 손님 👑, 처음에는 손가락 안내, 모드별 최고 기록.
//   1인: 냥이 · 2인: 주방을 반으로 나눠 1P 냥이 + 2P 펭귄, 손님은 함께 받는다(협동).
import { sfx, speak, unlockAudio, isMuted, setMuted } from '../audio.js';
import { makeProblemSet } from '../problems.js';
import { visibleArea, safeInsets, onViewportChange } from '../viewport.js';
import { SPRITES, loadSprites, drawSpriteFrame } from '../sprites.js';
import { CHARACTERS, FEATURED_CUSTOMERS } from '../characters.js';
import * as D from './draw.js';

const SHIFT = 150;            // 한 판(영업 시간), 초
const COOK_TIME = 3;          // 굽는 시간, 초
const PATIENCE = 45;          // 손님 기다림 막대(다 줄어도 떠나지 않음 — 빨리 주면 보너스만)
const CAP = 20;               // 한 번에 들 수 있는 만두
const CHEF_SPEED = 560;       // 요리사 걷는 빠르기 (px/초)
const CUST_SPEED = 300;       // 손님 걷는 빠르기
const SEATS = { 1: 3, 2: 4 }; // 계산대 자리 수
const STAR_AT = { 1: [3, 5, 8], 2: [4, 7, 10] };
const FEVER_COMBO = 3;        // 연속 성공 3번 → 피버
const FEVER_TIME = 12;        // 피버 동안 코인 2배
const VIP_RATE = 0.18;        // VIP 손님(👑) 비율 — 코인 +3
const HINT_UNTIL = 2;         // 요리사마다 배달 성공 2번까지는 손가락 안내
const OP_WORD = { add: '더하기', sub: '빼기', mul: '곱하기', div: '나누기', ten: '더하기' };
// 답이 1~20 (한 번에 드는 만두)에 들어오도록 모드별 문제 레벨
const LEVEL = { add: 'number', sub: 'number', mul: 'picture', div: 'number', ten: 'number' };

const CHEFS = [
  { key: 'nyang', name: '냥이', ring: '#ff8fab' },
  { key: 'penguin', name: '펭귄', ring: '#7cc8f8' },
];
// 펭귄 시트(6×6)에서 정면 프레임 [행, 칸]
const PENGUIN_CHEF = {
  idle: { frames: [[2, 2], [2, 2], [2, 2], [3, 2]], fps: 2 },
  walk: { frames: [[2, 2], [3, 2], [2, 1], [3, 1]], fps: 8 },
  happy: { frames: [[4, 4], [1, 0], [4, 4], [0, 5]], fps: 5 },
  sad: { frames: [[3, 5]], fps: 1 },
};

const $ = (s) => document.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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

// 캐릭터 한 프레임: (x, y) = 발 아래 중앙, 키 h
function drawCharacter(ctx, key, animName, t, x, y, h, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (key === 'penguin') {
    const sheet = SPRITES.penguin;
    if (sheet.image) {
      const a = PENGUIN_CHEF[animName] || PENGUIN_CHEF.idle;
      const [row, col] = a.frames[Math.floor(t * a.fps) % a.frames.length];
      if (animName === 'walk') ctx.rotate(Math.sin(t * 12) * 0.08);   // 뒤뚱뒤뚱
      drawSpriteFrame(ctx, sheet, `row${row}`, col, h / 140, flip);
    }
    ctx.restore();
    return;
  }
  const c = CHARACTERS[key];
  const sheet = c && SPRITES[c.sprite];
  if (sheet && sheet.image) {
    const def = c.anims[animName] || c.anims.idle;
    const anim = sheet.anims[def.anim];
    const fps = def.fps || anim.fps;
    const i = Math.floor(t * fps);
    const frame = def.seq ? def.seq[i % def.seq.length] : i % anim.frames;
    const faceFlip = c.faces === 'left' ? !flip : flip;
    drawSpriteFrame(ctx, sheet, def.anim, frame, h / (sheet.frameH * 0.92), faceFlip);
  }
  ctx.restore();
}

// ── 무대 크기 ─────────────────────────────────────────
let W = 1280, H = 800, PORTRAIT = false;

// 주방 배치: 계산대 높이, 손님 자리, 요리사별 상자·불·버리기 위치
function makeLayout(players, portrait) {
  // 세로 화면은 키가 클수록 손님 홀도 크게
  const L = { counterY: portrait ? Math.round(Math.max(470, H * 0.34)) : 360 };
  const F0 = L.counterY + 160, F1 = H - (players === 2 ? 100 : 74);
  const fy = (f) => Math.round(F0 + f * (F1 - F0));
  const n = SEATS[players];
  const mx = portrait ? (n === 4 ? 100 : 140) : (n === 4 ? 230 : 330);
  L.seats = Array.from({ length: n }, (_, i) => ({ x: Math.round(mx + i * (W - 2 * mx) / (n - 1)), cust: null, wait: 0.4 + i * 1.3 }));
  L.custH = portrait ? Math.round(clamp(H * 0.12, 168, 196)) : 180;
  L.chefH = portrait ? 156 : 166;
  L.custY = L.counterY - 4;           // 손님 발 (계산대 뒤에 가려짐)
  L.door = { x: -70, y: L.custY };
  const box = (amount, x, y, owner = 0) => ({ kind: 'box', amount, x, y, w: 132, h: 100, owner });
  const stove = (x, y, owner = 0) => ({ kind: 'stove', x, y, w: 156, h: 120, owner, state: 'empty', n: 0, t: 0, cookTime: COOK_TIME });
  const trash = (x, y, owner = 0) => ({ kind: 'trash', x, y, w: 84, h: 92, owner });
  const objs = [], starts = [];
  if (players === 1) {
    if (portrait) {
      objs.push(box(1, 120, fy(0.0)), box(5, 120, fy(0.62)), stove(380, fy(0.05)), stove(590, fy(0.05)), trash(610, fy(0.66)));
      starts.push({ x: 360, y: fy(0.95) });
    } else {
      objs.push(box(1, 140, fy(0.0)), box(5, 140, fy(0.75)), stove(520, fy(0.05)), stove(780, fy(0.05)), trash(1150, fy(0.6)));
      starts.push({ x: 650, y: fy(0.9) });
    }
  } else {
    const mirror = (o) => ({ ...o, x: W - o.x, owner: 1 });
    let mine;
    if (portrait) {
      mine = [box(1, 82, fy(0.0)), box(5, 82, fy(0.42)), stove(262, fy(0.02)), stove(262, fy(0.48)), trash(86, fy(0.86))];
      starts.push({ x: 220, y: fy(0.95) }, { x: W - 220, y: fy(0.95) });
    } else {
      mine = [box(1, 82, fy(0.0)), box(5, 82, fy(0.75)), stove(268, fy(0.05)), stove(458, fy(0.05)), trash(560, fy(0.7))];
      starts.push({ x: 330, y: fy(0.9) }, { x: W - 330, y: fy(0.9) });
    }
    mine.forEach((o) => { o.owner = 0; objs.push(o); });
    mine.forEach((o) => objs.push(mirror(o)));
    objs.forEach((o) => { if (o.kind === 'stove') { o.state = 'empty'; o.n = 0; o.t = 0; } });
  }
  // 요리사가 서서 일하는 자리: 물건 바로 뒤 (화덕 뒤에 선 요리사처럼 물건이 다리를 가린다)
  objs.forEach((o) => { o.use = { x: o.x, y: o.y - o.h / 2 + 26 }; });
  L.objs = objs;
  L.starts = starts;
  L.deliverY = L.counterY + 140;   // 배달할 때 서는 곳 (계산대 앞)
  L.minY = L.counterY + 120;
  return L;
}

class KitchenGame {
  constructor() {
    this.stage = $('#stage');
    this.canvas = $('#scene');
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this.coins = store.load('nyang.coins', 0);
    this.players = store.load('kitchen.players', 1) === 2 ? 2 : 1;
    this.state = 'menu';
    this.chefs = [];
    this.customers = [];
    this.floats = [];
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

  // ── 화면 맞춤 (다른 게임과 같은 방식) ─────────────────────
  fit() {
    const { l, r, t, b } = safeInsets();
    const area = visibleArea();
    const vw = Math.max(1, area.w - l - r), vh = Math.max(1, area.h - t - b);
    const portrait = vh > vw;
    const height = portrait ? clamp(Math.round(720 * vh / vw), 1100, 1640) : 800;
    if (portrait !== PORTRAIT || height !== H || !this.laidOut) {
      PORTRAIT = portrait;
      W = portrait ? 720 : 1280;
      H = height;
      this.laidOut = true;
      this.stage.classList.toggle('portrait', portrait);
      this.stage.style.width = `${W}px`;
      this.stage.style.height = `${H}px`;
      this.relayout();
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

  // 화면을 돌리면 배치를 새로 잡되, 불 위의 만두·손님·든 것은 그대로
  relayout() {
    const old = this.L;
    this.L = makeLayout(this.players, PORTRAIT);
    if (!old) return;
    const oldStoves = old.objs.filter((o) => o.kind === 'stove');
    this.L.objs.filter((o) => o.kind === 'stove').forEach((o, i) => {
      const s = oldStoves[i];
      if (s) { o.state = s.state; o.n = s.n; o.t = s.t; }
    });
    this.L.seats.forEach((seat, i) => {
      const s = old.seats[i];
      if (s) { seat.cust = s.cust; seat.wait = s.wait; }
    });
    for (const c of this.customers) {
      const seat = this.L.seats[c.seatIdx];
      if (seat && c.state !== 'walkin' && c.state !== 'leave') c.x = seat.x;
      c.y = this.L.custY;
    }
    this.chefs.forEach((ch, i) => {
      const st = this.L.starts[i] || this.L.starts[0];
      ch.x = st.x; ch.y = st.y; ch.target = null; ch.queue = [];
    });
  }

  // ── 입력 ────────────────────────────────────────────
  bindUI() {
    document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      this.tap((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
    });
    document.querySelectorAll('.player-pick').forEach((b) => b.addEventListener('click', () => {
      sfx.tap();
      this.players = Number(b.dataset.players);
      store.save('kitchen.players', this.players);
      this.renderPlayers();
    }));
    this.renderPlayers();
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

  renderPlayers() {
    document.querySelectorAll('.player-pick').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.players) === this.players)));
    $('#menu').classList.toggle('duo', this.players === 2);
    if (this.state === 'menu') this.L = makeLayout(this.players, PORTRAIT);
  }

  renderCoins() { $('#coin-count').textContent = this.coins; }

  addCoins(n) {
    this.coins += n;
    this.earned += n;
    store.save('nyang.coins', this.coins);
    this.renderCoins();
    const c = $('#coins');
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    sfx.coin();
  }

  // ── 화면 전환 ────────────────────────────────────────
  showMenu() {
    this.state = 'menu';
    this.runId = (this.runId || 0) + 1;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.L = makeLayout(this.players, PORTRAIT);
    this.chefs = [];
    this.customers = [];
    this.floats = [];
    $('#menu').hidden = false;
    $('#result').hidden = true;
    $('#banner').hidden = true;
    for (const id of ['#clock', '#served', '#combo', '#btn-home']) $(id).hidden = true;
  }

  start(mode) {
    this.mode = mode;
    this.runId = (this.runId || 0) + 1;
    this.state = 'play';
    this.clock = SHIFT;
    this.served = 0;
    this.earned = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.fever = 0;
    this.pool = [];
    this.bag = [];
    this.lastSpeak = -10;
    this.floats = [];
    this.customers = [];
    this.L = makeLayout(this.players, PORTRAIT);
    this.chefs = this.L.starts.slice(0, this.players).map((s, p) => ({
      p, ...CHEFS[p], x: s.x, y: s.y, flip: false, carry: null, target: null, queue: [],
      mood: 'idle', moodT: 0, walking: false, served: 0, say: null, sayT: 0,
    }));
    $('#menu').hidden = true;
    $('#result').hidden = true;
    $('#banner').hidden = true;
    $('#clock').hidden = false;
    $('#served').hidden = false;
    $('#btn-home').hidden = false;
    $('#served-count').textContent = 0;
    this.renderCombo();
    this.renderClock();
    speak(this.players === 2 ? '냥냥 주방 문 열었어요! 둘이 힘을 모아요!' : '냥냥 주방 문 열었어요!');
  }

  // ── 누르기 → 요리사에게 일 시키기 ─────────────────────
  tap(x, y) {
    if (this.state !== 'play') return;
    const pt = { x, y };
    // 1) 요리사가 든 쟁반 (생만두를 하나 내려놓기 — 너무 많이 집었을 때)
    for (const ch of this.chefs) {
      const r = ch.carry && ch.trayRect;
      if (r && x > r.x - 10 && x < r.x + r.w + 30 && y > r.y - 20 && y < r.y + r.h + 10) {
        if (!ch.carry.cooked) {
          ch.carry.n -= 1;
          this.float(ch.x, r.y - 10, '-1', '#ff8fab');
          sfx.tap();
          if (ch.carry.n <= 0) ch.carry = null;
        }
        return;
      }
    }
    // 2) 주방 물건
    for (const o of this.L.objs) {
      if (Math.abs(x - o.x) < o.w / 2 + 14 && Math.abs(y - o.y) < o.h / 2 + 20) {
        const ch = this.chefs[o.owner];
        if (ch) this.useObject(ch, o);
        return;
      }
    }
    // 3) 손님 (말풍선이나 몸)
    for (const c of this.customers) {
      if (c.state !== 'wait') continue;
      const b = c.bubble;
      const onBubble = b && x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 16;
      const onBody = Math.abs(x - c.x) < 60 && y > c.y - this.L.custH && y < c.y + 30;
      if (onBubble || onBody) { this.tapCustomer(c, pt); return; }
    }
  }

  // 줄 서 있는 일을 다 하고 나면 손에 뭘 들고 있을지 (누를 때 판단용)
  futureCarry(ch) {
    let c = ch.carry ? { ...ch.carry } : null;
    for (const task of [ch.target, ...ch.queue]) {
      if (!task) continue;
      if (task.act === 'grab') c = c && c.cooked ? c : { n: Math.min(CAP, (c ? c.n : 0) + task.n), cooked: false };
      else if (task.act === 'cook' || task.act === 'trash' || task.act === 'deliver') c = null;
      else if (task.act === 'pick') c = { n: task.obj.n, cooked: true };
    }
    return c;
  }

  useObject(ch, o) {
    const idle = !ch.target && !ch.queue.length;
    const carry = this.futureCarry(ch);
    if (o.kind === 'box') {
      if (carry && carry.cooked) { this.chefSay(ch, '구운 만두부터 배달해요!'); return; }
      if (idle && dist(ch, o.use) < 14) { this.grab(ch, o, o.amount); return; }
      this.goTo(ch, o.use, { act: 'grab', obj: o, n: o.amount });
    } else if (o.kind === 'stove') {
      const queued = [ch.target, ...ch.queue].some((t) => t && t.obj === o);
      if (o.state === 'empty' && !queued) {
        if (!carry || carry.cooked) { this.chefSay(ch, carry ? '손이 꽉 찼어요' : '만두를 먼저 담아요'); return; }
        this.goTo(ch, o.use, { act: 'cook', obj: o });
      } else if (o.state === 'done' && !queued) {
        if (carry) { this.chefSay(ch, '손이 꽉 찼어요'); return; }
        this.goTo(ch, o.use, { act: 'pick', obj: o });
      } else {
        this.chefSay(ch, o.state === 'cooking' ? '지글지글 굽는 중!' : '벌써 가는 중!');
      }
    } else if (o.kind === 'trash') {
      if (!carry) return;
      this.goTo(ch, o.use, { act: 'trash', obj: o });
    }
  }

  tapCustomer(c, pt) {
    // 구운 접시를 든 요리사가 배달 (둘 다 들었으면 수가 맞는 쪽 → 아니면 가까운 쪽)
    const holders = this.chefs.filter((ch) => ch.carry && ch.carry.cooked);
    let ch = null;
    if (holders.length === 1) ch = holders[0];
    else if (holders.length > 1) {
      ch = holders.find((h) => h.carry.n === c.p.answer) || holders.slice().sort((a, b) => Math.abs(a.x - pt.x) - Math.abs(b.x - pt.x))[0];
    }
    if (ch && [ch.target, ...ch.queue].some((t) => t && t.act === 'deliver')) ch = null;
    if (!ch) {
      // 아무도 구운 만두가 없으면 주문을 읽어 준다
      this.say(this.problemWords(c.p), true);
      c.shakeT = 0.3;
      const raw = this.chefs.find((h) => h.carry && !h.carry.cooked);
      if (raw) this.chefSay(raw, '먼저 불에 구워요!');
      return;
    }
    this.goTo(ch, { x: clamp(c.x, 60, W - 60), y: this.L.deliverY }, { act: 'deliver', cust: c });
  }

  // 할 일을 줄 세운다: 걷는 중에 눌러도 순서대로 (같은 상자를 연달아 누르면 한 번에 모아 집기)
  goTo(ch, pos, task) {
    const last = ch.queue.length ? ch.queue[ch.queue.length - 1] : ch.target;
    if (task.act === 'grab' && last && last.act === 'grab' && last.obj === task.obj) { last.n += task.n; sfx.tap(); return; }
    if (ch.queue.length >= 4) { this.chefSay(ch, '하나씩 천천히!'); return; }
    const t = { x: pos.x, y: Math.max(this.L.minY, pos.y), ...task };
    if (!ch.target) ch.target = t; else ch.queue.push(t);
    sfx.tap();
  }

  // ── 도착해서 하는 일 ──────────────────────────────────
  arrive(ch, task) {
    const o = task.obj;
    if (task.act === 'grab') this.grab(ch, o, task.n);
    else if (task.act === 'cook') {
      if (o.state !== 'empty' || !ch.carry || ch.carry.cooked) return;
      o.state = 'cooking'; o.n = ch.carry.n; o.t = 0;
      ch.carry = null;
      sfx.machine();
      this.float(o.x, o.y - o.h / 2 - 10, '지글지글', '#ff9a3c', 26);
    } else if (task.act === 'pick') {
      if (o.state !== 'done' || ch.carry) return;
      ch.carry = { n: o.n, cooked: true };
      o.state = 'empty'; o.n = 0; o.t = 0;
      sfx.hop();
    } else if (task.act === 'trash') {
      if (!ch.carry) return;
      ch.carry = null;
      sfx.give();
      this.float(o.x, o.y - o.h / 2 - 10, '쏙!', '#5ccf95', 28);
    } else if (task.act === 'deliver') {
      this.deliver(ch, task.cust);
    }
  }

  grab(ch, o, n) {
    if (!ch.carry) ch.carry = { n: 0, cooked: false };
    if (ch.carry.cooked) return;
    const add = Math.min(n, CAP - ch.carry.n);
    if (add <= 0) { this.chefSay(ch, '20개까지만 들 수 있어요'); return; }
    ch.carry.n += add;
    sfx.pop(Math.min(ch.carry.n, 12));
    this.float(o.x + (Math.random() - 0.5) * 30, o.y - o.h / 2, `+${add}`, '#ffd65c', 30);
  }

  deliver(ch, c) {
    if (!ch.carry || !ch.carry.cooked) return;
    if (c.state !== 'wait') { this.chefSay(ch, '다른 손님에게 줘요'); return; }
    const n = ch.carry.n;
    if (n !== c.p.answer) {
      // 벌 없음 — 접시는 그대로 들고 있고, 다른 손님에게 주거나 버리고 다시
      sfx.oops();
      c.shakeT = 0.5;
      c.mood = 'sad'; c.moodT = 1.2;
      ch.mood = 'sad'; ch.moodT = 1;
      this.combo = 0;
      this.renderCombo();
      this.float(c.x, c.y - 70, `${n}개는 아니에요!`, '#ff8fab', 28);
      this.say(`이건 ${n}개예요. 주문을 다시 볼까요?`, true);
      return;
    }
    // 성공!
    ch.carry = null;
    ch.served += 1;
    ch.mood = 'happy'; ch.moodT = 1.4;
    this.served += 1;
    $('#served-count').textContent = this.served;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const fast = c.patience / c.patienceMax > 0.5;
    let coins = 2 + (fast ? 1 : 0) + (c.vip ? 3 : 0);
    if (this.fever > 0) coins *= 2;
    if (this.combo > 0 && this.combo % FEVER_COMBO === 0) {
      this.fever = FEVER_TIME;
      this.banner('🔥 피버 타임! 코인 2배', 1.6);
      sfx.fanfare();
    } else {
      sfx.correct();
    }
    this.renderCombo();
    this.addCoins(coins);
    this.float(c.x, c.y - 90, `+${coins}`, '#ffd23f', 40);
    c.state = 'eat'; c.t = 0; c.mood = 'happy'; c.plateN = n;
    this.say(pick(['딩동댕!', '맛있겠다!', '고마워요!', '냠냠!']), true);
  }

  chefSay(ch, text) {
    ch.say = text; ch.sayT = 1.6;
    sfx.oops();
  }

  float(x, y, text, color, size = 30) { this.floats.push({ x, y, text, color, size, age: 0, life: 1.1 }); }

  banner(text, sec) {
    const b = $('#banner');
    b.textContent = text;
    b.hidden = false;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    const run = this.runId;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { if (run === this.runId && this.state === 'play') b.hidden = true; }, sec * 1000);
  }

  // 다른 말과 겹치지 않게 (force 면 바로)
  say(text, force = false) {
    if (!force && this.time - this.lastSpeak < 2.5) return;
    this.lastSpeak = this.time;
    speak(text);
  }

  problemWords(p) {
    if (p.mode === 'ten') return `${p.a} 더하기 몇은 10?`;
    return `${p.a} ${OP_WORD[p.mode]} ${p.b}는?`;
  }

  // ── 손님 ────────────────────────────────────────────
  nextProblem() {
    const busy = new Set(this.customers.filter((c) => c.state === 'wait' || c.state === 'walkin').map((c) => c.p.answer));
    for (let tries = 0; tries < 3; tries++) {
      if (this.pool.length < 4) this.pool.push(...makeProblemSet(this.mode, LEVEL[this.mode], 12, 1));
      // 기다리는 손님끼리 답이 겹치지 않게 (어느 손님 접시인지 헷갈리지 않게)
      const i = this.pool.findIndex((p) => !busy.has(p.answer) && p.answer >= 1 && p.answer <= CAP);
      if (i >= 0) return this.pool.splice(i, 1)[0];
      this.pool = [];
    }
    return null;
  }

  spawnCustomer(seatIdx) {
    const p = this.nextProblem();
    if (!p) return false;
    if (!this.bag.length) this.bag = shuffle([...FEATURED_CUSTOMERS]);
    const c = {
      key: this.bag.pop(), seatIdx, p,
      x: this.L.door.x, y: this.L.custY,
      state: 'walkin', t: 0, mood: 'walk', moodT: 0,
      patience: PATIENCE, patienceMax: PATIENCE, vip: Math.random() < VIP_RATE,
      bubbleT: 0, shakeT: 0, phase: Math.random() * 10, bubble: null, plateN: 0,
    };
    this.L.seats[seatIdx].cust = c;
    this.customers.push(c);
    return true;
  }

  // ── 루프 ────────────────────────────────────────────
  update(dt) {
    this.time += dt;
    for (const f of this.floats) f.age += dt;
    this.floats = this.floats.filter((f) => f.age < f.life);
    if (this.state !== 'play') return;

    this.clock -= dt;
    this.renderClock();
    if (this.fever > 0) { this.fever -= dt; if (this.fever <= 0) this.renderCombo(); }

    // 빈자리에 손님 들이기
    this.L.seats.forEach((seat, i) => {
      if (seat.cust) return;
      seat.wait -= dt;
      if (seat.wait <= 0 && this.clock > 8) { if (!this.spawnCustomer(i)) seat.wait = 1; }
    });

    // 손님 움직임
    for (const c of this.customers) {
      c.t += dt;
      if (c.shakeT > 0) c.shakeT -= dt;
      if (c.moodT > 0) { c.moodT -= dt; if (c.moodT <= 0 && c.state === 'wait') c.mood = 'idle'; }
      const seat = this.L.seats[c.seatIdx];
      if (c.state === 'walkin') {
        c.x += CUST_SPEED * dt;
        if (c.x >= seat.x) {
          c.x = seat.x; c.state = 'wait'; c.mood = 'idle'; c.bubbleT = 0;
          sfx.hop();
          this.say(`${c.vip ? '귀한 손님! ' : ''}${this.problemWords(c.p)}`);
        }
      } else if (c.state === 'wait') {
        c.bubbleT += dt;
        c.patience = Math.max(0, c.patience - dt);
        if (c.moodT <= 0) c.mood = c.patience / c.patienceMax > 0.2 ? 'idle' : 'eat';   // 오래 기다리면 꼼지락 (떠나지 않아요)
      } else if (c.state === 'eat') {
        if (c.t > 1.8) { c.state = 'leave'; c.mood = 'walk'; seat.cust = null; seat.wait = 1.2; }
      } else if (c.state === 'leave') {
        c.x -= CUST_SPEED * dt;
      }
    }
    this.customers = this.customers.filter((c) => !(c.state === 'leave' && c.x < this.L.door.x));

    // 요리사 걷기
    for (const ch of this.chefs) {
      if (ch.moodT > 0) { ch.moodT -= dt; if (ch.moodT <= 0) ch.mood = 'idle'; }
      if (ch.sayT > 0) ch.sayT -= dt;
      ch.walking = false;
      if (!ch.target && ch.queue.length) ch.target = ch.queue.shift();
      const tg = ch.target;
      if (!tg) continue;
      const dx = tg.x - ch.x, dy = tg.y - ch.y;
      const d = Math.hypot(dx, dy);
      const step = CHEF_SPEED * dt;
      if (Math.abs(dx) > 2) ch.flip = dx < 0;
      if (d <= step) {
        ch.x = tg.x; ch.y = tg.y;
        ch.target = null;
        this.arrive(ch, tg);
      } else {
        ch.x += dx / d * step; ch.y += dy / d * step;
        ch.walking = true;
      }
    }

    // 굽기
    for (const o of this.L.objs) {
      if (o.kind !== 'stove' || o.state !== 'cooking') continue;
      o.t += dt;
      if (o.t >= o.cookTime) { o.state = 'done'; o.t = 0; sfx.count(10); }
    }

    if (this.clock <= 0) this.finish();
  }

  renderClock() {
    const s = Math.max(0, Math.ceil(this.clock));
    $('#clock-text').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('#clock').classList.toggle('hurry', s <= 20);
  }

  renderCombo() {
    const el = $('#combo');
    const fever = this.fever > 0;
    el.hidden = !fever && this.combo < 2;
    el.classList.toggle('fever', fever);
    el.textContent = fever ? '🔥 피버 ×2' : `콤보 ${this.combo}`;
  }

  // ── 그리기 ──────────────────────────────────────────
  draw() {
    const ctx = this.ctx;
    const t = this.time;
    const L = this.L;
    if (!L) return;
    ctx.clearRect(0, 0, W, H);
    D.drawRoom(ctx, W, H, L, t);

    // 손님 (계산대 뒤)
    const custs = this.customers.slice().sort((a, b) => a.x - b.x);
    for (const c of custs) {
      const anim = c.state === 'walkin' || c.state === 'leave' ? 'walk' : c.state === 'eat' ? 'happy' : c.mood;
      drawCharacter(ctx, c.key, anim, t + c.phase, c.x, c.y, L.custH * (c.vip ? 1.06 : 1), c.state === 'leave');
    }
    D.drawCounter(ctx, W, L);
    for (const c of custs) if (c.state === 'eat') D.drawPlate(ctx, c.x, L.counterY - 34, c.plateN);
    // 말풍선 (맨 위)
    const seatGap = L.seats.length > 1 ? L.seats[1].x - L.seats[0].x : 300;
    for (const c of custs) {
      if (c.state === 'wait' || c.state === 'eat') c.bubble = D.drawOrder(ctx, c.x, c.y - L.custH - 6, seatGap - 12, c, t);
      else c.bubble = null;
    }

    if (this.players === 2 && this.state !== 'menu') D.drawDivider(ctx, W, H, L, PORTRAIT);

    // 안내 손가락이 가리킬 곳
    const hints = this.state === 'play' ? this.chefs.map((ch) => this.hintFor(ch)) : [];
    const glowing = new Set(hints.map((h) => h && h.obj).filter(Boolean));

    // 물건과 요리사를 앞뒤(발 높이) 순서로 — 물건 뒤에 선 요리사는 다리가 가려진다
    const items = [
      ...L.objs.map((o) => ({ y: o.y + o.h / 2, o })),
      ...this.chefs.map((ch) => ({ y: ch.y, ch })),
    ].sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.o) {
        const o = it.o;
        if (o.kind === 'box') D.drawBox(ctx, o, t, glowing.has(o));
        else if (o.kind === 'stove') D.drawStove(ctx, o, t, glowing.has(o));
        else D.drawTrash(ctx, o);
      } else {
        const ch = it.ch;
        D.drawFootRing(ctx, ch.x, ch.y, ch.ring);
        drawCharacter(ctx, ch.key, ch.walking ? 'walk' : ch.mood, t, ch.x, ch.y, L.chefH, ch.flip);
      }
    }
    const chefs = this.chefs;
    if (this.players === 2) for (const ch of chefs) D.drawTag(ctx, ch.x, ch.y - L.chefH + 4, `${ch.p + 1}P`, ch.ring, 18);
    for (const ch of chefs) {
      ch.trayRect = ch.carry ? D.drawCarry(ctx, ch.x, ch.y - L.chefH - 8, ch.carry, t) : null;
      if (ch.sayT > 0) D.drawTag(ctx, ch.x, ch.y - L.chefH - (ch.carry ? 110 : 16), ch.say, '#fff', 22);
    }

    // 처음 몇 번은 다음에 누를 곳 안내
    hints.forEach((h, i) => {
      if (!h) return;
      const ch = this.chefs[i];
      if (h.obj) D.drawFinger(ctx, h.obj.x, h.obj.y - h.obj.h / 2 - 14, t + i);
      if (h.text && ch.sayT <= 0 && !ch.walking) D.drawTag(ctx, ch.x, ch.y - L.chefH - (ch.carry ? 110 : 16), h.text, '#fff3c4', 20);
    });

    for (const f of this.floats) D.drawFloat(ctx, f);
  }

  // 지금 할 일 안내 (배달 성공 HINT_UNTIL 번까지)
  hintFor(ch) {
    if (ch.served >= HINT_UNTIL || ch.target || ch.queue.length) return null;
    const mine = this.L.objs.filter((o) => o.owner === ch.p);
    const stoves = mine.filter((o) => o.kind === 'stove');
    if (ch.carry && ch.carry.cooked) return { text: '알맞은 손님을 눌러 배달!' };
    const done = stoves.find((o) => o.state === 'done');
    if (done && !ch.carry) return { obj: done, text: '다 구웠어요! 팬을 눌러요' };
    if (ch.carry) {
      const free = stoves.find((o) => o.state === 'empty');
      return free ? { obj: free, text: '주문만큼 담았으면 불에 올려요' } : null;
    }
    if (stoves.some((o) => o.state === 'cooking')) return null;
    return { obj: mine.find((o) => o.kind === 'box' && o.amount === 1), text: '상자를 눌러 만두를 담아요' };
  }

  finish() {
    this.state = 'over';
    const run = this.runId;
    for (const ch of this.chefs) { ch.target = null; ch.queue = []; }
    sfx.fanfare();
    this.banner('영업 끝! 🛎', 2);
    speak('영업 끝! 수고했어요!');
    setTimeout(() => { if (run === this.runId) this.showResult(); }, 1900);
  }

  showResult() {
    $('#banner').hidden = true;
    const box = $('#result');
    const stars = STAR_AT[this.players].filter((n) => this.served >= n).length;
    const starBox = box.querySelector('.stars');
    starBox.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = i < stars ? '' : 'off';
      s.textContent = '⭐';
      s.style.animationDelay = `${0.15 * i}s`;
      starBox.append(s);
    }
    box.querySelector('.served-line').textContent = `만두 ${this.served}접시 배달 완료!`;
    const team = box.querySelector('.team-line');
    team.hidden = this.players !== 2;
    team.textContent = this.players === 2 ? `${this.chefs.map((c) => `${c.name} ${c.served}접시`).join(' · ')} — 최고의 팀!` : '';
    // 모드·인원별 최고 기록
    const key = `kitchen.best.${this.players}.${this.mode}`;
    const best = store.load(key, 0);
    const bestLine = box.querySelector('.best-line');
    if (this.served > best) {
      store.save(key, this.served);
      bestLine.textContent = best > 0 ? `🎉 새 기록! (전에는 ${best}접시)` : '🎉 첫 기록!';
    } else {
      bestLine.textContent = `최고 기록 ${best}접시${this.bestCombo >= 3 ? ` · 최고 콤보 ${this.bestCombo}` : ''}`;
    }
    box.querySelector('.earned').textContent = `코인 +${this.earned}`;
    box.hidden = false;
  }
}

const go = () => {
  const game = new KitchenGame();
  if (new URLSearchParams(location.search).has('debug')) window.__game = game;   // 테스트용
};
const fontReady = document.fonts && document.fonts.load
  ? Promise.race([document.fonts.load('40px Jua'), new Promise((r) => setTimeout(r, 1500))])
  : Promise.resolve();
const sheets = [...new Set([...FEATURED_CUSTOMERS, 'nyang'].map((k) => CHARACTERS[k].sprite)), 'penguin'];
Promise.all([fontReady, loadSprites(sheets)]).finally(go);
