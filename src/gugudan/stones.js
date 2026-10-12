// 🐸 징검다리 점프 — 냥이가 연못 돌을 '몇씩 뛰어 세기'로 건넌다. 틀린 돌을 밟으면 퐁당!
//   한 연못 = 한 단. 앞에 돌이 3개 있고, 하나만 다음 수(3단이면 9 다음은 12).
//   틀리면 돌이 가라앉고 냥이가 퐁당 → 엉금이(거북이)가 등에 태워 앞 돌로 데려다준다. 벌은 없다.
//   단계: 1 쉬움 = 수직선 자리(정답 돌까지 늘 같은 거리) + 식이 보임
//         2 보통 = 같은 줄에 돌 3개, 헷갈리는 수
//         3 어려움 = 거꾸로 (9×단 에서 0까지)
import { sfx } from '../audio.js';
import { stoneChoices, chant, topic, shuffle } from './facts.js';
import * as D from './draw.js';

const CROUCH = 0.12, AIR = 0.5, CHEER = 0.75;
const FALL = 0.6, RISE = 0.45, CARRY = 0.85, HOP = 0.32;

export class StonesGame {
  constructor(app, { n, level }) {
    this.app = app;
    this.n = n;
    this.level = level;
    this.back = level === 3;
    const ks = this.back ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    this.targets = ks.map((k) => ({ k, v: k * n }));
    this.startV = this.back ? 9 * n : 0;
    this.goalV = this.back ? 0 : null;     // 앞으로는 9×단 다음이 도착 섬
    this.step = 0;
    this.path = [{ u: 0, lane: 1, v: this.startV, bank: true }];
    this.cat = { u: 0, lane: 1, hop: 0, mode: 'idle', t: 0, flip: false };
    this.cam = 0;
    this.choices = [];
    this.splashes = 0;
    this.firstOk = 0;
    this.miss = 0;
    this.drops = [];
    this.rings = [];
    this.floats = [];
    this.turtle = null;
    this.t = 0;
    this.over = false;
    this.relayout();
    this.newStep(true);
  }

  get goalU() { return (this.targets.length + 1) * this.STEP; }

  relayout() {
    const { W, H, portrait } = this.app;
    this.V = portrait;
    this.STEP = portrait ? 290 : 270;
    this.stoneW = portrait ? 136 : 150;
    this.lane0 = portrait ? 150 : 340;           // 돌이 놓이는 세 줄: 가로면 y, 세로면 x
    this.laneGap = portrait ? 210 : 150;
    this.origin = portrait ? H - 330 : 300;       // 냥이가 서는 화면 자리 (가로 x · 세로 y)
    this.waterTop = portrait ? 262 : 252;
    this.catScale = portrait ? 0.72 : 0.78;
    this.W = W; this.H = H;
  }

  // 세계 좌표(u = 건너는 방향으로 간 거리, lane = 0~2) → 화면
  pos(u, lane) {
    const across = this.lane0 + lane * this.laneGap;
    return this.V ? { x: across, y: this.origin - (u - this.cam) } : { x: this.origin + (u - this.cam), y: across };
  }
  // 수 → 거리 (수직선): 시작 수에서 단만큼 갈 때마다 한 칸
  uOf(v) { return Math.abs(v - this.startV) / this.n * this.STEP; }
  current() { return this.path[this.path.length - 1]; }

