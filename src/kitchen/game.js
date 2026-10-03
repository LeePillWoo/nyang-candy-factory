// 냥냥 주방 — 오버쿡드처럼 주문이 밀려드는 주방에서 수학하기.
//   주문서(손님 + 문제) → 답만큼 만두를 팬에 담기 → 🔥 굽기 → 🛎 내보내기
//   내보낸 접시의 만두 수와 답이 같은 주문서로 자동 배달된다. 틀려도 벌 없이 팬이 돌아와 고치면 된다.
//   1인: 요리사 한 명(냥이), 팬 2개 · 2인: 화면 반씩 냥이 + 펭귄, 같은 주문서를 함께 처리 (협동)
import { sfx, speak, unlockAudio, isMuted, setMuted } from '../audio.js';
import { makeProblemSet } from '../problems.js';
import { visibleArea, safeInsets, onViewportChange } from '../viewport.js';
import { SPRITES, loadSprites, drawSpriteFrame } from '../sprites.js';
import { CHARACTERS, FEATURED_CUSTOMERS } from '../characters.js';

const SHIFT = 150;            // 한 판(영업 시간), 초
const COOK_TIME = 2.5;        // 굽는 시간, 초
const PATIENCE = 50;          // 손님이 기다리는 시간(지나도 떠나지 않음 — 빨리 주면 보너스 코인만)
const CAP = 20;               // 팬 하나에 담을 수 있는 만두 (10칸 판 두 개)
const ORDERS = { 1: [2, 3], 2: [3, 4] };   // 인원별 동시 주문 수 [처음, 50초 뒤]
const STAR_AT = { 1: [3, 6, 9], 2: [4, 8, 12] };
const OP_WORD = { add: '더하기', sub: '빼기', mul: '곱하기', div: '나누기', ten: '더하기' };
// 답이 1~20 (팬 하나)에 들어오도록 모드별 문제 레벨
const LEVEL = { add: 'number', sub: 'number', mul: 'picture', div: 'number', ten: 'number' };

const CHEFS = [
  { key: 'nyang', name: '냥이', color: 'pink' },
  { key: 'penguin', name: '펭귄', color: 'sky' },
];
// 펭귄 시트(6×6)에서 정면 프레임 [행, 칸]
const PENGUIN_CHEF = {
  idle: { frames: [[2, 2], [2, 2], [3, 2], [3, 2]], fps: 2 },
  happy: { frames: [[4, 4], [1, 0], [4, 4], [0, 5]], fps: 5 },
  sad: { frames: [[3, 5]], fps: 1 },
};

const $ = (s, el = document) => el.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

const store = {
  load(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 저장 불가 */ } },
};

// 버튼은 눌린 순간 반응 (둘이 동시에 눌러도 각각 처리되게 pointerdown)
function press(btn, fn) {
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(e); });
}

// 캐릭터 한 프레임을 작은 캔버스에 그린다 (발 아래 중앙 기준, 높이 h 에 맞춤)
function drawCharacter(ctx, key, animName, t, w, h) {
  if (key === 'penguin') {
    const sheet = SPRITES.penguin;
    if (!sheet.image) return;
    const a = PENGUIN_CHEF[animName] || PENGUIN_CHEF.idle;
    const [row, col] = a.frames[Math.floor(t * a.fps) % a.frames.length];
    ctx.save(); ctx.translate(w / 2, h - 2);
    drawSpriteFrame(ctx, sheet, `row${row}`, col, (h - 4) / 140);
    ctx.restore();
    return;
  }
  const c = CHARACTERS[key];
  const sheet = c && SPRITES[c.sprite];
  if (!sheet || !sheet.image) return;
  const def = c.anims[animName] || c.anims.idle;
  const anim = sheet.anims[def.anim];
  const fps = def.fps || anim.fps;
  const i = Math.floor(t * fps);
  const frame = def.seq ? def.seq[i % def.seq.length] : i % anim.frames;
  ctx.save(); ctx.translate(w / 2, h - 2);
  drawSpriteFrame(ctx, sheet, def.anim, frame, (h - 4) / (sheet.frameH * 0.92));
  ctx.restore();
}

