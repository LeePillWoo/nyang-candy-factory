// 사탕 포장 놀이 — 2~4단계 그림 레벨.
// 낱개 사탕(1) · 사탕 막대(10) · 사탕 상자(100) 로 수 모형처럼 다룬다.
//   덧셈: 두 쟁반을 모으고, 낱개 10개 → 막대 1개로 "포장" (받아올림)
//   뺄셈: 손님에게 자리별로 주고, 모자라면 막대를 "뜯어" 낱개 10개로 (받아내림)
//   곱셈: 기계로 봉지마다 같은 묶음 → 한 쟁반에 모아 포장
//   나눗셈: 막대부터 봉지에 하나씩 나누고, 모자라면 뜯어서 낱개로 마저 나눔
// 게임 쪽(game.js)은 env 로 필요한 것(시간·날리기·말풍선·안내 등)을 넘겨준다.
import { OUTLINE } from './characters.js';

const PLACE_NAME = ['낱개', '막대', '상자'];
const PALETTE = ['#ff6b8b', '#ffb347', '#5ccf95', '#5bc0f8', '#a77bf3', '#ffd84d'];
const STRAWBERRY = '#ff6b8b', GRAPE = '#a77bf3';

// 조각 크기 (배율 1 기준, px)
const ONE = 26;                 // 낱개 칸
const STICK_W = 15, STICK_H = 70, STICK_STEP = 19;
const BOX = 40, BOX_STEP = 44;
const PAD = 12, COL_GAP = 12, AREA_GAP = 26, TOP_BAND = 18;

const digitsOf = (n) => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10];

class Area {
  constructor(kind, n, places, opts = {}) {
    this.kind = kind;                 // 'tray' | 'bag'
    this.places = places;             // 보여 줄 자리 수 (1~3)
    this.onesCols = opts.onesCols || 5;
    this.fill = opts.fill || '#f7e0c4';
    const ds = digitsOf(n);
    const color = opts.color;
    this.items = [0, 1, 2].map((p) => Array.from({ length: ds[p] }, (_, i) => color || PALETTE[(i + p) % PALETTE.length]));
    this.res = [0, 0, 0];             // 날아오는 중이라 자리를 비워 둔 개수
    this.wobble = 0;
    this.nudge = -1;                  // 엉뚱한 곳을 눌렀을 때 맞는 칸을 흔들어 알려 줌
  }
  count(p) { return this.items[p].length; }
  shown(p) { return this.items[p].length + this.res[p]; }
  value() { return this.count(0) + this.count(1) * 10 + this.count(2) * 100; }

  // ── 크기 계산 (배율 1) ──
  colSize(p) {
    const n = Math.max(1, this.shown(p));
    if (p === 0) {
      const cols = Math.min(this.onesCols, n), rows = Math.ceil(n / this.onesCols);
      return { w: cols * ONE, h: rows * ONE, cols };
    }
    if (p === 1) {
      const per = n <= 5 ? n : n <= 10 ? 5 : 10;
      const rows = Math.ceil(n / per);
      return { w: (per - 1) * STICK_STEP + STICK_W, h: rows * (STICK_H + 6) - 6, cols: per };
    }
    const per = Math.min(3, n), rows = Math.ceil(n / 3);
    return { w: (per - 1) * BOX_STEP + BOX, h: rows * BOX_STEP - (BOX_STEP - BOX), cols: per };
  }
  naturalSize() {
    let w = PAD * 2, h = 0;
    for (let p = this.places - 1; p >= 0; p--) {
      const c = this.colSize(p);
      w += c.w + (p > 0 ? COL_GAP : 0);
      h = Math.max(h, c.h);
    }
    return { w, h: h + PAD * 2 + TOP_BAND };
  }

