// 냥냥 사탕 공장 — 게임 흐름, 장면 그리기, 입력 처리
import { loadSprites } from './sprites.js';
import { Actor, wait } from './actor.js';
import { CUSTOMER_KEYS, OUTLINE } from './characters.js';
import { sfx, speak, unlockAudio, isMuted, setMuted } from './audio.js';
import { makeProblemSet, orderText, questionText } from './problems.js';
import { solutionSteps } from './work.js';

// ── 무대 배치 (논리 좌표) ─────────────────────────────────
// 가로(태블릿·PC·가로 폰): 1280×800 한 줄 무대 — 기계 · 고양이 · 카운터 · 손님
// 세로(폰·세로 태블릿): 폭 720 — 위에서부터 주문서+손님 / 카운터와 봉지 / 공장 바닥(기계·고양이)
let W, H, FLOOR, CFLOOR, CAT_HOME, CUSTOMER_SPOT, TABLE, MACHINE, TRAY, PORTRAIT;
const PORTRAIT_W = 720;
const PORTRAIT_H = { min: 1180, max: 1640 };

function setLayout(portrait, height) {
  PORTRAIT = portrait;
  if (!portrait) {
    W = 1280; H = 800;
    FLOOR = 660;                 // 고양이·기계가 서는 바닥
    CFLOOR = FLOOR;              // 손님이 서는 바닥
    CAT_HOME = 305;
    CUSTOMER_SPOT = 1110;
    TABLE = { x0: 390, x1: 980, top: 560, bottom: FLOOR };
    MACHINE = { x: 130 };
    TRAY = { x: 140, y: 500 };
  } else {
    W = PORTRAIT_W; H = height;
    // 길쭉한 폰일수록 남는 높이는 카운터 위아래로 나눠 준다
    const extra = H - PORTRAIT_H.min;
    const tableTop = 640 + Math.round(extra * 0.35);
    FLOOR = H - 160;
    CFLOOR = 380;
    CAT_HOME = 340;
    CUSTOMER_SPOT = 590;
    TABLE = { x0: 24, x1: 696, top: tableTop, bottom: tableTop + 60 };
    MACHINE = { x: 100 };
    TRAY = { x: 128, y: FLOOR - 160 };
  }
  Actor.stageW = W;
}
setLayout(false, 800);
const SLOT = 40;
const CANDY_R = 16;
const ROUNDS = 5;
// 봉지 속 사탕은 대각선으로 눕혀 포장 끝이 서로 겹치지 않게 (배지는 오른쪽 위)
const BAG_CANDY_ROT = Math.PI / 4;

const CANDY = {
  strawberry: '#ff6b8b',
  grape: '#a77bf3',
  palette: ['#ff6b8b', '#ffb347', '#5ccf95', '#5bc0f8', '#a77bf3', '#ffd84d'],
};
const BAG = { pink: '#ffc9d6', purple: '#dccbff', kraft: '#f1d3a6', mint: '#c6f0dc', sky: '#c9e8ff', lemon: '#fff0b3' };
const BAG_CYCLE = [BAG.kraft, BAG.mint, BAG.sky, BAG.pink, BAG.lemon];
const OP_WORD = { add: '더하기', sub: '빼기', mul: '곱하기', div: '나누기', ten: '더하기' };

const ABORT = Symbol('abort');

// 구형 Safari용 roundRect 대체
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
const $ = (s) => document.querySelector(s);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
// 톡 튀어나오는 크기 (0 → 1.1 → 1)
const popScale = (age) => age <= 0 ? 0 : age >= 0.35 ? 1 : easeOutBack(age / 0.35);

