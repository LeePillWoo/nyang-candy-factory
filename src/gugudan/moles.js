// 🔨 두더지 잡기 — 위에 문제(6 × 7 = ?)가 나오면, 답을 든 두더지를 냥이가 뿅망치로 뿅!
//   한 판 10문제. 시간 제한은 없고, 단계에 따라 두더지가 올라와 있는 시간 · 수만 달라진다.
//   틀린 두더지는 "메롱~" 하고 들어간다(벌 없음). 두 번 틀리면 정답 두더지가 반짝.
//   덤: 정답을 든 황금 두더지(코인 2배), 한 번에 3연속 → 황금 뿅망치(다음 한 방 코인 2배).
import { sfx } from '../audio.js';
import { confusions, chant, askWords, topic } from './facts.js';
import * as D from './draw.js';

export const QUESTIONS = 10;
const LV = {
  1: { holes: 6, up: 2, stay: 4.0 },
  2: { holes: 6, up: 3, stay: 2.9 },
  3: { holes: 9, up: 4, stay: 2.1 },
};
const RISE = 0.22, HIDE = 0.24, HIT = 0.8, TEASE = 0.8;
const HOP = 0.2, SWING = 0.17;

const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

export class MolesGame {
  constructor(app, { dans, level, questions }) {
    this.app = app;
    this.dans = dans;
    this.level = level;
    this.cfg = LV[level] || LV[1];
    this.questions = questions;
    this.qi = 0;
    this.results = Array(questions.length).fill(null);   // 'star' 한 번에 · 'ok' 다시 해서
    this.misses = 0;
    this.firstOk = 0;
    this.missed = [];
    this.combo = 0;
    this.goldHammer = false;
    this.floats = [];
    this.t = 0;
    this.phase = 'ready';
    this.readyT = 0.8;
    this.startedAt = performance.now();
    this.cat = { x: 0, y: 0, mode: 'idle', t: 0, home: true };
    this.relayout();
    this.moles = this.holes.map((hole) => ({ hole, state: 'hidden', t: 0, wait: rnd(0.1, 0.6), num: null, ok: false, gold: false, stay: 3 }));
    this.cat.x = this.home.x; this.cat.y = this.home.y;
    app.say('두더지 잡기! 문제의 답을 든 두더지를 뿅!', true);
  }

  relayout() {
    const { W, H, portrait } = this.app;
    this.W = W; this.H = H; this.V = portrait;
    const rows = this.cfg.holes / 3;
    const xs = portrait ? [160, 360, 560] : [380, 660, 940];
    const ys = portrait
      ? (rows === 2 ? [H * 0.5, H * 0.7] : [H * 0.42, H * 0.59, H * 0.76])
      : (rows === 2 ? [455, 650] : [382, 558, 734]);
    this.holeW = portrait ? (rows === 2 ? 156 : 142) : rows === 2 ? 176 : 158;
    this.moleS = portrait ? (rows === 2 ? 1.0 : 0.92) : rows === 2 ? 1.16 : 0.94;
    this.catScale = portrait ? 0.7 : 0.74;
    const old = this.holes;
    this.holes = [];
    ys.forEach((y, r) => xs.forEach((x, c) => this.holes.push({ x, y: Math.round(y), r, c, i: r * 3 + c })));
    if (old && this.moles) this.moles.forEach((m, i) => { m.hole = this.holes[i]; });
    this.home = portrait ? { x: W / 2, y: H - 60 } : { x: 140, y: 730 };
    if (this.cat && this.cat.mode === 'idle') {
      const m = this.cat.at;
      const p = m ? this.standAt(m.hole) : this.home;
      this.cat.x = p.x; this.cat.y = p.y;
    }
  }

  // 구멍 왼쪽에 서서 오른쪽으로 내려친다
  standAt(hole) { return { x: hole.x - this.holeW * 0.6, y: hole.y + 22 }; }

  // ── 문제 ────────────────────────────────────────────
  ask() {
    const q = this.questions[this.qi];
    this.q = { ...q, answer: q.a * q.b };
    this.pool = confusions(q.a, q.b);
    this.misses = 0;
    this.phase = 'ask';
    this.lastOkSeen = this.t;
    this.spawnWait = 0.25;
    this.app.say(`${q.review ? '다시 도전! ' : ''}${askWords(q.a, q.b)}`, true);
  }