  // 배율 s, 가운데 x, 바닥 bottom 으로 배치
  place(x, bottom, s) {
    const nat = this.naturalSize();
    this.s = s;
    this.w = nat.w * s; this.h = nat.h * s;
    this.x = x; this.bottom = bottom; this.top = bottom - this.h;
    this.cols = [];
    let cx = x - this.w / 2 + PAD * s;
    for (let p = this.places - 1; p >= 0; p--) {
      const c = this.colSize(p);
      this.cols[p] = { x0: cx, x1: cx + c.w * s, cols: c.cols, w: c.w * s };
      cx += (c.w + COL_GAP) * s;
    }
  }
  // p 자리 i 번째 조각의 중심 (아래에서 위로 쌓음)
  slot(p, i) {
    const s = this.s, col = this.cols[p];
    const floor = this.bottom - PAD * s;
    if (p === 0) {
      const c = i % col.cols, r = Math.floor(i / col.cols);
      return { x: col.x0 + (c + 0.5) * ONE * s, y: floor - (r + 0.5) * ONE * s };
    }
    if (p === 1) {
      const c = i % col.cols, r = Math.floor(i / col.cols);
      return { x: col.x0 + (STICK_W / 2 + c * STICK_STEP) * s, y: floor - (STICK_H / 2 + r * (STICK_H + 6)) * s };
    }
    const c = i % col.cols, r = Math.floor(i / col.cols);
    return { x: col.x0 + (BOX / 2 + c * BOX_STEP) * s, y: floor - (BOX / 2 + r * BOX_STEP) * s };
  }
  colRect(p) {
    const col = this.cols[p];
    const pad = 14;
    return { x0: col.x0 - pad, x1: col.x1 + pad, y0: this.top - pad, y1: this.bottom + pad };
  }
  hit(x, y) { return x >= this.x - this.w / 2 - 10 && x <= this.x + this.w / 2 + 10 && y >= this.top - 14 && y <= this.bottom + 14; }
  hitCol(x, y) {
    for (let p = 0; p < this.places; p++) {
      const r = this.colRect(p);
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return p;
    }
    return -1;
  }
}

export class Blocks {
  constructor(env, p) {
    this.env = env;
    this.p = p;
    this.mode = p.mode;
    this.areas = [];
    this.badges = [];
    this.fx = [];
    this.inflight = 0;
    this.finished = false;
    this.step = null;
    const places = String(Math.max(p.a, p.b, p.answer)).length;
    this.places = Math.min(3, places);

    if (this.mode === 'add') {
      this.A = new Area('tray', p.a, this.places, { color: STRAWBERRY, fill: '#ffe2ea' });
      this.B = new Area('tray', p.b, this.places, { color: GRAPE, fill: '#efe6ff' });
      this.areas = [this.A, this.B];
    } else if (this.mode === 'sub') {
      this.A = new Area('tray', p.a, this.places);
      this.need = digitsOf(p.b);
      this.areas = [this.A];
    } else if (this.mode === 'mul') {
      this.bags = Array.from({ length: p.b }, (_, i) => new Area('bag', 0, 2, { onesCols: 3, fill: ['#f1d3a6', '#c6f0dc', '#c9e8ff', '#ffc9d6'][i % 4] }));
      this.A = null;
      this.filled = 0;
      this.areas = [...this.bags];
    } else if (this.mode === 'div') {
      this.A = new Area('tray', p.a, 2);
      this.bags = Array.from({ length: p.b }, (_, i) => new Area('bag', 0, 2, { onesCols: 3, fill: ['#f1d3a6', '#c6f0dc', '#c9e8ff'][i % 3] }));
      this.areas = [this.A, ...this.bags];
      this.dealt = 0;
    }
    this.layout();
    this.next();
  }