// ── 저장 ────────────────────────────────────────────────
const store = {
  load(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
};

class Game {
  constructor() {
    this.canvas = $('#scene');
    this.ctx = this.canvas.getContext('2d');
    this.stage = $('#stage');
    this.time = 0;
    this.token = 0;
    this.coins = store.load('nyang.coins', 0);
    this.level = store.load('nyang.level', 'picture');
    this.diff = store.load('nyang.diff', 1);

    this.customer = null;
    this.resetScene();
    // 주소 끝에 ?debug 를 붙이면 화면 크기 정보를 보여 준다 (기기별 문제 확인용)
    if (/[?&]debug\b/.test(location.search)) {
      this.debugBox = document.createElement('pre');
      this.debugBox.id = 'debug';
      document.body.appendChild(this.debugBox);
    }
    this.fit();
    this.cat = new Actor('nyang', CAT_HOME, FLOOR, { facing: 'right', speed: 300 });

    this.bindUI();
    const refit = () => this.fit();
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', () => setTimeout(refit, 250));
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', refit);
      window.visualViewport.addEventListener('scroll', refit);
    }
    // 일부 모바일 브라우저는 처음 크기를 늦게 알려 준다
    window.addEventListener('load', refit);
    window.addEventListener('pageshow', refit);
    setTimeout(refit, 300);
    setTimeout(refit, 1200);
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

  resetScene() {
    this.bags = [];
    this.signs = [];
    this.tray = null;
    this.fillOrder = [];
    this.flyers = [];
    this.particles = [];
    this.interaction = null;
    this.handTarget = null;
    this.lastTap = 0;
    this.showMachine = true;
    this.machineWobble = 0;
    this.plusSign = false;
  }

  // ── 화면 맞춤 ──────────────────────────────────────────
  // 화면 크기·방향에 맞춰 무대를 고르고 확대/축소한다 (노치 등 안전 영역 제외)
  fit() {
    const cs = getComputedStyle(document.documentElement);
    const inset = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
    const l = inset('--sal'), r = inset('--sar'), t = inset('--sat'), b = inset('--sab');
    const area = this.visibleArea();
    const vw = Math.max(1, area.w - l - r);
    const vh = Math.max(1, area.h - t - b);

    const portrait = vh > vw;
    const height = portrait
      ? Math.max(PORTRAIT_H.min, Math.min(PORTRAIT_H.max, Math.round(PORTRAIT_W * vh / vw)))
      : 800;
    if (portrait !== PORTRAIT || height !== H || !this.laidOut) {
      const oldW = W;
      setLayout(portrait, height);
      this.laidOut = true;
      this.stage.classList.toggle('portrait', portrait);
      this.stage.style.width = `${W}px`;
      this.stage.style.height = `${H}px`;
      this.relayout(oldW);
    }

    const s = Math.min(vw / W, vh / H);
    this.scale = s;
    const x = area.x + l + (vw - W * s) / 2;
    const y = area.y + t + (vh - H * s) / 2;
    this.stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;

    // 캔버스 해상도는 바뀔 때만 다시 잡는다 (스크롤 이벤트마다 지우지 않게)
    const k = Math.min(2.5, Math.max(1, s * (window.devicePixelRatio || 1)));
    const cw = Math.round(W * k), ch = Math.round(H * k);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.stage.classList.add('ready');
    if (this.debugBox) this.showDebug(area, s);
  }

  // 실제로 눈에 보이는 영역 (CSS px, 페이지 기준 좌표).
  // 삼성 인터넷 등은 레이아웃 뷰포트를 보이는 화면보다 크게 알려 줄 때가 있어서
  // 고정 요소(body)의 실제 크기·visualViewport·innerWidth 중 가장 작은 값을 쓴다.
  visibleArea() {
    const de = document.documentElement;
    const br = document.body.getBoundingClientRect();
    const ws = [br.width, de.clientWidth, window.innerWidth].filter((v) => v > 0);
    const hs = [br.height, de.clientHeight, window.innerHeight].filter((v) => v > 0);
    let w = Math.min(...ws), h = Math.min(...hs), x = 0, y = 0;
    const vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) {
      w = Math.min(w, vv.width);
      h = Math.min(h, vv.height);
      x = vv.offsetLeft || 0;
      y = vv.offsetTop || 0;
    }
    return { w, h, x, y };
  }

  showDebug(area, s) {
    const vv = window.visualViewport;
    const br = document.body.getBoundingClientRect();
    const f = (n) => (Math.round(n * 100) / 100);
    this.debugBox.textContent = [
      `inner ${innerWidth}×${innerHeight}`,
      `client ${document.documentElement.clientWidth}×${document.documentElement.clientHeight}`,
      `body ${f(br.width)}×${f(br.height)}`,
      vv ? `vv ${f(vv.width)}×${f(vv.height)} s${f(vv.scale)} @${f(vv.offsetLeft)},${f(vv.offsetTop)}` : 'vv 없음',
      `screen ${screen.width}×${screen.height} dpr ${f(devicePixelRatio)}`,
      `use ${f(area.w)}×${f(area.h)} → 무대 ${W}×${H} ×${f(s)}`,
      navigator.userAgent,
    ].join('\n');
  }

  // 방향이 바뀌면 진행 중인 장면을 새 배치로 옮긴다
  relayout(oldW) {
    const sx = W / oldW;
    for (const f of this.flyers) if (!f.done) { f.done = true; f.onDone(); }
    this.flyers = [];
    this.particles = [];
    for (const a of [this.cat, this.customer]) {
      if (!a) continue;
      a.x *= sx;
      if (a._move) a._move.x *= sx;
    }
    if (this.cat) {
      this.cat.y = FLOOR;
      if (!this.delivering && !this.cat._move) this.cat.x = CAT_HOME;
    }
    if (this.customer) {
      this.customer.y = CFLOOR;
      if (!this.delivering && !this.customer._move) this.customer.x = CUSTOMER_SPOT;
    }
    this.positionBags();
    this.positionTray();
  }

  toStage(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  // ── UI 연결 ────────────────────────────────────────────
  bindUI() {
    document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
    this.canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = this.toStage(e); this.onTap(p.x, p.y); });

    document.querySelectorAll('.pill[data-level]').forEach((b) => b.addEventListener('click', () => {
      sfx.tap();
      this.level = b.dataset.level;
      store.save('nyang.level', this.level);
      this.renderLevel();
    }));
    this.renderLevel();

    document.querySelectorAll('.diff[data-diff]').forEach((b) => b.addEventListener('click', () => {
      sfx.tap();
      this.diff = Number(b.dataset.diff);
      store.save('nyang.diff', this.diff);
      this.renderLevel();
    }));

    document.querySelectorAll('.mode[data-mode]').forEach((b) => b.addEventListener('click', () => {
      sfx.tap();
      this.run(b.dataset.mode, this.level);
    }));

    $('#btn-home').addEventListener('click', () => { sfx.tap(); this.showMenu(); });
    const snd = $('#btn-sound');
    const renderSnd = () => { snd.textContent = isMuted() ? '🔇' : '🔊'; };
    snd.addEventListener('click', () => { setMuted(!isMuted()); renderSnd(); sfx.tap(); });
    renderSnd();

    $('#result .again').addEventListener('click', () => { sfx.tap(); this.run(this.mode, this.level); });
    $('#result .home').addEventListener('click', () => { sfx.tap(); this.showMenu(); });
  }

  renderLevel() {
    document.querySelectorAll('.pill[data-level]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.level === this.level)));
    document.querySelectorAll('.diff[data-diff]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.diff) === this.diff)));
    // 큰 수는 숫자로만 풀기 때문에 그림/숫자 선택은 1단계(와 10 만들기)에만 쓰인다
    $('#menu').classList.toggle('big-numbers', this.diff > 1);
  }

  renderCoins() { $('#coin-count').textContent = this.coins; }

  addCoins(n, x, y) {
    this.coins += n;
    store.save('nyang.coins', this.coins);
    this.renderCoins();
    const el = document.createElement('div');
    el.className = 'float-coin';
    el.textContent = `+${n}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.stage.appendChild(el);
    setTimeout(() => el.remove(), 1200);
    const c = $('#coins');
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    sfx.coin();
  }

  renderDots() {
    const box = $('#dots');
    box.innerHTML = '';
    for (let i = 0; i < ROUNDS; i++) {
      const d = document.createElement('div');
      const r = this.results[i];
      d.className = 'dot' + (r === 'star' ? ' done' : r === 'ok' ? ' ok' : i === this.round ? ' now' : '');
      d.textContent = r === 'star' ? '⭐' : r === 'ok' ? '✔' : '';
      box.appendChild(d);
    }
  }

  setTip(text) {
    const tip = $('#tip');
    if (!text) { tip.hidden = true; return; }
    tip.textContent = text;
    tip.hidden = false;
    tip.style.animation = 'none'; void tip.offsetWidth; tip.style.animation = '';
  }

  showOrder(p) {
    const o = $('#order');
    o.querySelector('.order-text').textContent = orderText(p);
    const ex = o.querySelector('.order-expr');
    ex.innerHTML = `${p.left}<span class="q">?</span>${p.right}`;
    const len = (p.left + p.right).length + String(p.answer).length;
    ex.classList.toggle('long', len > 11 && len <= 15);
    ex.classList.toggle('xlong', len > 15);
    o.querySelector('.order-q').textContent = '';
    const prog = o.querySelector('.order-progress');
    prog.innerHTML = '';
    if (p.mode === 'sub' && p.level === 'picture') {
      for (let i = 0; i < p.b; i++) prog.appendChild(document.createElement('i'));
    }
    o.hidden = false;
  }

  // ── 화면 전환 ──────────────────────────────────────────
  abort() {
    this.token++;
    this.delivering = false;
    if (this.pending) { const r = this.pending; this.pending = null; r(null); }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  showMenu() {
    this.abort();
    this.resetScene();
    this.customer = null;
    this.cat.carry(null);
    this.cat.moveTo(CAT_HOME).then(() => { this.cat.facing = 'right'; });
    $('#menu').hidden = false;
    $('#result').hidden = true;
    $('#btn-home').hidden = true;
    $('#dots').hidden = true;
    $('#order').hidden = true;
    $('#answers').hidden = true;
    this.hideWork();
    this.setTip(null);
  }

  // 비동기 흐름 도우미: 메뉴로 나가면(토큰 변경) ABORT 로 흐름을 끊는다
  async step(promise) {
    const tk = this.token;
    const v = await promise;
    if (tk !== this.token) throw ABORT;
    return v;
  }
  sleep(s) { return this.step(wait(s)); }
  waitInput() { return this.step(new Promise((r) => { this.pending = r; })); }
  resolveInput(v) { if (this.pending) { const r = this.pending; this.pending = null; r(v); } }

  async run(mode, level) {
    this.abort();
    const token = this.token;
    this.mode = mode;
    this.level = level;
    this.problems = makeProblemSet(mode, level, ROUNDS, this.diff);
    this.results = [];
    this.earned = 0;
    this.round = 0;
    this.lineup = shuffle([...CUSTOMER_KEYS]).slice(0, ROUNDS);
    this.resetScene();
    this.customer = null;
    $('#menu').hidden = true;
    $('#result').hidden = true;
    $('#btn-home').hidden = false;
    $('#dots').hidden = false;
    this.renderDots();
    try {
      await this.step(this.cat.moveTo(CAT_HOME));
      this.cat.facing = 'right';
      for (let i = 0; i < ROUNDS; i++) {
        this.round = i;
        this.renderDots();
        await this.playRound(this.problems[i], this.lineup[i]);
      }
      this.round = ROUNDS;
      this.renderDots();
      await this.showResult();
    } catch (e) {
      if (e !== ABORT) throw e;
    } finally {
      if (token === this.token) this.interaction = null;
    }
  }

  async playRound(p, customerKey) {
    this.resetScene();
    this.problem = p;
    this.firstTry = true;
    this.showMachine = p.mode === 'add' || p.mode === 'mul' || p.mode === 'ten';
    this.hideWork();

    // 손님 등장
    const cust = this.customer = new Actor(customerKey, W + 140, CFLOOR, { facing: 'left', speed: 330 });
    await this.step(cust.moveTo(CUSTOMER_SPOT));
    sfx.hop();
    await this.step(cust.hop(30));
    this.showOrder(p);
    if (p.mode === 'ten' && p.level === 'number') speak(`${p.a} 더하기 몇은 10?`);
    else speak(p.level === 'number' ? `${p.a} ${OP_WORD[p.mode]} ${p.b}는?` : orderText(p));
    await this.sleep(0.5);

    if (p.level === 'picture') {
      this.buildScene(p, false);
      await this.doTask(p);
    }
    await this.answerPhase(p);
    await this.deliver(p);
  }

  // ── 장면 구성 ──────────────────────────────────────────
  // filled=true 면 다 채워진 그림 (숫자 레벨 힌트용)
  buildScene(p, filled) {
    this.bags = [];
    this.signs = [];
    this.tray = null;
    this.fillOrder = [];
    const born = this.time;

    if (p.mode === 'add') {
      const cols = 5;
      const rows = Math.ceil(Math.max(p.a, p.b) / cols);
      this.plusSign = true;
      this.layoutBags([
        { n: p.a, cols, rows, color: BAG.pink, candy: CANDY.strawberry },
        { n: p.b, cols, rows, color: BAG.purple, candy: CANDY.grape },
      ], 70);
      for (const b of this.bags) for (const s of b.slots) this.fillOrder.push(s);
    } else if (p.mode === 'mul') {
      const specs = [];
      for (let g = 0; g < p.b; g++) {
        specs.push({ n: p.a, cols: 2, color: BAG_CYCLE[g % BAG_CYCLE.length], candy: CANDY.palette[(g * 2) % CANDY.palette.length], showTag: true });
      }
      this.layoutBags(specs, 14);
      for (const b of this.bags) for (const s of b.slots) this.fillOrder.push(s);
    } else if (p.mode === 'sub') {
      this.layoutBags([{ n: p.a, cols: 5, color: BAG.kraft, candy: null }], 0);
      const bag = this.bags[0];
      bag.slots.forEach((s, i) => {
        s.candy = { color: pick(CANDY.palette), born: born + i * 0.03 };
        if (filled && i >= p.a - p.b) s.candy.ghost = true;
      });
    } else if (p.mode === 'ten') {
      // 10칸 봉지: 앞 a칸은 이미 딸기 사탕, 나머지를 기계로 포도 사탕 채우기
      this.layoutBags([{ n: 10, cols: 5, rows: 2, color: BAG.pink, candy: CANDY.grape }], 0);
      this.bags[0].slots.forEach((s, i) => {
        if (i < p.a) { s.reserved = true; s.candy = { color: CANDY.strawberry, born: born + i * 0.04 }; }
        else this.fillOrder.push(s);
      });
    } else if (p.mode === 'div') {
      const each = p.a / p.b;
      const specs = [];
      for (let g = 0; g < p.b; g++) specs.push({ n: each, cols: 2, color: BAG_CYCLE[g % BAG_CYCLE.length], hideSlots: true });
      this.layoutBags(specs, 24);
      // 쟁반 → 봉지 순서대로 하나씩 번갈아
      for (let k = 0; k < p.a; k++) this.fillOrder.push(this.bags[k % p.b].slots[Math.floor(k / p.b)]);
      this.tray = this.makeTray(filled ? 0 : p.a);
      this.showMachine = false;
    }

    if (filled) {
      this.fillOrder.forEach((s, i) => {
        s.reserved = true;
        s.candy = { color: s.color || pick(CANDY.palette), born: born + i * 0.04 };
      });
      this.bags.forEach((b, i) => this.updateTag(b, i, born + 0.3));
    }
  }

  // 봉지를 만들고(내용 상태) → positionBags 로 위치를 잡는다(방향이 바뀌면 위치만 다시 계산)
  layoutBags(specs, minGap) {
    this.bagGap = minGap;
    for (const sp of specs) {
      const rows = sp.rows || Math.max(1, Math.ceil(sp.n / sp.cols));
      const bag = { cols: sp.cols, rows, w: sp.cols * SLOT + 28, h: rows * SLOT + 50, color: sp.color, hideSlots: !!sp.hideSlots, showTag: !!sp.showTag, tag: null, tagBorn: 0, wobble: 0, slots: [] };
      for (let i = 0; i < sp.n; i++) bag.slots.push({ bag, i, color: sp.candy, candy: null, reserved: false });
      this.bags.push(bag);
    }
    this.positionBags();
  }

  positionBags() {
    this.signs = [];
    if (!this.bags.length) return;
    const total = this.bags.reduce((s, b) => s + b.w, 0);
    const room = TABLE.x1 - TABLE.x0 - 20;
    // 여유 공간을 나눠 쓰되 minGap*2 를 넘지 않게, 최소 8px
    const n = this.bags.length;
    const gap = n > 1 ? Math.max(8, Math.min(this.bagGap * 2, (room - total) / (n - 1))) : 0;
    let x = (TABLE.x0 + TABLE.x1) / 2 - (total + gap * (n - 1)) / 2;
    for (const bag of this.bags) {
      bag.x = x + bag.w / 2;
      bag.top = TABLE.top - bag.h;
      const gridW = bag.cols * SLOT;
      for (const s of bag.slots) {
        const c = s.i % bag.cols, r = Math.floor(s.i / bag.cols);
        s.x = bag.x - gridW / 2 + SLOT / 2 + c * SLOT;
        s.y = bag.top + 40 + SLOT / 2 + r * SLOT;
      }
      x += bag.w + gap;
    }
    if (this.plusSign && n === 2) {
      const [b0, b1] = this.bags;
      this.signs.push({ x: (b0.x + b0.w / 2 + b1.x - b1.w / 2) / 2, y: TABLE.top - Math.max(b0.h, b1.h) / 2, text: '+' });
    }
  }

  makeTray(n) {
    const candies = [];
    for (let i = 0; i < n; i++) candies.push({ i, color: pick(CANDY.palette), born: this.time + i * 0.03 });
    this.tray = { candies, n0: n, wobble: 0 };
    this.positionTray();
    return this.tray;
  }

  positionTray() {
    if (!this.tray) return;
    const cols = 5, n = this.tray.n0;
    for (const c of this.tray.candies) {
      const col = c.i % cols, r = Math.floor(c.i / cols);
      const rowCount = Math.min(cols, n - r * cols);
      c.x = TRAY.x + (col - (rowCount - 1) / 2) * 34;
      c.y = TRAY.y - 22 - r * 30;
    }
  }

  updateTag(bag, index, born = this.time) {
    if (!bag.showTag || bag.tag) return;
    if (!bag.slots.every((s) => s.candy)) return;
    const last = index === this.bags.length - 1;
    bag.tag = last ? '?' : String(bag.slots.length * (index + 1));
    bag.tagBorn = born;
  }

  // ── 아이가 직접 하는 단계 ─────────────────────────────
  async doTask(p) {
    const tips = {
      add: '👆 사탕 기계를 눌러요!',
      mul: '👆 사탕 기계를 눌러요!',
      sub: `👆 사탕을 눌러서 ${p.b}개 주세요!`,
      div: '👆 쟁반을 눌러 나눠 담아요!',
      ten: '👆 기계를 눌러 10칸을 꽉 채워요!',
    };
    this.setTip(tips[p.mode]);
    this.lastTap = this.time;
    const total = p.mode === 'sub' ? p.b : this.fillOrder.length;
    this.interaction = { type: p.mode === 'sub' ? 'give' : p.mode === 'div' ? 'tray' : 'machine', total, sent: 0, landed: 0 };
    await this.waitInput();
    this.interaction = null;
    this.handTarget = null;
    this.setTip(null);
    await this.sleep(0.35);
  }

  onTap(x, y) {
    const it = this.interaction;
    if (!it) return;
    this.lastTap = this.time;
    if (it.sent >= it.total) return;

    if (it.type === 'machine' && x > MACHINE.x - 95 && x < MACHINE.x + 95 && y > FLOOR - 300 && y < FLOOR) {
      const slot = this.fillOrder[it.sent++];
      slot.reserved = true;
      this.machineWobble = 1;
      sfx.machine();
      if (!this.cat._hop) this.cat.hop(16, 0.3);
      this.fly(MACHINE.x + 34, FLOOR - 92, slot.x, slot.y, slot.color || pick(CANDY.palette), () => {
        slot.candy = { color: slot.color || pick(CANDY.palette), born: this.time };
        slot.bag.wobble = 1;
        sfx.pop(it.landed);
        this.updateTag(slot.bag, this.bags.indexOf(slot.bag));
        this.landed(it);
      });
    } else if (it.type === 'tray' && this.tray && x > TRAY.x - 120 && x < TRAY.x + 120 && y > TRAY.y - 170 && y < FLOOR) {
      const c = this.tray.candies.pop();
      if (!c) return;
      const slot = this.fillOrder[it.sent++];
      slot.reserved = true;
      this.tray.wobble = 1;
      sfx.tap();
      this.fly(c.x, c.y, slot.x, slot.y, c.color, () => {
        slot.candy = { color: c.color, born: this.time };
        slot.bag.wobble = 1;
        sfx.pop(it.landed);
        this.landed(it);
      });
    } else if (it.type === 'give') {
      const bag = this.bags[0];
      let best = null, bestD = 30 * 30;
      for (const s of bag.slots) {
        if (!s.candy || s.candy.ghost) continue;
        const d = (s.x - x) ** 2 + (s.y - y) ** 2;
        if (d < bestD) { best = s; bestD = d; }
      }
      if (!best) return;
      it.sent++;
      const color = best.candy.color;
      best.candy = { ghost: true, color, born: this.time };
      bag.wobble = 0.6;
      sfx.give();
      const cust = this.customer;
      this.fly(best.x, best.y, cust.x - 6, CFLOOR - 112, color, () => {
        cust.play('eat', 0.7);
        cust.say('냠!', 0.6);
        sfx.pop(it.landed + 3);
        const dots = document.querySelectorAll('#order .order-progress i');
        if (dots[it.landed]) dots[it.landed].classList.add('on');
        this.landed(it);
      }, 0.5);
    }
  }

  landed(it) {
    it.landed++;
    if (it.landed >= it.total) setTimeout(() => { if (this.interaction === it) this.resolveInput(true); }, 250);
  }

  // draw 를 주면 사탕 대신 그 그림을 날린다 (원점 = 날아가는 물체 중심)
  fly(x0, y0, x1, y1, color, onDone, dur = 0.42, draw = null) {
    this.flyers.push({ x0, y0, x1, y1, color, onDone, t: 0, dur, draw, arc: 70 + Math.abs(x1 - x0) * 0.15 });
  }

  // ── 정답 고르기 ────────────────────────────────────────
  async answerPhase(p) {
    $('#order .order-q').textContent = questionText(p);
    speak(questionText(p));
    const box = $('#answers');
    box.innerHTML = '';
    box.classList.remove('locked');
    for (const n of p.choices) {
      const b = document.createElement('button');
      const digitsLen = String(n).length;
      b.className = 'btn answer' + (digitsLen >= 6 ? ' xlong' : digitsLen >= 4 ? ' long' : '');
      b.textContent = n;
      b.addEventListener('click', () => { sfx.tap(); this.resolveInput(n); });
      box.appendChild(b);
    }
    box.hidden = false;
    const btnOf = (n) => [...box.children].find((b) => b.textContent === String(n));

    for (;;) {
      const n = await this.waitInput();
      if (n === p.answer) break;

      // 오답: 감점 없이 같이 세어 보기
      this.firstTry = false;
      btnOf(n).classList.add('wrong');
      box.classList.add('locked');
      sfx.oops();
      const big = p.diff > 1;
      this.customer.say(big ? '같이 풀어 볼까?' : '같이 세어 볼까?', 2.2);
      this.cat.play('sad', 1.4);
      speak(big ? '괜찮아! 차근차근 같이 풀어 볼까?' : '괜찮아! 같이 세어 볼까?');
      await this.sleep(0.9);
      if (big) {
        await this.showWork(p);
      } else {
        if (!this.bags.length) {
          this.buildScene(p, true);
          await this.sleep(0.8);
        }
        await this.countHint(p);
      }
      box.classList.remove('locked');
      speak('다시 골라 볼까?');
    }

    // 정답!
    const right = btnOf(p.answer);
    right.classList.add('right');
    box.classList.add('locked');
    sfx.correct();
    this.burst(W / 2, FLOOR - 60, 26);
    // 어려운 단계일수록 코인을 더 준다
    const reward = (this.firstTry ? 3 : 1) + (p.diff - 1);
    this.earned += reward;
    this.results[this.round] = this.firstTry ? 'star' : 'ok';
    this.renderDots();
    const r = right.getBoundingClientRect();
    const sr = this.stage.getBoundingClientRect();
    this.addCoins(reward, (r.left - sr.left) / this.scale + 60, (r.top - sr.top) / this.scale - 50);
    speak(this.firstTry ? '딩동댕! 정답이에요!' : '맞았어요! 잘했어요!');
    this.customer.setAnim('happy');
    this.cat.play('happy', 1.4);
    $('#order .order-expr').innerHTML = `${p.left}<span class="ans">${p.answer}</span>${p.right}`;
    await this.sleep(1.4);
    box.hidden = true;
  }

  // ── 큰 수 풀이 보드 ─────────────────────────────────────
  hideWork() { const w = $('#work'); if (w) w.hidden = true; }

  async showWork(p) {
    const sol = solutionSteps(p);
    if (!sol) return;
    const box = $('#work');
    const body = box.querySelector('.work-body');
    const note = box.querySelector('.work-note');
    body.innerHTML = '';
    note.textContent = '';
    box.hidden = false;
    box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    if (sol.kind === 'column') await this.playColumn(sol, body, note);
    else await this.playLines(sol, body, note);
    await this.sleep(0.6);
  }

  // 세로셈: 칸 = [부호, 높은 자리 … 일의 자리]
  async playColumn(sol, body, note) {
    const w = sol.width;
    const grid = document.createElement('div');
    grid.className = 'col-grid';
    grid.style.gridTemplateColumns = `repeat(${w + 1}, var(--cell))`;
    const rows = { mark: [], top: [], bottom: [], result: [] };
    const da = String(sol.a).padStart(w, ' '), db = String(sol.b).padStart(w, ' ');
    const cell = (cls, text = '') => { const c = document.createElement('div'); c.className = `cell ${cls}`; c.textContent = text; grid.appendChild(c); return c; };
    cell('mark op');
    for (let i = 0; i < w; i++) rows.mark.push(cell('mark'));
    cell('op');
    for (let i = 0; i < w; i++) rows.top.push(cell('num', da[i].trim()));
    cell('op', sol.op);
    for (let i = 0; i < w; i++) rows.bottom.push(cell('num', db[i].trim()));
    const rule = document.createElement('div');
    rule.className = 'rule';
    rule.style.gridColumn = `1 / span ${w + 1}`;
    grid.appendChild(rule);
    cell('op');
    for (let i = 0; i < w; i++) rows.result.push(cell('num result'));
    body.appendChild(grid);

    const at = (row, place) => rows[row][w - 1 - place];   // 자리(0=일) → 칸
    await this.sleep(0.6);
    for (const st of sol.steps) {
      body.querySelectorAll('.cell.now').forEach((c) => c.classList.remove('now'));
      for (const row of ['top', 'bottom', 'result']) at(row, st.place)?.classList.add('now');
      note.textContent = st.note;
      for (const pl of st.strike || []) at('top', pl)?.classList.add('struck');
      for (const m of st.marks || []) { const c = at('mark', m.place); if (c) { c.textContent = m.value; c.classList.add('pop'); } }
      await this.sleep(0.7);
      const r = at('result', st.place);
      if (r && st.digit !== null) { r.textContent = st.digit; r.classList.add('pop'); }
      sfx.count(st.place * 3);
      await this.sleep(1.1);
    }
    body.querySelectorAll('.cell.now').forEach((c) => c.classList.remove('now'));
    note.textContent = `답은 ${sol.answer}!`;
  }

  async playLines(sol, body, note) {
    note.textContent = '';
    for (let i = 0; i < sol.lines.length; i++) {
      const ln = sol.lines[i];
      const d = document.createElement('div');
      d.className = `line ${ln.kind || ''} pop`;
      d.textContent = ln.text;
      body.appendChild(d);
      sfx.count(i * 2);
      await this.sleep(ln.kind === 'note' ? 1.2 : 1.3);
    }
  }

  countTargets(p) {
    const all = [];
    if (p.mode === 'div') {
      for (const s of this.bags[0].slots) if (s.candy) all.push(s);
    } else if (p.mode === 'ten') {
      for (const s of this.bags[0].slots.slice(p.a)) if (s.candy) all.push(s);   // 더 넣은 사탕만
    } else {
      for (const b of this.bags) for (const s of b.slots) if (s.candy && !s.candy.ghost) all.push(s);
    }
    return all;
  }

  async countHint(p) {
    for (const b of this.bags) for (const s of b.slots) if (s.candy) s.candy.badge = null;
    const targets = this.countTargets(p);
    for (let i = 0; i < targets.length; i++) {
      targets[i].candy.badge = { n: i + 1, born: this.time };
      targets[i].bag.wobble = 0.3;
      sfx.count(i);
      await this.sleep(targets.length > 12 ? 0.32 : 0.45);
    }
    await this.sleep(0.4);
  }

  // ── 배달 ──────────────────────────────────────────────
  async deliver() {
    const cat = this.cat, cust = this.customer;
    this.delivering = true;
    this.hideWork();
    const midX = this.bags.length ? this.bags.reduce((s, b) => s + b.x, 0) / this.bags.length : (TABLE.x0 + TABLE.x1) / 2;
    if (PORTRAIT) {
      // 세로: 손님은 위층 → 고양이가 카운터 아래에서 폴짝, 봉지를 위로 휙 던져 준다
      await this.step(cat.moveTo(Math.max(CAT_HOME - 80, Math.min(W - 90, midX))));
      cat.facing = 'right';
      sfx.hop();
      await this.step(cat.hop(40));
      this.bags = [];
      this.signs = [];
      sfx.give();
      await this.step(new Promise((done) => this.fly(midX, TABLE.top - 60, cust.x, CFLOOR - 40, null, done, 0.6, drawBagIcon)));
      cust.carry(drawBagIcon);
    } else {
      await this.step(cat.moveTo(midX));
      sfx.pop(6);
      this.bags = [];
      this.signs = [];
      cat.carry(drawBagIcon);
      await this.step(cat.moveTo(CUSTOMER_SPOT - 150));
      cat.facing = 'right';
      sfx.hop();
      await this.step(cat.hop(34));
      cat.carry(null);
      cust.carry(drawBagIcon);
      sfx.give();
    }
    cust.setAnim('happy');
    cust.say('고마워요!', 1.6);
    this.hearts(cust.x, CFLOOR - 70);
    await this.sleep(1.3);
    $('#order').hidden = true;
    this.tray = null;
    await this.step(Promise.all([cust.moveTo(W + 160), cat.moveTo(CAT_HOME)]));
    cat.facing = 'right';
    this.customer = null;
    this.delivering = false;
  }

  async showResult() {
    const stars = this.results.filter((r) => r === 'star').length;
    const box = $('#result');
    const st = box.querySelector('.stars');
    st.innerHTML = '';
    for (let i = 0; i < ROUNDS; i++) {
      const s = document.createElement('span');
      s.textContent = '⭐';
      if (i >= stars) s.className = 'off';
      s.style.animationDelay = `${0.15 + i * 0.12}s`;
      st.appendChild(s);
    }
    box.querySelector('.earned').innerHTML = `코인 <b>+${this.earned}</b> 모았어요!`;
    box.hidden = false;
    $('#dots').hidden = true;
    sfx.fanfare();
    speak(stars >= 4 ? '최고의 사탕 가게예요!' : '오늘도 수고했어요!');
    this.burst(W / 2, H * 0.38, 40);
    this.cat.play('happy', 2.5);
  }

  // ── 파티클 ────────────────────────────────────────────
  burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 250 + Math.random() * 350;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 250, g: 900, life: 1.2 + Math.random() * 0.6, age: 0, color: pick(CANDY.palette), kind: Math.random() < 0.5 ? 'star' : 'dot', spin: Math.random() * 6 });
    }
  }
  hearts(x, y) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({ x: x + (i % 2 ? 1 : -1) * (50 + Math.random() * 30), y, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 80, g: -20, life: 1.4, age: -i * 0.1, color: '#ff6b8b', kind: 'heart', spin: 0 });
    }
  }

  // ── 루프 ──────────────────────────────────────────────
  update(dt) {
    this.time += dt;
    this.cat.update(dt);
    if (this.customer) this.customer.update(dt);
    this.machineWobble = Math.max(0, this.machineWobble - dt * 4);
    if (this.tray) this.tray.wobble = Math.max(0, this.tray.wobble - dt * 4);
    for (const b of this.bags) b.wobble = Math.max(0, b.wobble - dt * 3);

    for (const f of this.flyers) {
      f.t += dt;
      if (f.t >= f.dur && !f.done) { f.done = true; f.onDone(); }
    }
    this.flyers = this.flyers.filter((f) => !f.done);

    for (const p of this.particles) {
      p.age += dt;
      if (p.age < 0) continue;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    // 손가락 힌트 위치
    const it = this.interaction;
    this.handTarget = null;
    if (it && it.sent < it.total) {
      if (it.type === 'machine') this.handTarget = { x: MACHINE.x + 10, y: FLOOR - 190 };
      else if (it.type === 'tray') this.handTarget = { x: TRAY.x + 10, y: TRAY.y - 40 };
      else if (it.type === 'give') {
        const s = [...this.bags[0].slots].reverse().find((sl) => sl.candy && !sl.candy.ghost);
        if (s) this.handTarget = { x: s.x, y: s.y };
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const t = this.time;
    drawBackground(ctx, t);
    if (this.showMachine) drawMachine(ctx, this.machineWobble, t);
    if (this.tray) this.drawTray(ctx);
    drawCounter(ctx);
    for (const b of this.bags) this.drawBag(ctx, b);
    for (const s of this.signs) drawSign(ctx, s);

    // 고양이가 손님보다 앞에 오도록
    if (this.customer) this.customer.draw(ctx);
    this.cat.draw(ctx);

    for (const f of this.flyers) {
      const p = Math.min(1, f.t / f.dur);
      const e = easeOut(p);
      const x = f.x0 + (f.x1 - f.x0) * e;
      const y = f.y0 + (f.y1 - f.y0) * p - Math.sin(p * Math.PI) * f.arc;
      if (f.draw) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(p * Math.PI) * 0.3); f.draw(ctx); ctx.restore();
      } else {
        drawCandy(ctx, x, y, f.color, 1, p * 8);
      }
    }

    for (const b of this.bags) for (const s of b.slots) if (s.candy && s.candy.badge) drawBadge(ctx, s.x, s.y, s.candy.badge, t);
    for (const b of this.bags) if (b.tag) drawTag(ctx, b, t);

    for (const p of this.particles) drawParticle(ctx, p);

    if (this.handTarget && (t - this.lastTap > 2.2)) drawHand(ctx, this.handTarget.x, this.handTarget.y, t);
  }

  drawBag(ctx, b) {
    const t = this.time;
    ctx.save();
    ctx.translate(b.x, TABLE.top);
    ctx.rotate(Math.sin(t * 30) * b.wobble * 0.03);
    ctx.scale(1 + b.wobble * 0.04, 1 - b.wobble * 0.04);
    ctx.translate(-b.x, -TABLE.top);
    drawBagBody(ctx, b);
    for (const s of b.slots) {
      if (s.candy) {
        if (s.candy.ghost) drawGhost(ctx, s.x, s.y);
        else drawCandy(ctx, s.x, s.y, s.candy.color, popScale(t - s.candy.born) * 0.92, BAG_CANDY_ROT);
      } else if (!b.hideSlots) {
        drawSlot(ctx, s.x, s.y, s.reserved);
      }
    }
    ctx.restore();
  }

  drawTray(ctx) {
    const tr = this.tray;
    const t = this.time;
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUTLINE;
    ctx.lineJoin = 'round';
    // 받침대
    ctx.fillStyle = '#c99366';
    rr(ctx, TRAY.x - 18, TRAY.y, 36, FLOOR - TRAY.y, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b07a4f';
    ctx.beginPath(); ctx.ellipse(TRAY.x, FLOOR - 4, 70, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 쟁반
    ctx.translate(TRAY.x, TRAY.y);
    ctx.rotate(Math.sin(t * 30) * tr.wobble * 0.03);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0, 0, 118, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath(); ctx.ellipse(0, -3, 96, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(-TRAY.x, -TRAY.y);
    for (const c of tr.candies) drawCandy(ctx, c.x, c.y, c.color, popScale(t - c.born), 0.2);
    ctx.restore();
  }
}

// ── 그리기 함수들 ──────────────────────────────────────────
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function drawBackground(ctx, t) {
  // 벽
  ctx.fillStyle = '#ffe9ef';
  ctx.fillRect(0, 0, W, FLOOR);
  ctx.fillStyle = '#ffdce6';
  for (let x = 0; x < W; x += 80) ctx.fillRect(x, 0, 40, FLOOR);
  // 벽 아래 띠
  ctx.fillStyle = '#ffc2d3';
  ctx.fillRect(0, FLOOR - 70, W, 70);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, FLOOR - 70); ctx.lineTo(W, FLOOR - 70); ctx.stroke();

  if (PORTRAIT) {
    // 카운터와 바닥 사이 창문
    const wy = TABLE.bottom + 30;
    const wh = Math.min(170, FLOOR - 100 - wy);
    if (wh > 90) drawWindow(ctx, 450, wy, 240, wh, t);
    // 손님이 서는 가게 입구: 유리문 + 선반 바닥
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = '#d8f0ff';
    rr(ctx, CUSTOMER_SPOT - 95, CFLOOR - 250, 190, 250, [90, 90, 0, 0]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8fab';
    rr(ctx, CUSTOMER_SPOT - 110, CFLOOR - 268, 220, 30, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e7a96b';
    rr(ctx, 0 - 10, CFLOOR - 2, W + 20, 20, 8); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else {
    drawWindow(ctx, 470, 160, 240, 170, t);
    // 선반 + 사탕병
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = '#e7a96b';
    rr(ctx, 770, 360, 260, 18, 8); ctx.fill(); ctx.stroke();
    const jars = ['#ff6b8b', '#5bc0f8', '#ffd84d'];
    jars.forEach((c, i) => {
      const x = 810 + i * 90;
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      rr(ctx, x - 30, 290, 60, 70, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c;
      rr(ctx, x - 22, 322, 44, 32, 10); ctx.fill();
      ctx.fillStyle = '#ff9fb2';
      rr(ctx, x - 24, 280, 48, 14, 6); ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }

  // 가랜드
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath(); ctx.moveTo(0, 96); ctx.quadraticCurveTo(W / 2, 150, W, 96); ctx.stroke();
  const flags = ['#ff8fab', '#ffd65c', '#7fdcae', '#7cc8f8', '#b592f5'];
  for (let i = 0, x = 40; x < W; i++, x += 75) {
    const u = x / W;
    const y = 96 + (1 - (2 * u - 1) ** 2) * 27;
    const sw = Math.sin(t * 2 + i) * 0.06;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    ctx.fillStyle = flags[i % flags.length];
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(0, 32); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 바닥 (체크무늬)
  ctx.fillStyle = '#fff3dc';
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = '#ffe2b8';
  for (let x = 0, i = 0; x < W; x += 64, i++) {
    for (let y = FLOOR, j = 0; y < H; y += 48, j++) if ((i + j) % 2 === 0) ctx.fillRect(x, y, 64, 48);
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(W, FLOOR); ctx.stroke();
}

function drawWindow(ctx, x, y, w, h, t) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = '#bfe6ff';
  rr(ctx, x, y, w, h, 26); ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.9;
  const cx = x + ((t * 12) % (w + 60)) - 30;
  const cy = y + h * 0.35;
  ctx.beginPath(); ctx.ellipse(cx, cy, 34, 14, 0, 0, Math.PI * 2); ctx.ellipse(cx + 24, cy - 10, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  ctx.restore();
}

function drawMachine(ctx, wob, t) {
  const x = MACHINE.x;
  ctx.save();
  ctx.translate(x, FLOOR);
  ctx.rotate(Math.sin(t * 40) * wob * 0.04);
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  // 받침
  ctx.fillStyle = '#ff6b8b';
  ctx.beginPath();
  ctx.moveTo(-62, 0); ctx.lineTo(-48, -130); ctx.lineTo(48, -130); ctx.lineTo(62, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 손잡이
  ctx.fillStyle = '#ffd65c';
  ctx.beginPath(); ctx.arc(0, -84, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(0, -84); ctx.rotate(wob * 3); ctx.fillStyle = '#ffffff'; rr(ctx, -4, -14, 8, 28, 4); ctx.fill(); ctx.stroke(); ctx.restore();
  // 배출구
  ctx.fillStyle = '#4a3434';
  rr(ctx, 14, -58, 38, 26, 8); ctx.fill();
  // 유리구
  ctx.fillStyle = 'rgba(230,247,255,.95)';
  ctx.beginPath(); ctx.arc(0, -200, 80, 0, Math.PI * 2); ctx.fill();
  // 안의 사탕들
  const seeds = [[-40, -160], [-10, -150], [22, -158], [48, -170], [-52, -190], [-22, -186], [8, -184], [38, -200], [-34, -218], [0, -214], [30, -232], [-8, -244]];
  seeds.forEach(([sx, sy], i) => drawCandy(ctx, sx + Math.sin(t * 20 + i) * wob * 4, sy, CANDY.palette[i % CANDY.palette.length], 0.85, i));
  ctx.beginPath(); ctx.arc(0, -200, 80, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath(); ctx.ellipse(-36, -232, 12, 22, 0.6, 0, Math.PI * 2); ctx.fill();
  // 뚜껑
  ctx.fillStyle = '#ff6b8b';
  rr(ctx, -34, -296, 68, 22, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd65c';
  ctx.beginPath(); ctx.arc(0, -304, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 글자
  ctx.fillStyle = '#ffffff';
  ctx.font = '26px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CANDY', 0, -12);
  ctx.restore();
}

function drawCounter(ctx) {
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  // 앞판
  ctx.fillStyle = '#ffffff';
  rr(ctx, TABLE.x0 + 10, TABLE.top + 10, TABLE.x1 - TABLE.x0 - 20, TABLE.bottom - TABLE.top - 6, 12); ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ffb3c7';
  for (let x = TABLE.x0; x < TABLE.x1; x += 56) ctx.fillRect(x, TABLE.top, 28, TABLE.bottom - TABLE.top);
  ctx.restore();
  rr(ctx, TABLE.x0 + 10, TABLE.top + 10, TABLE.x1 - TABLE.x0 - 20, TABLE.bottom - TABLE.top - 6, 12); ctx.stroke();
  // 상판
  ctx.fillStyle = '#e7a96b';
  rr(ctx, TABLE.x0, TABLE.top - 4, TABLE.x1 - TABLE.x0, 22, 10); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawBagBody(ctx, b) {
  const x0 = b.x - b.w / 2, top = b.top;
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.fillStyle = b.color;
  rr(ctx, x0, top + 12, b.w, b.h - 12, 16); ctx.fill(); ctx.stroke();
  // 접힌 윗부분
  ctx.beginPath();
  ctx.moveTo(x0 + 6, top + 12);
  for (let i = 0; i <= 8; i++) ctx.lineTo(x0 + 6 + (b.w - 12) * i / 8, top + (i % 2 ? 2 : 12));
  ctx.lineTo(x0 + b.w - 6, top + 24);
  ctx.lineTo(x0 + 6, top + 24);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 투명 창
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  rr(ctx, x0 + 9, top + 32, b.w - 18, b.h - 40, 12); ctx.fill();
  ctx.restore();
}

function drawSlot(ctx, x, y, reserved) {
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = reserved ? '#ff8fab' : '#c9ad98';
  ctx.beginPath(); ctx.arc(x, y, CANDY_R, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawGhost(ctx, x, y) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#9c8478';
  ctx.beginPath(); ctx.arc(x, y, CANDY_R, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8); ctx.stroke();
  ctx.restore();
}

export function drawCandy(ctx, x, y, color, scale = 1, rot = 0) {
  if (scale <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  // 포장 끝
  ctx.fillStyle = color;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 11, 0); ctx.lineTo(s * 24, -9); ctx.lineTo(s * 24, 9); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, CANDY_R - 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 소용돌이
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0.3, Math.PI * 1.4); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(-5, -6, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBadge(ctx, x, y, badge, t) {
  const s = popScale(t - badge.born);
  if (s <= 0) return;
  ctx.save();
  ctx.translate(x + 10, y - 14);
  ctx.scale(s, s);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = '#ffd65c';
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.font = '22px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(badge.n), 0, 1);
  ctx.restore();
}

function drawTag(ctx, b, t) {
  const s = popScale(t - b.tagBorn);
  if (s <= 0) return;
  const q = b.tag === '?';
  ctx.save();
  ctx.translate(b.x, b.top - 26);
  ctx.scale(s, s);
  if (q) ctx.rotate(Math.sin(t * 5) * 0.12);
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, 30); ctx.stroke();
  ctx.fillStyle = q ? '#ff8fab' : '#ffffff';
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = q ? '#ffffff' : OUTLINE;
  ctx.font = '28px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.tag, 0, 2);
  ctx.restore();
}

function drawSign(ctx, s) {
  ctx.save();
  ctx.font = '64px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.strokeText(s.text, s.x, s.y);
  ctx.fillStyle = '#ffd65c';
  ctx.fillText(s.text, s.x, s.y);
  ctx.restore();
}

function drawHand(ctx, x, y, t) {
  ctx.save();
  const bob = Math.abs(Math.sin(t * 5)) * 14;
  ctx.font = '64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('👆', x + 8, y + 10 + bob);
  ctx.restore();
}

function drawParticle(ctx, p) {
  if (p.age < 0) return;
  const a = 1 - p.age / p.life;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5));
  ctx.translate(p.x, p.y);
  ctx.rotate(p.spin * p.age);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (p.kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 6 : 14, an = i * Math.PI / 5 - Math.PI / 2;
      ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
    }
    ctx.closePath();
  } else if (p.kind === 'heart') {
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-18, -4, -8, -18, 0, -8);
    ctx.bezierCurveTo(8, -18, 18, -4, 0, 8);
  } else {
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
  }
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// 배달용 사탕 봉지 (원점 = 들고 있는 손 위치)
function drawBagIcon(ctx) {
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  drawCandy(ctx, -10, -36, '#ff6b8b', 0.7, -0.4);
  drawCandy(ctx, 10, -38, '#5bc0f8', 0.7, 0.5);
  ctx.fillStyle = '#f1d3a6';
  rr(ctx, -26, -34, 52, 52, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff8fab';
  ctx.beginPath(); ctx.arc(0, -10, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

loadSprites().then(() => {
  const go = () => new Game();
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('30px Jua'), wait(1.5)]).finally(go);
  } else go();
});