  spawn() {
    const vis = this.moles.filter((m) => m.state === 'rise' || m.state === 'up');
    if (vis.length >= this.cfg.up || this.spawnWait > 0) return;
    const free = this.moles.filter((m) => m.state === 'hidden' && m.wait <= 0);
    if (!free.length) return;
    const m = free[Math.floor(Math.random() * free.length)];
    const hasOk = vis.some((v) => v.ok);
    // 정답 두더지가 안 보인 지 1초가 넘으면 꼭 정답으로 (기다리기만 하지 않게)
    const giveOk = !hasOk && (this.t - this.lastOkSeen > 1.0 || Math.random() < 0.5);
    if (giveOk) {
      m.num = this.q.answer; m.ok = true; m.gold = Math.random() < 0.18;
    } else {
      const shown = this.moles.filter((v) => v.state !== 'hidden').map((v) => v.num);   // 지금 보이는 숫자와 겹치지 않게
      const pool = this.pool.filter((x) => !shown.includes(x));
      m.num = pool.length ? pool[Math.floor(Math.random() * Math.min(pool.length, 6))] : this.q.answer + 1;
      m.ok = false; m.gold = false;
    }
    m.state = 'rise'; m.t = 0;
    m.stay = this.cfg.stay * rnd(0.85, 1.15);
    this.spawnWait = rnd(0.2, 0.5);
    sfx.pip();
  }

  // ── 누르기 ──────────────────────────────────────────
  tap(x, y) {
    if (this.phase !== 'ask' || this.cat.mode !== 'idle') return;
    let best = null;
    for (const m of this.moles) {
      const h = m.hole;
      const top = h.y - 165 * this.moleS;
      if (x < h.x - this.holeW * 0.62 || x > h.x + this.holeW * 0.62 || y < top - 10 || y > h.y + 46) continue;
      const d = Math.abs(x - h.x) + Math.abs(y - (h.y - 60 * this.moleS));
      if (!best || d < best.d) best = { m, d };
    }
    if (best) this.swingAt(best.m);
  }

  swingAt(m) {
    const cat = this.cat;
    const to = this.standAt(m.hole);
    cat.target = m;
    cat.at = m;
    cat.from = { x: cat.x, y: cat.y };
    cat.to = to;
    cat.t = 0;
    cat.mode = Math.hypot(to.x - cat.x, to.y - cat.y) < 8 ? 'swing' : 'hop';
    if (cat.mode === 'swing') sfx.swoosh(); else sfx.jump();
  }

  // 뿅망치가 닿는 순간
  impact(m) {
    const up = m.state === 'rise' || m.state === 'up';
    if (!up) { sfx.tap(); this.cat.mode = 'after'; this.cat.t = 0; return; }   // 헛방
    if (m.ok) this.correct(m); else this.wrong(m);
  }

  correct(m) {
    const q = this.q;
    const first = this.misses === 0;
    m.state = 'hit'; m.t = 0;
    sfx.bonk();
    setTimeout(() => sfx.correct(), 120);
    let coins = 1 + (m.gold ? 1 : 0);
    if (this.goldHammer) { coins *= 2; this.goldHammer = false; }
    this.app.addCoins(coins);
    const top = m.hole.y - 150 * this.moleS;
    this.float(m.hole.x, top - 10, '뿅!', '#ff8fab', 44);
    this.float(m.hole.x + 60, top + 30, `+${coins}`, '#ffd23f', 34);
    this.app.say(chant(q.a, q.b), true);
    const star = this.app.recordFact(q.a, q.b, first);
    if (star) this.float(m.hole.x, top - 60, '⭐ 익혔어요!', '#7fdcae', 28);
    this.results[this.qi] = first ? 'star' : 'ok';
    if (first) {
      this.firstOk += 1;
      this.combo += 1;
      this.app.mission('gugudan.first');
      if (this.combo % 3 === 0) { this.goldHammer = true; this.app.banner('✨ 황금 뿅망치! 다음 한 방 코인 2배', 1.4); }
    } else {
      this.combo = 0;
      this.missed.push({ a: q.a, b: q.b });
    }
    this.app.mission('gugudan.mole');
    for (const o of this.moles) if (o !== m && (o.state === 'rise' || o.state === 'up')) { o.state = 'hide'; o.t = 0; }
    this.phase = 'next';
    this.nextT = 1.0;
    this.cat.mode = 'cheer'; this.cat.t = 0;
  }