function hiDpiCanvas(cls, w, h) {
  const c = el('canvas', cls);
  const k = 2;
  c.width = w * k; c.height = h * k;
  c.style.width = `${w}px`; c.style.height = `${h}px`;
  const ctx = c.getContext('2d');
  ctx.setTransform(k, 0, 0, k, 0, 0);
  return { canvas: c, ctx, w, h };
}

// ── 무대 크기 ─────────────────────────────────────────
let W = 1280, H = 800, PORTRAIT = false;

class KitchenGame {
  constructor() {
    this.stage = $('#stage');
    this.time = 0;
    this.coins = store.load('nyang.coins', 0);
    this.players = store.load('kitchen.players', 1) === 2 ? 2 : 1;
    this.state = 'menu';
    this.tickets = [];
    this.stations = [];
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
    }
    const s = Math.min(vw / W, vh / H);
    this.stage.style.transform = `translate(${area.x + l + (vw - W * s) / 2}px, ${area.y + t + (vh - H * s) / 2}px) scale(${s})`;
    this.stage.classList.add('ready');
  }

  // ── 입력 ────────────────────────────────────────────
  bindUI() {
    document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
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
    $('#menu').hidden = false;
    $('#result').hidden = true;
    $('#rail').hidden = true;
    $('#stations').hidden = true;
    $('#banner').hidden = true;
    $('#clock').hidden = true;
    $('#served').hidden = true;
    $('#btn-home').hidden = true;
  }

  start(mode) {
    this.mode = mode;
    this.runId = (this.runId || 0) + 1;
    this.state = 'play';
    this.clock = SHIFT;
    this.served = 0;
    this.earned = 0;
    this.pool = [];
    this.tickets = [];
    this.nextTicketIn = 0.6;
    this.customerBag = [];
    this.lastSpeak = -10;
    this.stage.classList.toggle('duo', this.players === 2);
    $('#rail').innerHTML = '';
    $('#rail').hidden = false;
    this.buildStations();
    $('#stations').hidden = false;
    $('#menu').hidden = true;
    $('#result').hidden = true;
    $('#banner').hidden = true;
    $('#clock').hidden = false;
    $('#served').hidden = false;
    $('#btn-home').hidden = false;
    $('#served-count').textContent = 0;
    this.renderClock();
    speak(this.players === 2 ? '둘이 함께 주문을 처리해요! 시작!' : '주문이 들어와요! 시작!');
  }

  // ── 요리사 자리 만들기 ─────────────────────────────────
  buildStations() {
    const box = $('#stations');
    box.innerHTML = '';
    this.stations = [];
    for (let p = 0; p < this.players; p++) {
      const chef = CHEFS[p];
      const root = el('div', `station p${p} ${chef.color}`);
      const side = el('div', 'st-side');
      const head = el('div', 'st-head');
      const cv = hiDpiCanvas('chef', 96, 96);
      head.append(cv.canvas, el('span', 'chef-name', `${this.players === 2 ? `${p + 1}P ` : ''}${chef.name}`));
      const trays = el('div', 'trays');
      const one = el('button', 'tray one', '<span class="tray-food">🥟</span><b>1개</b>');
      const five = el('button', 'tray five', '<span class="tray-food five-pack">🥟🥟🥟🥟🥟</span><b>5개</b>');
      one.setAttribute('aria-label', '만두 1개 넣기');
      five.setAttribute('aria-label', '만두 5개 넣기');
      trays.append(one, five);
      side.append(head, trays);
      root.append(side);
      const st = { p, chef, root, chefCv: cv, mood: 'idle', moodT: 0, pans: [], sel: 0, served: 0 };
      for (let i = 0; i < 2; i++) st.pans.push(this.buildPan(st, i, root));
      press(one, () => this.addFood(st, 1));
      press(five, () => this.addFood(st, 5));
      box.append(root);
      this.stations.push(st);
      this.renderPans(st);
    }
  }

  buildPan(st, i, root) {
    const card = el('div', 'pan');
    const count = el('div', 'pan-count');
    const body = el('div', 'pan-body');
    const slots = [];
    for (let f = 0; f < 2; f++) {
      const frame = el('div', 'frame');
      for (let k = 0; k < 10; k++) { const s = el('div', 'slot'); frame.append(s); slots.push(s); }
      body.append(frame);
    }
    const bar = el('div', 'cook-bar', '<i></i>');
    const acts = el('div', 'pan-actions');
    const undo = el('button', 'act undo', '↩');
    undo.setAttribute('aria-label', '하나 빼기');
    const cook = el('button', 'act cook', '🔥 굽기');
    const serve = el('button', 'act serve', '🛎 내기');
    acts.append(undo, cook, serve);
    card.append(count, body, bar, acts);
    root.append(card);
    const pan = { i, card, count, body, slots, bar, undo, cook, serve, n: 0, state: 'edit', cookT: 0, doneT: 0 };
    press(card, () => { if (st.sel !== i) { st.sel = i; sfx.tap(); this.renderPans(st); } });
    press(body, () => { st.sel = i; this.removeFood(st, pan); });
    press(undo, () => { st.sel = i; this.removeFood(st, pan); });
    press(cook, () => this.cook(st, pan));
    press(serve, () => this.serve(st, pan));
    return pan;
  }

  renderPans(st) {
    for (const pan of st.pans) {
      pan.card.classList.toggle('sel', st.sel === pan.i && pan.state === 'edit');
      pan.card.dataset.state = pan.state;
      pan.count.textContent = pan.n ? `${pan.n}개` : '비었어요';
      pan.slots.forEach((s, k) => s.classList.toggle('on', k < pan.n));
      pan.undo.hidden = pan.state !== 'edit';
      pan.cook.hidden = pan.state !== 'edit';
      pan.cook.disabled = pan.n === 0;
      pan.serve.hidden = pan.state !== 'done';
      pan.bar.hidden = pan.state !== 'cooking';
    }
  }

  // ── 요리 ────────────────────────────────────────────
  addFood(st, k) {
    if (this.state !== 'play') return;
    let pan = st.pans[st.sel];
    if (pan.state !== 'edit' || pan.n >= CAP) {
      // 고른 팬이 굽는 중이거나 꽉 차면 다른 빈 팬으로
      const other = st.pans.find((q) => q.state === 'edit' && q.n < CAP);
      if (!other) { this.nudge(st.root); return; }
      pan = other;
      st.sel = other.i;
    }
    const add = Math.min(k, CAP - pan.n);
    for (let j = 0; j < add; j++) {
      const slot = pan.slots[pan.n + j];
      slot.classList.remove('drop'); void slot.offsetWidth; slot.classList.add('drop');
    }
    pan.n += add;
    sfx.pop(Math.min(pan.n, 12));
    this.renderPans(st);
  }

  removeFood(st, pan) {
    if (this.state !== 'play' || pan.state !== 'edit' || pan.n === 0) return;
    pan.n -= 1;
    sfx.tap();
    this.renderPans(st);
  }

  cook(st, pan) {
    if (this.state !== 'play' || pan.state !== 'edit' || pan.n === 0) return;
    pan.state = 'cooking';
    pan.cookT = 0;
    sfx.machine();
    // 다음 만두는 다른 팬에 담도록
    const other = st.pans.find((q) => q !== pan && q.state === 'edit');
    if (other) st.sel = other.i;
    this.renderPans(st);
  }

  serve(st, pan) {
    if (this.state !== 'play' || pan.state !== 'done') return;
    const n = pan.n;
    const t = this.tickets.filter((x) => !x.leaving && x.p.answer === n).sort((a, b) => a.born - b.born)[0];
    if (!t) {
      // 맞는 주문이 없어요 — 팬을 돌려줘서 고치게 (벌 없음)
      sfx.oops();
      this.say(`${n}개짜리 주문은 없어요. 주문서를 다시 볼까요?`, true);
      pan.state = 'edit';
      st.sel = pan.i;
      this.setMood(st, 'sad', 1.2);
      this.nudge(pan.card);
      for (const x of this.tickets) if (!x.leaving) this.flash(x.card);
      this.renderPans(st);
      return;
    }
    // 배달!
    sfx.give();
    setTimeout(() => sfx.correct(), 120);
    pan.card.classList.remove('fly'); void pan.card.offsetWidth; pan.card.classList.add('fly');
    pan.n = 0;
    pan.state = 'edit';
    st.sel = pan.i;
    st.served += 1;
    this.served += 1;
    $('#served-count').textContent = this.served;
    this.setMood(st, 'happy', 1.6);
    const fast = t.patience / PATIENCE > 0.5;
    this.addCoins(fast ? 3 : 2);
    t.leaving = true;
    t.mood = 'happy';
    t.card.classList.add('done');
    $('.t-expr', t.card).innerHTML = `${t.p.left}<span class="ans">${t.p.answer}</span>${t.p.right}`;
    $('.t-msg', t.card).textContent = fast ? '냠냠! 빨라요! +3' : '냠냠! 고마워요 +2';
    this.say(pick(['딩동댕!', '맛있겠다!', '고마워요!']), true);
    const run = this.runId;
    setTimeout(() => {
      if (run !== this.runId) return;
      t.card.classList.add('bye');
      setTimeout(() => {
        if (run !== this.runId) return;
        t.card.remove();
        this.tickets = this.tickets.filter((x) => x !== t);
      }, 450);
    }, 1300);
    this.renderPans(st);
  }

  setMood(st, m, sec) { st.mood = m; st.moodT = sec; }

  nudge(node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }
  flash(node) { node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash'); }

  // 다른 말과 겹치지 않게 (force 면 바로)
  say(text, force = false) {
    if (!force && this.time - this.lastSpeak < 2.5) return;
    this.lastSpeak = this.time;
    speak(text);
  }

  sayProblem(p) {
    if (p.mode === 'ten') return `${p.a} 더하기 몇은 10?`;
    return `${p.a} ${OP_WORD[p.mode]} ${p.b}는?`;
  }

  // ── 주문서 ──────────────────────────────────────────
  nextProblem() {
    const busy = new Set(this.tickets.filter((t) => !t.leaving).map((t) => t.p.answer));
    for (let tries = 0; tries < 3; tries++) {
      if (this.pool.length < 4) this.pool.push(...makeProblemSet(this.mode, LEVEL[this.mode], 12, 1));
      // 화면에 있는 주문과 답이 겹치지 않는 문제 (내보낸 접시가 어느 주문인지 헷갈리지 않게)
      const i = this.pool.findIndex((p) => !busy.has(p.answer) && p.answer >= 1 && p.answer <= CAP);
      if (i >= 0) return this.pool.splice(i, 1)[0];
      this.pool = [];
    }
    return null;
  }

  addTicket() {
    const p = this.nextProblem();
    if (!p) return;
    if (!this.customerBag.length) this.customerBag = shuffle([...FEATURED_CUSTOMERS]);
    const who = this.customerBag.pop();
    const card = el('div', 'ticket');
    const cv = hiDpiCanvas('cust', 110, 96);
    const expr = el('p', 't-expr', `${p.left}<span class="q">?</span>${p.right}`);
    if ((p.left + p.right).length > 9) expr.classList.add('long');
    const msg = el('p', 't-msg', `${CHARACTERS[who].name}: 만두 주세요!`);
    const pat = el('div', 't-patience', '<i></i>');
    card.append(cv.canvas, expr, msg, pat);
    $('#rail').append(card);
    const t = { p, who, card, cv, patience: PATIENCE, born: this.time, mood: 'idle', leaving: false };
    // 주문서를 누르면 문제를 읽어 준다
    press(card, () => { if (!t.leaving) { this.say(this.sayProblem(p), true); this.flash(card); } });
    this.tickets.push(t);
    sfx.hop();
    this.say(`새 주문! ${this.sayProblem(p)}`);
  }

  // ── 루프 ────────────────────────────────────────────
  update(dt) {
    this.time += dt;
    if (this.state !== 'play') return;

    this.clock -= dt;
    this.renderClock();

    // 주문서 채우기
    const live = this.tickets.filter((t) => !t.leaving).length;
    const [first, later] = ORDERS[this.players];
    const want = SHIFT - this.clock > 50 ? later : first;
    if (live < want) {
      this.nextTicketIn -= dt;
      if (this.nextTicketIn <= 0) { this.addTicket(); this.nextTicketIn = 1.6; }
    }
    for (const t of this.tickets) {
      if (t.leaving) continue;
      t.patience = Math.max(0, t.patience - dt);
      const r = t.patience / PATIENCE;
      const bar = $('.t-patience i', t.card);
      bar.style.width = `${r * 100}%`;
      bar.style.background = r > 0.5 ? '#5ccf95' : r > 0.2 ? '#ffd65c' : '#ff8fab';
      t.mood = r > 0.2 ? 'idle' : 'eat';   // 오래 기다리면 꼼지락 (떠나지는 않아요)
    }

    // 굽기
    for (const st of this.stations) {
      if (st.moodT > 0) { st.moodT -= dt; if (st.moodT <= 0) st.mood = 'idle'; }
      for (const pan of st.pans) {
        if (pan.state === 'cooking') {
          pan.cookT += dt;
          $('i', pan.bar).style.width = `${Math.min(1, pan.cookT / COOK_TIME) * 100}%`;
          if (pan.cookT >= COOK_TIME) {
            pan.state = 'done';
            pan.doneT = 0;
            sfx.count(8);
            this.renderPans(st);
          }
        } else if (pan.state === 'done') {
          pan.doneT += dt;
          // 오래 두면 김이 모락모락 (타지는 않아요 — 얼른 내보내라는 신호)
          pan.card.classList.toggle('steamy', pan.doneT > 6);
        } else {
          pan.card.classList.remove('steamy');
        }
      }
    }

    if (this.clock <= 0) this.finish();
  }

  renderClock() {
    const s = Math.max(0, Math.ceil(this.clock));
    $('#clock-text').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('#clock').classList.toggle('hurry', s <= 20);
  }

  draw() {
    const t = this.time;
    for (const tk of this.tickets) {
      const { ctx, w, h } = tk.cv;
      ctx.clearRect(0, 0, w, h);
      drawCharacter(ctx, tk.who, tk.mood, t + tk.born, w, h);
    }
    for (const st of this.stations) {
      const { ctx, w, h } = st.chefCv;
      ctx.clearRect(0, 0, w, h);
      drawCharacter(ctx, st.chef.key, st.mood, t, w, h);
    }
  }

  finish() {
    this.state = 'over';
    const run = this.runId;
    sfx.fanfare();
    const banner = $('#banner');
    banner.textContent = '영업 끝! 🛎';
    banner.hidden = false;
    speak('영업 끝! 수고했어요!');
    setTimeout(() => { if (run === this.runId) this.showResult(); }, 1800);
  }

  showResult() {
    $('#banner').hidden = true;
    const box = $('#result');
    const at = STAR_AT[this.players];
    const stars = at.filter((n) => this.served >= n).length;
    const starBox = $('.stars', box);
    starBox.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = el('span', i < stars ? '' : 'off', '⭐');
      s.style.animationDelay = `${0.15 * i}s`;
      starBox.append(s);
    }
    $('.served-line', box).textContent = `만두 ${this.served}접시 배달 완료!`;
    $('.team-line', box).textContent = this.players === 2
      ? this.stations.map((s) => `${s.chef.name} ${s.served}접시`).join(' · ') + ' — 최고의 팀!'
      : '';
    $('.team-line', box).hidden = this.players !== 2;
    $('.earned', box).textContent = `코인 +${this.earned}`;
    box.hidden = false;
    $('#rail').hidden = true;
    $('#stations').hidden = true;
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