  // ── 배치: 계산대 폭에 맞춰 배율을 줄인다 ──
  layout() {
    const t = this.env.table();
    const room = t.x1 - t.x0 - 24;
    const sizes = this.areas.map((a) => a.naturalSize());
    const total = sizes.reduce((s, z) => s + z.w, 0) + AREA_GAP * Math.max(0, this.areas.length - 1);
    const maxH = Math.max(...sizes.map((z) => z.h));
    const s = Math.min(1, room / total, t.maxH / maxH);
    let x = (t.x0 + t.x1) / 2 - (total * s) / 2;
    this.areas.forEach((a, i) => {
      a.place(x + (sizes[i].w * s) / 2, t.top, s);
      x += (sizes[i].w + AREA_GAP) * s;
    });
  }
  centerX() { return this.areas.length ? this.areas.reduce((s, a) => s + a.x, 0) / this.areas.length : null; }

  // ── 다음에 할 일 ──
  next() {
    if (this.finished) return;
    const st = this.plan();
    this.step = st;
    if (!st) { this.finished = true; this.env.tip(null); this.env.done(); return; }
    this.env.tip(st.tip, st.say);
  }

  plan() {
    const A = this.A;
    switch (this.mode) {
      case 'add':
        if (this.B) return { type: 'merge', tip: '👆 보라 쟁반을 눌러 한 쟁반에 모아요!', say: '보라 쟁반을 눌러서 한 쟁반에 모아요' };
        return this.packStep(A);
      case 'mul':
        if (this.filled < this.bags.length) return { type: 'fill', tip: '👆 사탕 기계를 눌러 봉지를 채워요!', say: this.filled ? null : `사탕 기계를 눌러서 ${this.p.a}개씩 담아요` };
        if (!A) return { type: 'merge', tip: '👆 봉지를 눌러 한 쟁반에 모아요!', say: '봉지를 눌러서 한 쟁반에 모아요' };
        return this.packStep(A);
      case 'sub': {
        let pl = 0;
        while (pl < 3 && !this.need[pl]) pl++;
        if (pl >= 3) return null;
        if (A.count(pl) >= this.need[pl]) {
          return { type: 'give', area: A, place: pl, n: this.need[pl], tip: `👆 ${PLACE_NAME[pl]}를 눌러 ${this.need[pl]}개 주세요`, say: `${PLACE_NAME[pl]} ${this.need[pl]}개를 주세요` };
        }
        let q = pl + 1;
        while (q < 3 && !A.count(q)) q++;
        return { type: 'unpack', area: A, place: q, tip: `${PLACE_NAME[pl]}가 모자라요! 👆 ${PLACE_NAME[q]}를 눌러 뜯어요`, say: `${PLACE_NAME[pl]}가 모자라요. ${PLACE_NAME[q]}를 뜯어요` };
      }
      case 'div': {
        const b = this.bags.length;
        if (A.count(1) >= b) return { type: 'deal', area: A, place: 1, tip: '👆 막대를 눌러 한 봉지에 하나씩!', say: '막대를 한 봉지에 하나씩 나눠요' };
        if (A.count(0) >= b) return { type: 'deal', area: A, place: 0, tip: '👆 낱개를 눌러 한 봉지에 하나씩!', say: '낱개를 한 봉지에 하나씩 나눠요' };
        if (A.count(1) > 0) return { type: 'unpack', area: A, place: 1, tip: '막대가 모자라요! 👆 막대를 뜯어 낱개로!', say: '똑같이 나눌 수 없어요. 막대를 뜯어요' };
        return null;
      }
    }
    return null;
  }

  packStep(A) {
    if (A.count(0) >= 10) return { type: 'pack', area: A, place: 0, tip: '낱개가 10개 넘었어요! 👆 낱개를 눌러 포장!', say: '낱개가 10개 넘었어요. 막대로 포장해요' };
    if (A.count(1) >= 10) return { type: 'pack', area: A, place: 1, tip: '막대가 10개 넘었어요! 👆 막대를 눌러 포장!', say: '막대가 10개 넘었어요. 상자로 포장해요' };
    return null;
  }