  wrong(m) {
    m.state = 'tease'; m.t = 0;
    sfx.bonk();
    setTimeout(() => sfx.giggle(), 100);
    this.misses += 1;
    this.combo = 0;
    const top = m.hole.y - 150 * this.moleS;
    this.float(m.hole.x, top - 14, '메롱~', '#b592f5', 34);
    if (this.misses === 2) this.app.say('반짝이는 두더지를 찾아봐요!', true);
    else this.app.say(`${m.num}${topic(m.num)} 아니에요! 다시 찾아봐요`, true);
    this.cat.mode = 'oops'; this.cat.t = 0;
  }

  finish() {
    this.phase = 'done';
    for (const m of this.moles) if (m.state === 'rise' || m.state === 'up') { m.state = 'hide'; m.t = 0; }
    sfx.fanfare();
    this.app.banner('두더지 다 잡았다! 🔨', 1.6);
    const secs = Math.round((performance.now() - this.startedAt) / 1000);
    const total = this.questions.length;
    const stars = this.firstOk >= total ? 3 : this.firstOk >= total - 2 ? 2 : 1;
    setTimeout(() => {
      if (this.app.game !== this) return;
      this.app.finishMoles({ level: this.level, dans: this.dans, firstOk: this.firstOk, total, missed: this.missed, secs, stars });
    }, 1700);
  }

  float(x, y, text, color, size = 30) { this.floats.push({ x, y, text, color, size, age: 0, life: 1.1 }); }

  // ── 루프 ────────────────────────────────────────────
  update(dt) {
    this.t += dt;
    if (this.phase === 'ready') { this.readyT -= dt; if (this.readyT <= 0) this.ask(); }
    if (this.phase === 'next') {
      this.nextT -= dt;
      if (this.nextT <= 0) {
        this.qi += 1;
        if (this.qi >= this.questions.length) this.finish(); else this.ask();
      }
    }
    if (this.phase === 'ask') {
      this.spawnWait -= dt;
      if (this.moles.some((m) => m.ok && (m.state === 'rise' || m.state === 'up'))) this.lastOkSeen = this.t;
      this.spawn();
    }
    for (const m of this.moles) {
      m.t += dt;
      if (m.state === 'hidden') m.wait -= dt;
      else if (m.state === 'rise' && m.t >= RISE) { m.state = 'up'; m.t = 0; }
      else if (m.state === 'up' && m.t >= m.stay) { m.state = 'hide'; m.t = 0; }
      else if ((m.state === 'hit' && m.t >= HIT) || (m.state === 'tease' && m.t >= TEASE)) { m.state = 'hide'; m.t = 0; }
      else if (m.state === 'hide' && m.t >= HIDE) { m.state = 'hidden'; m.t = 0; m.wait = rnd(0.35, 0.9); m.ok = false; m.gold = false; }
    }
    // 냥이
    const cat = this.cat;
    cat.t += dt;
    if (cat.mode === 'hop') {
      const k = Math.min(1, cat.t / HOP);
      cat.x = cat.from.x + (cat.to.x - cat.from.x) * k;
      cat.y = cat.from.y + (cat.to.y - cat.from.y) * k;
      cat.arc = Math.sin(k * Math.PI) * 60;
      if (k >= 1) { cat.mode = 'swing'; cat.t = 0; cat.arc = 0; sfx.swoosh(); }
    } else if (cat.mode === 'swing') {
      if (cat.t >= SWING) { cat.mode = 'after'; cat.t = 0; this.impact(cat.target); }
    } else if (cat.mode === 'after' && cat.t >= 0.25) { cat.mode = 'idle'; cat.t = 0; }
    else if (cat.mode === 'oops' && cat.t >= 0.5) { cat.mode = 'idle'; cat.t = 0; }
    else if (cat.mode === 'cheer' && cat.t >= 0.8) { cat.mode = 'idle'; cat.t = 0; }
    for (const f of this.floats) f.age += dt;
    this.floats = this.floats.filter((f) => f.age < f.life);
  }

  // ── 그리기 ──────────────────────────────────────────
  rise(m) {
    switch (m.state) {
      case 'rise': return Math.min(1, m.t / RISE);
      case 'up': case 'tease': return 1;
      case 'hit': return m.t < HIT * 0.6 ? 1 : 1 - (m.t - HIT * 0.6) / (HIT * 0.4) * 0.4;
      case 'hide': return Math.max(0, 1 - m.t / HIDE);
      default: return 0;
    }
  }