  // ── 진행 ────────────────────────────────────────────
  newStep(first = false) {
    if (this.step >= this.targets.length) { this.goToGoal(); return; }
    const { k, v } = this.targets[this.step];
    const prev = this.current().v;
    const wrong = stoneChoices(this.n, v, prev, this.level);
    const lanes = shuffle([0, 1, 2]);
    const col = (this.step + 1) * this.STEP;
    this.choices = [v, ...wrong].map((val, i) => ({
      v: val, ok: val === v, lane: lanes[i], u: this.level === 1 ? this.uOf(val) : col,
      sink: 0, wob: 0, gone: false, sinking: false, pop: 0,
    }));
    this.miss = 0;
    this.cat.mode = 'idle';
    this.cat.t = 0;
    const n = this.n;
    if (first) {
      this.app.say(this.back
        ? `${n}씩 거꾸로 뛰어요! ${this.startV}에서 출발! 다음은?`
        : this.level === 1 ? `${n}단 징검다리! ${n}씩 폴짝 뛰어요. ${n} 곱하기 1${topic(1)}?` : `${n}씩 뛰어 세기! 0 다음은?`, true);
    } else {
      this.app.say(this.level === 1 ? `${n} 곱하기 ${k}${topic(k)}?` : `${prev} 다음은?`);
    }
  }

  tap(x, y) {
    if (this.over || this.cat.mode !== 'idle') return;
    let best = null;
    for (const c of this.choices) {
      if (c.gone || c.sinking) continue;
      const p = this.pos(c.u, c.lane);
      const d = Math.hypot((x - p.x) / (this.stoneW * 0.62), (y - (p.y - 20)) / (this.stoneW * 0.62));
      if (d < 1 && (!best || d < best.d)) best = { c, d };
    }
    if (best) this.jumpTo(best.c);
  }

  jumpTo(target) {
    const cat = this.cat;
    cat.mode = 'crouch';
    cat.t = 0;
    cat.from = { u: cat.u, lane: cat.lane };
    cat.to = target;
    const a = this.pos(cat.u, cat.lane), b = this.pos(target.u, target.lane);
    cat.flip = this.V ? b.x < a.x - 4 : false;
    sfx.tap();
  }

  land(c) {
    const cat = this.cat;
    cat.u = c.u; cat.lane = c.lane; cat.hop = 0;
    sfx.land();
    this.ring(c.u, c.lane, this.stoneW * 0.9);
    if (c.goal) { this.arrive(); return; }
    if (c.ok) {
      const { k, v } = this.targets[this.step];
      const first = this.miss === 0;
      this.path.push({ u: c.u, lane: c.lane, v });
      for (const o of this.choices) if (o !== c) o.sinking = true;   // 나머지 돌은 가라앉힌다
      this.choices = this.choices.filter((o) => o !== c);
      cat.mode = 'cheer'; cat.t = 0;
      sfx.correct();
      const p = this.pos(c.u, c.lane);
      this.float(p.x, p.y - 170, `${this.n} × ${k} = ${v}`, '#ffd23f', 40);
      this.app.say(chant(this.n, k), true);
      const star = this.app.recordFact(this.n, k, first);
      if (first) {
        this.firstOk += 1;
        this.app.addCoins(1);
        this.app.mission('gugudan.first');
      }
      if (star) this.float(p.x, p.y - 230, '⭐ 익혔어요!', '#7fdcae', 30);
      this.step += 1;
    } else {
      // 틀린 돌: 기우뚱 → 가라앉으며 퐁당!
      cat.mode = 'wobble'; cat.t = 0;
      this.sinkStone = c;
      this.miss += 1;
      this.splashes += 1;
    }
  }

  // 퐁당 뒤: 엉금이가 앞 돌로 데려다준다
  rescue() {
    const back = this.current();
    this.turtle = { from: { u: this.cat.u, lane: this.cat.lane }, to: { u: back.u, lane: back.lane }, t: 0 };
    this.cat.mode = 'rescue'; this.cat.t = 0;
    sfx.pip();
  }

  afterRescue() {
    const back = this.current();
    this.cat.u = back.u; this.cat.lane = back.lane; this.cat.hop = 0;
    this.cat.mode = 'idle'; this.cat.t = 0;
    this.turtle = null;
    const prev = back.v, n = this.n;
    const { k } = this.targets[this.step];
    if (this.miss >= 2) this.app.say('반짝이는 돌로 뛰어 봐요!', true);
    else if (this.level === 1) this.app.say(`${n} 곱하기 ${k}${topic(k)} ${n}씩 ${k}번! ${prev}에서 ${n}만큼 더 가요`, true);
    else this.app.say(`${prev}에서 ${n}만큼 ${this.back ? '빼요' : '더 가요'}!`, true);
  }