  // 손가락 힌트 위치
  hand() {
    const st = this.step;
    if (!st || this.inflight) return null;
    if (st.type === 'fill') return this.env.machineHand();
    if (st.type === 'merge') {
      const src = this.mode === 'add' ? this.B : this.bags[0];
      return { x: src.x, y: src.top + src.h * 0.4 };
    }
    const r = st.area.colRect(st.place);
    return { x: (r.x0 + r.x1) / 2, y: (st.area.top + st.area.bottom) / 2 };
  }

  // ── 입력 ──
  tap(x, y) {
    const st = this.step;
    if (!st || this.inflight || this.finished) return false;
    // 동작을 시작하면 지금 단계를 비운다 (날아가는 동안 손가락·강조 숨김, 끝나면 next())
    if (st.type === 'fill') {
      if (!this.env.machineHit(x, y)) return false;
      this.step = null;
      this.doFill();
      return true;
    }
    if (st.type === 'merge') {
      const srcs = this.mode === 'add' ? [this.B] : this.bags;
      if (!srcs.some((a) => a.hit(x, y))) return false;
      this.step = null;
      this.doMerge(srcs);
      return true;
    }
    const A = st.area;
    if (!A.hit(x, y)) return false;
    if (A.hitCol(x, y) !== st.place) { A.nudge = this.env.time(); this.env.sfx.tap(); return true; }
    this.step = null;
    if (st.type === 'pack') this.doPack(A, st.place);
    else if (st.type === 'unpack') this.doUnpack(A, st.place);
    else if (st.type === 'give') this.doGive(A, st.place, st.n);
    else if (st.type === 'deal') this.doDeal(A, st.place);
    return true;
  }

  // ── 날리기 도우미 ──
  // from 위치의 조각을 to 영역 p 자리로 (자리는 미리 비워 둠)
  launch(from, place, color, target, onLand, delay = 0, dur = 0.5) {
    this.inflight++;
    const go = () => {
      const to = typeof target === 'function' ? target() : target;
      this.env.fly(from.x, from.y, to.x, to.y, this.pieceDrawer(place, color), () => {
        onLand?.();
        this.inflight--;
        if (!this.inflight) setTimeout(() => this.next(), 260);
      }, dur);
    };
    if (delay) setTimeout(go, delay * 1000); else go();
  }
  reserveIn(area, place, color) {
    const i = area.shown(place);
    area.res[place]++;
    return { i, land: () => { area.res[place]--; area.items[place].push(color); area.wobble = 0.6; } };
  }
  takeOut(area, place) {
    const i = area.count(place) - 1;
    const pos = area.slot(place, i);
    const color = area.items[place].pop();
    return { pos, color };
  }

  doMerge(srcs) {
    const A = this.A || new Area('tray', 0, Math.max(2, this.places), { fill: '#f7e0c4' });
    const moves = [];
    for (const S of srcs) {
      for (let pl = 0; pl < S.places; pl++) {
        while (S.count(pl)) {
          const { pos, color } = this.takeOut(S, pl);
          moves.push({ pos, pl, color, r: this.reserveIn(A, pl, color) });
        }
      }
    }
    this.A = A;
    this.B = null;
    this.areas = [A];
    this.bags = this.mode === 'mul' ? [] : this.bags;
    this.layout();
    this.env.sfx.give();
    moves.forEach((m, k) => this.launch(m.pos, m.pl, m.color, () => A.slot(m.pl, m.r.i), () => { m.r.land(); this.env.sfx.pop(k % 10); }, k * 0.05, 0.55));
  }