  draw(ctx) {
    const { W, H, V } = this;
    const t = this.t;
    D.drawGarden(ctx, W, H, 0, t);
    for (const m of this.moles) D.drawHoleBack(ctx, m.hole.x, m.hole.y, this.holeW);
    const hint = this.phase === 'ask' && this.misses >= 2;
    const sorted = [...this.moles].sort((a, b) => a.hole.y - b.hole.y);
    for (const m of sorted) {
      const r = this.rise(m);
      if (r > 0) {
        const blink = m.state === 'up' && (t * 0.7 + m.hole.i * 0.37) % 3 < 0.12;
        D.drawMole(ctx, m.hole.x, m.hole.y, this.moleS, r, {
          num: m.num, state: m.state === 'hit' ? 'hit' : m.state === 'tease' ? 'tease' : 'up',
          t: t + m.hole.i, gold: m.gold, glow: hint && m.ok && m.state !== 'hide', blink,
        });
      }
      D.drawHoleFront(ctx, m.hole.x, m.hole.y, this.holeW);
    }
    this.drawCat(ctx);
    for (const f of this.floats) D.drawFloat(ctx, f);
    this.drawTop(ctx);
  }

  drawCat(ctx) {
    const cat = this.cat, sc = this.catScale, t = this.t;
    const hat = this.app.hat;
    const y = cat.y - (cat.arc || 0);
    D.drawShadow(ctx, cat.x, cat.y, 90);
    const gold = this.goldHammer;
    // 자세마다 손(망치 손잡이) 자리 · 망치 각도
    let anim = 'groom', frame = 0, hx = 30, hy = -46, ang = -1.25;
    switch (cat.mode) {
      case 'hop': anim = 'walk'; frame = 3; hx = 18; hy = -120; ang = -2.0; break;
      case 'swing': {
        const k = Math.min(1, cat.t / SWING);
        const e = k * k;
        anim = k < 0.5 ? 'happy' : 'surprise'; frame = k < 0.5 ? 3 : 2;
        hx = 10 + (52 - 10) * e; hy = -150 + (-62 + 150) * e; ang = -2.3 + (0.4 + 2.3) * e;
        break;
      }
      case 'after': anim = 'surprise'; frame = 2; hx = 52; hy = -62; ang = 0.4; break;
      case 'cheer': anim = 'happy'; frame = 3; hx = 8; hy = -152; ang = -1.7 + Math.sin(cat.t * 14) * 0.25; break;
      case 'oops': anim = 'surprise'; frame = 1; hx = 34; hy = -66; ang = -0.7; break;
      default: {
        const seq = [0, 0, 0, 0, 0, 5, 5, 0, 0, 0];
        frame = seq[Math.floor(t * 3) % seq.length];
      }
    }
    const behind = cat.mode === 'idle' || cat.mode === 'hop';
    const hand = { x: cat.x + hx * sc / 0.74, y: y + hy * sc / 0.74 };
    if (behind) D.drawHammer(ctx, hand.x, hand.y, ang, sc * 0.95, gold);
    D.drawCat(ctx, anim, frame, cat.x, y, sc, { hat, t });
    if (!behind) D.drawHammer(ctx, hand.x, hand.y, ang, sc * 0.95, gold);
  }

  drawTop(ctx) {
    const { W, V } = this;
    const t = this.t;
    const cy = V ? 226 : 192;
    if (this.q && this.phase !== 'done') {
      const q = this.q;
      const solved = this.phase === 'next';
      D.drawSign(ctx, W / 2, cy, [{ text: `${q.a} × ${q.b} = ` }, { text: solved ? String(q.answer) : '?', color: solved ? '#23a86b' : '#ff5c8a' }],
        { size: V ? 64 : 62, sub: q.review ? '🔁 다시 도전' : `${q.a}단`, wiggle: solved ? 0 : 1, t });
    }
    D.drawDots(ctx, W / 2, V ? 132 : 104, this.results, this.qi, t);
    if (this.goldHammer && this.phase !== 'done') D.drawSparkle(ctx, W / 2 + (V ? 230 : 280), cy, 22 + Math.sin(t * 6) * 3, '#ffd23f', t);
  }
}