  goToGoal() {
    const goal = { u: this.goalU + 40, lane: 1, v: this.goalV, goal: true };   // 섬 풀밭 위로
    this.choices = [];
    this.jumpTo(goal);
  }

  arrive() {
    const cat = this.cat;
    cat.mode = 'arrive'; cat.t = 0;
    this.over = true;
    this.recap = 0;
    sfx.fanfare();
    this.app.banner(this.back ? '집에 도착! 🏠' : '건넜다! 🐟', 1.6);
    // 구구단 노래 (1~9)
    const song = Array.from({ length: 9 }, (_, i) => chant(this.n, i + 1)).join(', ');
    setTimeout(() => { if (this.app.game === this) this.app.say(song, true); }, 900);
  }

  // ── 효과 ────────────────────────────────────────────
  float(x, y, text, color, size = 30) { this.floats.push({ x, y, text, color, size, age: 0, life: 1.3 }); }
  ring(u, lane, w) { this.rings.push({ u, lane, w, age: 0, life: 0.8 }); }
  splash(u, lane) {
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 220 + Math.random() * 260;
      this.drops.push({ u, lane, x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5 + Math.random() * 6, age: 0, life: 0.7 + Math.random() * 0.3 });
    }
    this.ring(u, lane, this.stoneW * 1.3);
    this.ring(u, lane, this.stoneW * 0.8);
  }

  // ── 루프 ────────────────────────────────────────────
  update(dt) {
    this.t += dt;
    const cat = this.cat;
    cat.t += dt;
    switch (cat.mode) {
      case 'crouch':
        if (cat.t >= CROUCH) { cat.mode = 'air'; cat.t = 0; sfx.jump(); }
        break;
      case 'air': {
        const k = Math.min(1, cat.t / AIR);
        cat.u = cat.from.u + (cat.to.u - cat.from.u) * k;
        cat.lane = cat.from.lane + (cat.to.lane - cat.from.lane) * k;
        cat.hop = Math.sin(k * Math.PI) * (cat.to.goal ? 150 : 120);
        if (k >= 1) this.land(cat.to);
        break;
      }
      case 'cheer':
        if (cat.t >= CHEER) this.newStep();
        break;
      case 'wobble':
        if (this.sinkStone) this.sinkStone.wob = Math.min(1, cat.t / 0.35);
        if (cat.t >= 0.4) {
          cat.mode = 'fall'; cat.t = 0;
          if (this.sinkStone) this.sinkStone.sinking = true;   // 기우뚱한 뒤에 가라앉는다
          sfx.splash();
          this.splash(cat.u, cat.lane);
          const p = this.pos(cat.u, cat.lane);
          this.float(p.x, p.y - 120, '퐁당!', '#7cc8f8', 46);
        }
        break;
      case 'fall':
        if (cat.t >= FALL) this.rescue();
        break;
      case 'rescue': {
        const tt = this.turtle;
        tt.t += dt;
        if (tt.t >= RISE + CARRY + HOP) this.afterRescue();
        else if (tt.t >= RISE + CARRY) {
          // 거북이 등에서 돌 위로 폴짝
          const k = (tt.t - RISE - CARRY) / HOP;
          cat.u = tt.to.u; cat.lane = tt.to.lane;
          cat.hop = Math.sin(k * Math.PI) * 60;
        } else if (tt.t >= RISE) {
          const k = (tt.t - RISE) / CARRY;
          const e = k * k * (3 - 2 * k);
          cat.u = tt.from.u + (tt.to.u - tt.from.u) * e;
          cat.lane = tt.from.lane + (tt.to.lane - tt.from.lane) * e;
        }
        break;
      }
      case 'arrive':
        if (this.recap < 9 && cat.t > 0.5 + this.recap * 0.3) { this.recap += 1; sfx.count(this.recap); }
        if (cat.t >= 3.6 && !this.reported) { this.reported = true; this.report(); }
        break;
      default:
        break;
    }
    // 가라앉는 돌
    for (const c of this.choices) if (c.sinking) { c.sink = Math.min(1, c.sink + dt * 2.2); if (c.sink >= 1) c.gone = true; }
    this.choices = this.choices.filter((c) => !c.gone || c === this.sinkStone);
    if (this.sinkStone && this.sinkStone.gone && cat.mode !== 'wobble') this.sinkStone = null;
    for (const c of this.choices) c.pop = Math.min(1, c.pop + dt * 4);
    // 카메라: 냥이를 따라간다 (도착 섬이 보이도록 끝에서 멈춤)
    const goalCam = this.goalU - (this.V ? 380 : 620);
    const want = Math.min(cat.u, Math.max(0, goalCam));
    this.cam += (want - this.cam) * Math.min(1, dt * 4);
    // 물보라
    for (const d of this.drops) { d.age += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 900 * dt; }
    this.drops = this.drops.filter((d) => d.age < d.life);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);
    for (const f of this.floats) f.age += dt;
    this.floats = this.floats.filter((f) => f.age < f.life);
  }

  report() {
    const stars = this.splashes === 0 ? 3 : this.splashes <= 2 ? 2 : 1;
    this.app.finishStones({
      n: this.n, level: this.level, back: this.back, stars, splashes: this.splashes,
      firstOk: this.firstOk, total: this.targets.length,
      seq: [this.startV, ...this.targets.map((t) => t.v), ...(this.back ? [0] : [])],
    });
  }

  // ── 그리기 ──────────────────────────────────────────
  draw(ctx) {
    const { W, H, V } = this;
    const t = this.t;
    D.drawWater(ctx, W, H, 0, t, this.cam, V);
    // 연잎 (장식): 돌 줄 사이 · 가장자리에
    for (let i = -2; i < 40; i++) {
      const u = i * 137 + ((i * 53) % 60);
      const lane = [-0.62, 0.5, 1.5, 2.62][((i % 4) + 4) % 4];
      const p = this.pos(u, lane);
      if (p.x < -80 || p.x > W + 80 || p.y < this.waterTop - 60 || p.y > H + 80) continue;
      D.drawLilyPad(ctx, p.x, p.y, 34 + (i % 3) * 8, i * 0.9, i % 5 === 0);
    }
    // 물가: 출발 언덕 · 도착 섬
    const s0 = this.pos(55, 1), g0 = this.pos(this.goalU - 55, 1);
    if (V) {
      if (s0.y < H + 60) D.drawBank(ctx, W, H, s0.y, 'bottom', t);
      if (g0.y > -60) D.drawBank(ctx, W, H, g0.y, 'top', t, 0);
    } else {
      if (s0.x > -60) D.drawBank(ctx, W, H, s0.x, 'left', t, 0);
      if (g0.x < W + 60) D.drawBank(ctx, W, H, g0.x, 'right', t, 0);
    }
    const gp = this.pos(this.goalU + (V ? 150 : 190), V ? 2.1 : 0.2);
    D.drawGoalSign(ctx, gp.x, gp.y + (V ? 40 : 60), this.back ? '0 · 집' : '🐟 도착', t);
    // 도착 섬의 엉금이: 기다리다가 냥이가 오면 하트 눈
    const tp = this.pos(this.goalU + (V ? 110 : 150), V ? 0.15 : 1.6);
    if (tp.x > -80 && tp.x < W + 80 && tp.y > -40 && tp.y < H + 160) {
      const happy = this.cat.mode === 'arrive';
      D.drawShadow(ctx, tp.x, tp.y, 80);
      D.drawTurtle(ctx, happy ? 'fun' : 'sit', happy ? 2 : [0, 0, 0, 1, 0, 0][Math.floor(t * 2) % 6], tp.x, tp.y, V ? 0.75 : 0.8, true);
    }
    const sp = this.pos(V ? -40 : -120, V ? 0.1 : -0.3);
    D.drawGoalSign(ctx, sp.x, sp.y + (V ? 40 : 60), `출발 ${this.startV}`, t + 1);
    // 수직선 자 (쉬움)
    if (this.level === 1) {
      const to = 9 * this.n + this.n;
      if (V) D.drawRuler(ctx, (v) => this.pos(this.uOf(v), 0).y, 0, to, this.n, 26, true, this.current().v);
      else D.drawRuler(ctx, (v) => this.pos(this.uOf(v), 0).x, 0, to, this.n, H - 30, false, this.current().v);
    }
    // 돌: 지나온 돌 + 고를 돌 (먼 줄부터)
    const stones = [
      ...this.path.filter((s) => !s.bank).map((s, i) => ({ ...s, path: true, lit: this.cat.mode === 'arrive' && i < this.recap })),
      ...this.choices.map((c) => ({ ...c, path: false })),
    ];
    const order = (s) => (V ? this.pos(s.u, s.lane).y : s.lane);
    stones.sort((a, b) => order(a) - order(b));
    for (const s of stones) {
      const p = this.pos(s.u, s.lane);
      if (p.x < -120 || p.x > W + 120 || p.y < -120 || p.y > H + 120) continue;
      const glow = !s.path && s.ok && this.miss >= 2 && this.cat.mode === 'idle';
      const w = this.stoneW * (s.path ? 0.92 : 0.6 + 0.4 * (s.pop ?? 1));
      D.drawStone(ctx, p.x, p.y, w, s.v, { path: s.path, glow: glow || s.lit, sink: s.sink || 0, wobble: s.wob && !s.gone ? 1 - (s.sink || 0) : 0, t });
    }
    this.drawCat(ctx);
    // 물결 · 물보라 · 글자
    D.drawRings(ctx, this.rings.map((r) => { const p = this.pos(r.u, r.lane); return { ...r, x: p.x, y: p.y + 14 }; }));
    D.drawDrops(ctx, this.drops.map((d) => { const p = this.pos(d.u, d.lane); return { ...d, x: p.x + d.x, y: p.y + d.y }; }));
    for (const f of this.floats) D.drawFloat(ctx, f);
    this.drawTop(ctx);
  }

  drawCat(ctx) {
    const cat = this.cat, t = this.t, sc = this.catScale;
    const p = this.pos(cat.u, cat.lane);
    const hat = this.app.hat;
    const feetY = p.y + 6;
    if (cat.mode === 'rescue') {
      const tt = this.turtle;
      const riding = tt.t < RISE + CARRY;
      // 엉금이: 물속에서 쑥 떠올라 냥이를 등에 태우고 앞 돌로 헤엄친다
      const tp = riding ? p : this.pos(tt.to.u, tt.to.lane);
      const rise = Math.min(1, tt.t / RISE);
      const away = tt.t > RISE + CARRY ? Math.min(1, (tt.t - RISE - CARRY) / HOP) : 0;
      const a = this.pos(tt.from.u, tt.from.lane), b = this.pos(tt.to.u, tt.to.lane);
      const dir = (this.V ? b.x - a.x : b.x - a.x) < -2 ? -1 : 1;
      const wy = tp.y + 26;                                  // 물 높이
      const ty = wy + (1 - rise) * 60 + away * 70;           // 등딱지 아래 가운데
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, this.W, wy + 4); ctx.clip();
      const seat = D.drawSwimTurtle(ctx, tp.x, ty, 0.9, t, dir);
      ctx.restore();
      D.drawRings(ctx, [{ x: tp.x, y: wy, w: 190, age: (t * 0.8) % 1, life: 1 }]);
      if (riding) {
        D.drawCat(ctx, 'groom', 0, p.x - dir * 6, seat + 6, sc * 0.9, { hat, t, flip: cat.flip });
        for (let i = 0; i < 3; i++) {
          const k = (t * 1.4 + i / 3) % 1;
          D.drawDrops(ctx, [{ x: p.x - 28 + i * 28, y: seat - 110 + k * 40, r: 5, age: k, life: 1, color: '#bfe8ff' }]);
        }
        if (rise >= 1) D.drawBubble(ctx, tp.x + dir * 96, ty - 70, tt.t < RISE + 0.4 ? '엉금이 왔어!' : '영차!', 22);
        return;
      }
      D.drawShadow(ctx, p.x, feetY, 90);
      D.drawCat(ctx, 'walk', 2, p.x, feetY - cat.hop, sc, { hat, t, flip: cat.flip });
      return;
    }
    if (cat.mode === 'fall') {
      // 퐁당: 물 아래로 쏙 (물 위만 보인다)
      const k = Math.min(1, cat.t / FALL);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, this.W, p.y + 16); ctx.clip();
      D.drawCat(ctx, 'surprise', 1, p.x, feetY + k * 150, sc, { hat, t, flip: cat.flip });
      ctx.restore();
      return;
    }
    let anim = 'groom', frame = 0, tilt = 0;
    const idleSeq = [0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 0, 0, 0, 0, 1, 2, 3, 4, 3, 4, 0, 0];
    switch (cat.mode) {
      case 'crouch': anim = 'surprise'; frame = 2; break;
      case 'air': anim = 'walk'; frame = cat.t < AIR * 0.5 ? 3 : 5; tilt = (this.V ? 0 : (cat.t < AIR * 0.5 ? -0.12 : 0.1)); break;
      case 'cheer': anim = 'happy'; frame = cat.t < 0.15 ? 2 : 3; break;
      case 'wobble': anim = 'surprise'; frame = 1; break;
      case 'arrive': anim = 'happy'; frame = [2, 3, 3, 4][Math.floor(cat.t * 5) % 4]; break;
      default: frame = idleSeq[Math.floor(t * 4) % idleSeq.length];
    }
    if (cat.hop < 20) D.drawShadow(ctx, p.x, feetY, 90);
    else D.drawShadow(ctx, p.x, feetY, 70, 0.1);
    D.drawCat(ctx, anim, frame, p.x, feetY - cat.hop, sc, { hat, t, flip: cat.flip, tilt });
  }

  // 위쪽: 뛰어 세기 띠 + 문제판
  drawTop(ctx) {
    const { W, V } = this;
    const t = this.t;
    const n = this.n;
    const vals = [this.startV, ...this.targets.map((x) => x.v), ...(this.back ? [0] : [])];
    const reached = this.path.length - 1 + (this.over ? 1 : 0);
    const slots = vals.map((v, i) => ({ v, state: i <= reached ? 'done' : i === reached + 1 && !this.over ? 'now' : 'todo' }));
    D.drawStrip(ctx, W / 2 + (V ? 0 : -60), 142, V ? W - 40 : 840, slots, `${this.back ? '−' : '+'}${n}`, t);
    if (this.over || this.step >= this.targets.length) return;
    const { k } = this.targets[this.step];
    const prev = this.current().v;
    const parts = this.level === 1
      ? [{ text: `${n} × ${k} = ` }, { text: '?', color: '#ff5c8a' }]
      : [{ text: `${prev} 다음은 ` }, { text: '?', color: '#ff5c8a' }];
    let sub = this.level === 1 ? `${n}씩 ${k}번` : this.back ? `${n}씩 거꾸로` : `${n}씩 뛰어요`;
    if (this.miss >= 1) sub = `힌트: ${prev} ${this.back ? '−' : '+'} ${n}`;
    const cx = V ? W / 2 : W - 250, cy = V ? 234 : 226;
    D.drawSign(ctx, cx, cy, parts, { size: V ? 50 : 50, sub, wiggle: 1, t, fill: this.miss >= 1 ? '#fff3c4' : '#fff' });
  }
}