  doPack(A, pl) {
    const outs = [];
    for (let k = 0; k < 10; k++) outs.push(this.takeOut(A, pl));
    const r = this.reserveIn(A, pl + 1, PALETTE[pl + 1]);
    this.layout();
    const col = A.cols[pl];
    const G = { x: (col.x0 + col.x1) / 2, y: A.top - 46 };
    let landed = 0;
    this.inflight++;   // 포장 전체를 하나의 일로 묶는다
    outs.forEach((o, k) => this.launch(o.pos, pl, o.color, G, () => {
      this.env.sfx.pop(k);
      if (++landed < 10) return;
      // 띠링! 10개가 막대(상자) 하나로
      this.env.sfx.coin();
      this.sparkle(G.x, G.y);
      this.env.catSay(pl === 0 ? '낱개 10개 = 막대 1개!' : '막대 10개 = 상자 1개!');
      this.launch(G, pl + 1, null, () => A.slot(pl + 1, r.i), () => { r.land(); this.env.sfx.hop(); }, 0.35, 0.55);
      this.inflight--;
    }, k * 0.06, 0.45));
  }

  doUnpack(A, q) {
    const o = this.takeOut(A, q);
    const reserves = [];
    for (let k = 0; k < 10; k++) {
      const color = PALETTE[(A.shown(q - 1) + k) % PALETTE.length];
      reserves.push({ color, r: this.reserveIn(A, q - 1, color) });
    }
    this.layout();
    const col = A.cols[q - 1];
    const G = { x: (col.x0 + col.x1) / 2, y: A.top - 46 };
    this.inflight++;
    this.launch(o.pos, q, null, G, () => {
      this.env.sfx.give();
      this.sparkle(G.x, G.y);
      this.env.catSay(q === 1 ? '막대 1개 = 낱개 10개!' : '상자 1개 = 막대 10개!');
      reserves.forEach((m, k) => this.launch(G, q - 1, m.color, () => A.slot(q - 1, m.r.i), () => { m.r.land(); this.env.sfx.pop(k); }, 0.25 + k * 0.06, 0.45));
      this.inflight--;
    }, 0, 0.45);
  }

  doGive(A, pl, n) {
    const outs = [];
    for (let k = 0; k < n; k++) outs.push(this.takeOut(A, pl));
    this.need[pl] = 0;
    this.layout();
    this.env.sfx.give();
    let landed = 0;
    outs.forEach((o, k) => this.launch(o.pos, pl, o.color, () => this.env.mouth(), () => {
      this.env.sfx.pop(k + 3);
      if (++landed === n) this.env.customerEat();
    }, k * 0.12, 0.55));
  }

  doDeal(A, pl) {
    const moves = this.bags.map((bag) => {
      const o = this.takeOut(A, pl);
      return { ...o, bag, r: this.reserveIn(bag, pl, o.color) };
    });
    this.layout();
    this.env.sfx.tap();
    moves.forEach((m, k) => this.launch(m.pos, pl, m.color, () => m.bag.slot(pl, m.r.i), () => { m.r.land(); this.env.sfx.pop(k); }, k * 0.12, 0.5));
  }

  doFill() {
    const bag = this.bags[this.filled++];
    const ds = digitsOf(this.p.a);
    const from = this.env.chute();
    const moves = [];
    for (let pl = 1; pl >= 0; pl--) {
      for (let k = 0; k < ds[pl]; k++) {
        const color = PALETTE[(moves.length + this.filled) % PALETTE.length];
        moves.push({ pl, color, r: this.reserveIn(bag, pl, color) });
      }
    }
    this.layout();
    this.env.machineTap();
    moves.forEach((m, k) => this.launch(from, m.pl, m.color, () => bag.slot(m.pl, m.r.i), () => { m.r.land(); this.env.sfx.pop(k); }, k * 0.07, 0.5));
  }

  sparkle(x, y) { this.fx.push({ x, y, born: this.env.time() }); }

  // ── 오답 힌트: 10씩 뛰어 세기 ──
  countTargets() {
    const area = this.mode === 'div' ? this.bags[0] : this.A;
    if (!area) return [];
    const out = [];
    let sum = 0;
    for (const pl of [2, 1, 0]) {
      if (pl >= area.places) continue;
      for (let i = 0; i < area.count(pl); i++) {
        sum += [1, 10, 100][pl];
        out.push({ ...area.slot(pl, i), value: sum, place: pl, area });
      }
    }
    return out;
  }
  addBadge(t) { this.badges.push({ ...t, born: this.env.time() }); t.area.wobble = 0.3; }
  clearBadges() { this.badges = []; }

  // ── 그리기 ──
  pieceDrawer(place, color) {
    return (ctx) => drawPiece(ctx, 0, 0, place, this.areas[0]?.s || 1, color, this.env.drawCandy);
  }

  draw(ctx) {
    const t = this.env.time();
    for (const a of this.areas) {
      a.wobble = Math.max(0, a.wobble - 0.03);
      ctx.save();
      ctx.translate(a.x, a.bottom);
      ctx.rotate(Math.sin(t * 30) * a.wobble * 0.02);
      ctx.translate(-a.x, -a.bottom);
      drawArea(ctx, a);
      const st = this.step;
      for (let pl = 0; pl < a.places; pl++) {
        // 지금 눌러야 할 칸은 노랗게, 잘못 누르면 흔들어 알려 줌
        const active = st && !this.inflight && st.area === a && st.place === pl;
        if (active) {
          const r = a.colRect(pl);
          const shake = t - a.nudge < 0.5 ? Math.sin(t * 40) * 5 : 0;
          ctx.save();
          ctx.fillStyle = 'rgba(255, 214, 92, .45)';
          ctx.beginPath();
          ctx.roundRect(r.x0 + 8 + shake, a.top + 10, r.x1 - r.x0 - 16, a.bottom - a.top - 14, 12);
          ctx.fill();
          ctx.restore();
        }
        const n = a.count(pl);
        if (!n && !a.res[pl]) drawGhost(ctx, a.slot(pl, 0), pl, a.s);
        for (let i = 0; i < n; i++) {
          const pos = a.slot(pl, i);
          drawPiece(ctx, pos.x, pos.y, pl, a.s, a.items[pl][i], this.env.drawCandy);
        }
      }
      ctx.restore();
    }
    // 포장 반짝
    this.fx = this.fx.filter((f) => t - f.born < 0.7);
    for (const f of this.fx) {
      const k = (t - f.born) / 0.7;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#ffd65c';
      ctx.lineWidth = 6;
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * Math.PI * 2, r1 = 14 + k * 30, r2 = 24 + k * 46;
        ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1);
        ctx.lineTo(f.x + Math.cos(an) * r2, f.y + Math.sin(an) * r2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // 센 조각은 작은 점, 지금 세는 조각에만 큰 숫자 (막대 배지가 겹치지 않게)
    this.badges.forEach((b, i) => {
      if (i === this.badges.length - 1) drawBadge(ctx, b, t);
      else drawCounted(ctx, b);
    });
  }
}

// ── 조각 그리기 ───────────────────────────────────────────
function drawPiece(ctx, x, y, place, s, color, drawCandy) {
  if (place === 0) { drawCandy(ctx, x, y, color || '#ff6b8b', 0.78 * s, Math.PI / 4); return; }
  if (place === 1) { drawStick(ctx, x, y, s); return; }
  drawBox(ctx, x, y, s);
}

// 사탕 막대: 투명 포장 안에 사탕 10개
function drawStick(ctx, x, y, s) {
  const w = STICK_W * s, h = STICK_H * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  // 양 끝 포장 매듭
  ctx.fillStyle = '#ff9fb8';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, sd * h / 2);
    ctx.lineTo(-w * 0.55, sd * (h / 2 + 7 * s));
    ctx.lineTo(w * 0.55, sd * (h / 2 + 7 * s));
    ctx.lineTo(w * 0.3, sd * h / 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#fff4f8';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, w / 2);
  ctx.fill(); ctx.stroke();
  const step = (h - 6 * s) / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 3 * s + step * (i + 0.5), Math.min(w * 0.3, step * 0.42), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 사탕 상자: 막대 10개가 든 상자
function drawBox(ctx, x, y, s) {
  const b = BOX * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = '#ffd1dc';
  ctx.beginPath();
  ctx.roundRect(-b / 2, -b / 2, b, b, 6 * s);
  ctx.fill(); ctx.stroke();
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    const sx = -b / 2 + 5 * s + i * ((b - 10 * s) / 10);
    ctx.fillRect(sx, -b / 2 + 6 * s, (b - 10 * s) / 10 - 1.2 * s, b * 0.55);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-b / 2 + 2 * s, b * 0.12, b - 4 * s, b * 0.34);
  ctx.fillStyle = OUTLINE;
  ctx.font = `${Math.round(15 * s)}px Jua, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('100', 0, b * 0.3);
  ctx.restore();
}

// 빈 자리 표시 (점선)
function drawGhost(ctx, pos, place, s) {
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#c9ad98';
  ctx.beginPath();
  if (place === 0) ctx.arc(pos.x, pos.y, 11 * s, 0, Math.PI * 2);
  else if (place === 1) ctx.roundRect(pos.x - STICK_W * s / 2, pos.y - STICK_H * s / 2, STICK_W * s, STICK_H * s, 7 * s);
  else ctx.roundRect(pos.x - BOX * s / 2, pos.y - BOX * s / 2, BOX * s, BOX * s, 6 * s);
  ctx.stroke();
  ctx.restore();
}

function drawArea(ctx, a) {
  const x0 = a.x - a.w / 2;
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.fillStyle = a.fill;
  if (a.kind === 'bag') {
    ctx.beginPath(); ctx.roundRect(x0, a.top + 10, a.w, a.h - 10, 14); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + 6, a.top + 10);
    for (let i = 0; i <= 8; i++) ctx.lineTo(x0 + 6 + (a.w - 12) * i / 8, a.top + (i % 2 ? 0 : 10));
    ctx.lineTo(x0 + a.w - 6, a.top + 20);
    ctx.lineTo(x0 + 6, a.top + 20);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.roundRect(x0 + 8, a.top + 26, a.w - 16, a.h - 32, 10); ctx.fill();
  } else {
    // 쟁반: 낮은 테두리
    ctx.beginPath(); ctx.roundRect(x0, a.top + 6, a.w, a.h - 6, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.roundRect(x0 + 8, a.top + 14, a.w - 16, a.h - 22, 12); ctx.fill();
  }
  // 자리 사이 칸막이 (점선)
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(74, 52, 52, .35)';
  for (let p = a.places - 1; p > 0; p--) {
    const xm = (a.cols[p].x1 + a.cols[p - 1].x0) / 2;
    ctx.beginPath(); ctx.moveTo(xm, a.top + 22); ctx.lineTo(xm, a.bottom - 8); ctx.stroke();
  }
  ctx.restore();
}

function drawCounted(ctx, b) {
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = b.place === 0 ? '#ffd65c' : b.place === 1 ? '#ff9fb8' : '#7cc8f8';
  ctx.beginPath();
  ctx.arc(b.x, b.y - (b.place === 0 ? 14 : b.place === 1 ? 28 * b.area.s : 16 * b.area.s), 6, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx, b, t) {
  const age = t - b.born;
  if (age < 0) return;
  const sc = age < 0.3 ? 0.5 + age / 0.6 : 1;
  const text = String(b.value);
  ctx.save();
  ctx.translate(b.x, b.y - (b.place === 0 ? 14 : b.place === 1 ? 28 * b.area.s : 16 * b.area.s));
  ctx.scale(sc, sc);
  ctx.font = '30px Jua, sans-serif';
  const w = Math.max(42, ctx.measureText(text).width + 22);
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = b.place === 0 ? '#ffd65c' : b.place === 1 ? '#ff9fb8' : '#7cc8f8';
  ctx.beginPath(); ctx.roundRect(-w / 2, -40, w, 38, 19); ctx.fill(); ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -20);
  ctx.restore();
}
