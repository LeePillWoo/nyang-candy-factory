// 냥냥 주방 — 요리사를 조이스틱으로 움직여 요리하고 배달하는 주방 게임.
//   조이스틱: 화면 아무 곳이나 누르면 그 자리에 생기고, 밀면 요리사가 걷는다 (2인: 화면 왼쪽 = 1P, 오른쪽 = 2P)
//   물건·손님은 요리사가 '가까이' 있을 때만 눌러서 쓸 수 있다.
//   레시피: 🥟 만두(1·5개씩) · 🍡 꼬치(1·10개씩) · 🍪 쿠키(1·2개씩) — 음식마다 '묶음'이 달라 수를 만드는 방법이 달라진다.
//   ① 재료 상자 옆에서 상자를 누른 횟수만큼 집기 (왼쪽 칸 1개, 오른쪽 칸 묶음)
//   ② 화덕 옆에서 눌러 굽기 — 굽는 동안 다른 일을 할 수 있다
//   ③ 다 구워지면(띵!) 화덕을 눌러 접시를 든다
//   ④ 손님 앞으로 가서 손님을 누르면 배달 — 주문한 음식이고, 수가 답과 같으면 성공
//   PC: 1P = WASD + 스페이스(누르기)/Q(묶음), 2P = 방향키 + 엔터/(묶음) (혼자면 방향키도 1P)
//   틀려도 벌 없음: 손님이 "이건 아니에요" 하고, 다른 손님에게 주거나 버리고 다시 하면 된다.
//   든 쟁반을 누르면 하나 내려놓는다(너무 많이 집었을 때).
//   덤: 그림 주문(주사위·10칸 판·묶음), 척척 보너스(묶음을 잘 쓰면), 콤보 → 피버(코인 2배), VIP 손님 👑,
//       처음에는 손가락 안내, 모드별 최고 기록, 배달한 접시 수로 새 레시피 열기.
//   1인: 냥이 · 2인: 주방을 반으로 나눠 1P 냥이 + 2P 펭귄, 손님은 함께 받는다(협동).
import { sfx, speak, unlockAudio, isMuted, setMuted } from '../audio.js';
import { makeProblemSet, buildProblem } from '../problems.js';
import { load, save, getCoins, addCoins as addToWallet } from '../save.js';
import { beginSession, record, dueReviews, accuracy } from '../learn.js';
import { track } from '../missions.js';
import { equippedHat, drawHat, kitchenDecor } from '../shop.js';
import { visibleArea, safeInsets, onViewportChange } from '../viewport.js';
import { SPRITES, loadSprites, drawSpriteFrame, headOf } from '../sprites.js';
import { CHARACTERS, FEATURED_CUSTOMERS } from '../characters.js';
import * as D from './draw.js';

const SHIFT = 150;            // 한 판(영업 시간), 초
// 레시피: 음식마다 묶음 크기(수를 만드는 도구)와 굽는 시간이 다르다.
// unlock = 지금까지 배달한 접시 수가 이만큼 되면 메뉴에 추가된다
const DISHES = {
  mandu:  { name: '만두', emoji: '🥟', pack: 5,  cook: 3, unlock: 0,  sound: '지글지글' },
  kkochi: { name: '꼬치', emoji: '🍡', pack: 10, cook: 3, unlock: 4,  sound: '치익치익' },
  cookie: { name: '쿠키', emoji: '🍪', pack: 2,  cook: 4, unlock: 10, sound: '노릇노릇' },
};
const DISH_KEYS = Object.keys(DISHES);
const PIC_RATE = 0.4;         // 그림 주문(주사위 · 10칸 판 · 묶음) 비율 — 10 만들기는 0.5
const PARTY_AT = [45, 100];   // 영업 시작 뒤 이 사이(초) 어딘가에 단체 손님이 한 번 (a개씩 b명 = 묶어 세기)
const BOSS_AT = 28;           // 남은 시간이 이만큼이 되면 대왕 손님 (여러 접시를 합쳐 정확히 채우기)
const CHANGE_RATE = 0.35;     // 배달 뒤 거스름돈을 물어보는 비율 (10 − 7, 20 − 13)
const REVIEWS_PER_SHIFT = 3;  // 한 판에 다시 도전 문제 최대 개수
const PATIENCE = 45;          // 손님 기다림 막대(다 줄어도 떠나지 않음 — 빨리 주면 보너스만)
const CAP = 20;               // 한 번에 들 수 있는 음식
const CHEF_SPEED = 470;       // 요리사 걷는 빠르기 (조이스틱 끝까지 밀었을 때, px/초)
const STICK_R = 70;           // 조이스틱 반지름
const STICK_DEAD = 14;        // 이만큼 밀어야 걷기 시작 (그보다 짧게 누르면 '누르기')
const NEAR = 64;              // 물건과 이만큼 가까워야 눌러서 쓸 수 있다
const BOX_REACH = 150;        // 재료 상자는 더 멀리서도 — 조금 떨어져 서서 1 · 묶음 칸이 다 보이게
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

// n 개를 만드는 가장 적은 누르기: 묶음 k 개 + 낱개로 채우거나 덜기 (쟁반을 누르면 하나 덜기)
function fewestTaps(n, pack) {
  let best = n;
  for (let k = 1; k * pack <= Math.min(CAP, n + pack); k++) best = Math.min(best, k + Math.abs(n - k * pack));
  return best;
}

const $ = (s) => document.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const store = { load, save };   // 기기 저장소 (save.js)

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

// 캐릭터 한 프레임: (x, y) = 발 아래 중앙, 키 h, hat = 상점 모자 (요리사만)
const CUST_REF_H = 190;   // 손님 키 h 일 때 배율 1 이 되는 기준 (곰돌이 1.25 → 계산대 손님 키 180 에서 약 1.18배)

function drawCharacter(ctx, key, animName, t, x, y, h, flip = false, hat = null) {
  ctx.save();
  ctx.translate(x, y);
  if (key === 'penguin') {
    const sheet = SPRITES.penguin;
    if (sheet.image) {
      const a = PENGUIN_CHEF[animName] || PENGUIN_CHEF.idle;
      const [row, col] = a.frames[Math.floor(t * a.fps) % a.frames.length];
      if (animName === 'walk') ctx.rotate(Math.sin(t * 12) * 0.08);   // 뒤뚱뒤뚱
      drawSpriteFrame(ctx, sheet, `row${row}`, col, h / 140, flip);
      const head = hat && headOf('penguin', `row${row}`, col, h / 140, flip);
      if (head) drawHat(ctx, hat, head.x, head.y, head.size, t, flip);
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
    // 손님은 동물마다 맞춘 배율(c.scale, 사탕 가게와 같은 값)로 — 시트 칸 크기(효과 여백)에 따라 크기가 달라지지 않게
    const sc = key === 'nyang' ? h / (sheet.frameH * 0.92) : c.scale * h / CUST_REF_H;
    drawSpriteFrame(ctx, sheet, def.anim, frame, sc, faceFlip);
    const head = hat && headOf(c.sprite, def.anim, frame, sc, faceFlip);
    if (head) drawHat(ctx, hat, head.x, head.y, head.size, t, faceFlip);
    if (def.zzz) D.drawZzz(ctx, (faceFlip ? -1 : 1) * h * def.zzz[0], -h * def.zzz[1], t, h / 180);
  }
  ctx.restore();
}

// ── 무대 크기 ─────────────────────────────────────────
let W = 1280, H = 800, PORTRAIT = false;

// 요리사(발 위치 pt)를 바닥 안 · 물건 밖으로 밀어낸다. 재료 상자 줄은 앞(열린 쪽) · 위 · 아래로만 나간다.
function blockOut(L, pt) {
  const minX = 36, maxX = W - 36, minY = L.minY, maxY = H - 24;
  pt.x = clamp(pt.x, minX, maxX);
  pt.y = clamp(pt.y, minY, maxY);
  // 사각형 밖으로 가장 가까운 쪽으로 — 바닥 밖으로 나가는 쪽(벽 · 화면 끝)은 고르지 않는다
  const pushOut = (x0, x1, y0, y1) => {
    const ways = [[pt.x - x0, 'l', x0 >= minX], [x1 - pt.x, 'r', x1 <= maxX], [pt.y - y0, 'u', y0 >= minY], [y1 - pt.y, 'd', y1 <= maxY]]
      .filter((w) => w[2]).sort((a, b) => a[0] - b[0]);
    const way = ways.length ? ways[0][1] : null;
    if (way === 'l') pt.x = x0; else if (way === 'r') pt.x = x1; else if (way === 'u') pt.y = y0; else if (way === 'd') pt.y = y1;
  };
  // 재료 상자 구역: 벽까지 이어져 있어서 앞(열린 쪽) · 위 · 아래로만 나간다
  for (const z of L.boxZones || []) {
    if ((z.left ? pt.x >= z.x : pt.x <= z.x) || pt.y <= z.y0 || pt.y >= z.y1) continue;
    if (z.left) pushOut(-Infinity, z.x, z.y0, z.y1); else pushOut(z.x, Infinity, z.y0, z.y1);
  }
  for (const o of L.objs) {
    if (o.kind === 'box') continue;   // 상자는 위의 구역으로
    const x0 = o.x - o.w / 2 + 4, x1 = o.x + o.w / 2 - 4;
    const y0 = o.y - o.h / 2 + 34, y1 = o.y + o.h / 2 + 8;
    if (pt.x <= x0 || pt.x >= x1 || pt.y <= y0 || pt.y >= y1) continue;
    pushOut(x0, x1, y0, y1);
  }
}

// 주방 배치: 계산대 높이, 손님 자리, 요리사별 재료 상자(오늘 메뉴마다 하나)·화덕·버리기 위치
function makeLayout(players, portrait, dishes = ['mandu']) {
  // 세로 화면은 키가 클수록 손님 홀도 크게
  const L = { counterY: portrait ? Math.round(Math.max(515, H * 0.35)) : 360 };
  const F0 = L.counterY + 160, F1 = H - (players === 2 ? 100 : 74);
  const fy = (f) => Math.round(F0 + f * (F1 - F0));
  const n = SEATS[players];
  const mx = portrait ? (n === 4 ? 100 : 140) : (n === 4 ? 230 : 330);
  L.seats = Array.from({ length: n }, (_, i) => ({ x: Math.round(mx + i * (W - 2 * mx) / (n - 1)), cust: null, wait: 0.4 + i * 1.3 }));
  L.custH = portrait ? Math.round(clamp(H * 0.12, 168, 196)) : 180;
  L.chefH = portrait ? 156 : 166;
  L.custY = L.counterY - 4;           // 손님 발 (계산대 뒤에 가려짐)
  L.door = { x: -70, y: L.custY };
  const duo = players === 2;
  const bw = duo ? 150 : 168, bh = duo ? 92 : 100;
  const box = (dish, x, y, owner = 0) => ({ kind: 'box', dish, pack: DISHES[dish].pack, x, y, w: bw, h: bh, owner });
  const stove = (x, y, owner = 0) => ({ kind: 'stove', x, y, w: 156, h: 120, owner, state: 'empty', n: 0, t: 0, cookTime: 3, dish: null, taps: 0 });
  const trash = (x, y, owner = 0) => ({ kind: 'trash', x, y, w: 84, h: 92, owner });
  // 재료 상자는 왼쪽 벽을 따라 세로로 (오늘 메뉴 수만큼)
  const SLOTS = {
    1: { 1: [0.3], 2: [0.0, 0.75], 3: [-0.05, 0.47, 0.99] },          // 가로
    p: { 1: [0.2], 2: [0.0, 0.55], 3: [0.0, 0.42, 0.84] },             // 세로 1인
    2: { 1: [0.25], 2: [0.0, 0.75], 3: [-0.05, 0.47, 0.99] },          // 가로 2인
    p2: { 1: [0.2], 2: [0.0, 0.45], 3: [0.0, 0.36, 0.72] },            // 세로 2인
  };
  const slots = SLOTS[portrait ? (duo ? 'p2' : 'p') : (duo ? 2 : 1)][dishes.length] || [0.3];
  const boxesAt = (x) => dishes.map((d, i) => box(d, x, fy(slots[i])));
  const objs = [], starts = [];
  if (!duo) {
    if (portrait) {
      objs.push(...boxesAt(120), stove(400, fy(0.05)), stove(600, fy(0.05)), trash(610, fy(0.7)));
      starts.push({ x: 400, y: fy(0.95) });
    } else {
      objs.push(...boxesAt(130), stove(540, fy(0.05)), stove(800, fy(0.05)), trash(1150, fy(0.6)));
      starts.push({ x: 650, y: fy(0.9) });
    }
  } else {
    const mirror = (o) => ({ ...o, x: W - o.x, owner: 1 });
    let mine;
    if (portrait) {
      mine = [...boxesAt(82), stove(262, fy(0.0)), stove(262, fy(0.55)), trash(262, fy(0.97))];
      starts.push({ x: 170, y: fy(0.95) }, { x: W - 170, y: fy(0.95) });
    } else {
      mine = [...boxesAt(82), stove(330, fy(0.05)), stove(510, fy(0.05)), trash(575, fy(0.75))];   // 상자 앞 비켜설 자리만큼 화덕을 오른쪽으로
      starts.push({ x: 330, y: fy(0.9) }, { x: W - 330, y: fy(0.9) });
    }
    mine.forEach((o) => { o.owner = 0; objs.push(o); });
    mine.forEach((o) => objs.push(mirror(o)));
  }
  L.objs = objs;
  L.deliverY = L.counterY + 140;   // 배달할 때 서는 곳 (계산대 앞)
  L.minY = L.counterY + 120;
  // 재료 상자 앞(벽 반대쪽)은 조금 비워 둔다 — 옆에서 다가와도 요리사 몸이 상자의 1 · 묶음 칸을 가리지 않게.
  // 상자는 조금 떨어져서도 누를 수 있다(BOX_REACH). 벽 쪽 틈까지 막고, 상자끼리 붙어 있으면(가로 화면) 한 구역으로 합쳐
  // 상자 사이 틈에 끼어 윗상자를 가리지 않게. 사이가 넓으면(세로 화면) 그 사이로 걸어 다닐 수 있게 둔다.
  const gapX = L.boxGapX = Math.round(L.chefH * 0.34);
  L.boxZones = [];
  for (const p of [0, 1]) {
    for (const o of objs.filter((q) => q.kind === 'box' && q.owner === p).sort((a, b) => a.y - b.y)) {
      const left = o.x < W / 2;
      const z = { p, left, x: left ? o.x + o.w / 2 + gapX : o.x - o.w / 2 - gapX, y0: o.y - o.h / 2 + 34, y1: o.y + o.h / 2 + 8 };
      const prev = L.boxZones[L.boxZones.length - 1];
      if (prev && prev.p === p && z.y0 - prev.y1 < 70) prev.y1 = z.y1;
      else L.boxZones.push(z);
    }
  }
  // 맨 아랫상자 밑 · 맨 윗상자 뒤에 좁은 틈만 남으면 끝까지 막는다
  // (밑에 서면 아랫상자를 다 가리고, 뒤의 좁은 틈은 화덕 · 계산대 사이에 갇히는 막다른 곳이라서)
  for (const z of L.boxZones) {
    if (H - 24 - z.y1 < 60) z.y1 = H;
    if (z.y0 - L.minY < 40) z.y0 = L.minY - 1;
    // 옆 물건(화덕 · 버리기)과 사이가 좁은 배치(세로 2인)에서는 지나갈 길(30px)은 남긴다 — 단추는 늘 위에 그려지니 괜찮다
    for (const o of objs) {
      if (o.kind === 'box' || o.y + o.h / 2 + 8 <= z.y0 || o.y - o.h / 2 + 34 >= z.y1) continue;
      if (z.left) z.x = Math.min(z.x, Math.max(z.x - gapX, o.x - o.w / 2 + 4 - 30));
      else z.x = Math.max(z.x, Math.min(z.x + gapX, o.x + o.w / 2 - 4 + 30));
    }
  }
  starts.forEach((st) => blockOut(L, st));   // 시작 자리도 물건 · 상자 구역 밖으로
  L.starts = starts;
  return L;
}

class KitchenGame {
  constructor() {
    this.stage = $('#stage');
    this.canvas = $('#scene');
    this.ctx = this.canvas.getContext('2d');
    this.time = 0;
    this.coins = getCoins();
    this.hat = equippedHat();
    this.decor = kitchenDecor();
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
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));   // 첫 프레임은 시간이 살짝 거꾸로일 수 있다
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
    this.L = makeLayout(this.players, PORTRAIT, this.state === 'menu' ? this.unlockedDishes() : this.dishes);
    if (!old) return;
    const oldStoves = old.objs.filter((o) => o.kind === 'stove');
    this.L.objs.filter((o) => o.kind === 'stove').forEach((o, i) => {
      const s = oldStoves[i];
      if (s) for (const k of ['state', 'n', 't', 'dish', 'taps', 'cookTime']) o[k] = s[k];
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
      ch.x = st.x; ch.y = st.y;
    });
  }

  // ── 입력 ────────────────────────────────────────────
  bindUI() {
    document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
    // 떠다니는 조이스틱: 누른 자리에 생기고, 밀면 걷고, 짧게 누르면(탭) 물건·손님 누르기. 손가락마다 따로
    this.sticks = new Map();
    const toStage = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.state !== 'play') return;
      try { this.canvas.setPointerCapture(e.pointerId); } catch { /* 지원 안 함 */ }
      const p = toStage(e);
      const chef = this.players === 2 && p.x >= W / 2 ? 1 : 0;
      this.sticks.set(e.pointerId, { ox: p.x, oy: p.y, x: p.x, y: p.y, chef, drag: false, t0: performance.now() });
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const st = this.sticks.get(e.pointerId);
      if (!st) return;
      const p = toStage(e);
      st.x = p.x; st.y = p.y;
      if (!st.drag && Math.hypot(p.x - st.ox, p.y - st.oy) > STICK_DEAD) st.drag = true;
    });
    const end = (e) => {
      const st = this.sticks.get(e.pointerId);
      if (!st) return;
      this.sticks.delete(e.pointerId);
      if (!st.drag && e.type === 'pointerup' && performance.now() - st.t0 < 700) this.tap(st.ox, st.oy);
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);

    // 키보드 (PC): 1P WASD + 스페이스, 2P 방향키 + 엔터
    this.keys = new Set();
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (this.state !== 'play') return;
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
      this.keys.add(k);
      if (e.repeat) return;
      if (k === ' ' || k === 'e') this.interact(0);
      else if (k === 'q') this.interact(0, 'pack');
      else if (k === 'enter') this.interact(this.players === 2 ? 1 : 0);
      else if (k === '/') this.interact(this.players === 2 ? 1 : 0, 'pack');
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
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
    if (this.state === 'menu') this.L = makeLayout(this.players, PORTRAIT, this.unlockedDishes());
  }

  // 지금까지 배달한 접시 수로 열린 레시피
  unlockedDishes() {
    const total = store.load('kitchen.total', 0);
    return DISH_KEYS.filter((k) => DISHES[k].unlock <= total);
  }

  // 시작 화면의 '오늘의 메뉴' (잠긴 레시피는 남은 접시 수)
  renderDishes() {
    const total = store.load('kitchen.total', 0);
    const box = $('#menu .dishes');
    if (!box) return;
    box.innerHTML = DISH_KEYS.map((k) => {
      const d = DISHES[k];
      const open = d.unlock <= total;
      return `<span class="dish${open ? '' : ' locked'}"><b>${d.emoji}</b>${d.name}<small>${open ? `1 · ${d.pack}개씩` : `🔒 ${d.unlock - total}접시 더`}</small></span>`;
    }).join('');
  }

  renderCoins() { $('#coin-count').textContent = this.coins; }

  // 오늘의 미션에 알리기 (끝난 미션이 있으면 보상 코인이 지갑에 들어온다)
  mission(event, n = 1) {
    if (track(event, n)) { this.coins = getCoins(); this.renderCoins(); }
  }

  addCoins(n) {
    this.coins = addToWallet(n);
    this.earned += n;
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
    this.L = makeLayout(this.players, PORTRAIT, this.unlockedDishes());
    this.renderDishes();
    this.chefs = [];
    this.customers = [];
    this.floats = [];
    $('#menu').hidden = false;
    $('#result').hidden = true;
    $('#banner').hidden = true;
    for (const id of ['#clock', '#served', '#combo', '#btn-home']) $(id).hidden = true;
    this.closePay();
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
    this.smart = 0;
    this.dishes = this.unlockedDishes();
    this.dishServed = {};
    this.hat = equippedHat();
    this.decor = kitchenDecor();
    // 배움: 판 시작 기록, 다시 도전 문제 수, 어려워하면 답을 10까지로
    beginSession();
    this.reviewsLeft = REVIEWS_PER_SHIFT;
    const acc = accuracy(mode, 10);
    this.answerCap = acc.count >= 5 && acc.rate < 0.6 ? 10 : CAP;
    // 깜짝 손님
    this.partyAt = PARTY_AT[0] + Math.random() * (PARTY_AT[1] - PARTY_AT[0]);
    this.partyDone = false;
    this.bossWanted = false;
    this.bossDone = false;
    this.closePay();
    this.L = makeLayout(this.players, PORTRAIT, this.dishes);
    this.sticks.clear();
    this.chefs = this.L.starts.slice(0, this.players).map((s, p) => ({
      p, ...CHEFS[p], x: s.x, y: s.y, flip: false, carry: null, moved: false,
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
    speak(this.players === 2 ? '냥냥 주방 문 열었어요! 화면을 누르고 밀어서 움직여요. 둘이 힘을 모아요!' : '냥냥 주방 문 열었어요! 화면을 누르고 밀어서 움직여요.');
  }

  // ── 누르기 (요리사가 가까이 있을 때만) ─────────────────
  tap(x, y) {
    if (this.state !== 'play') return;
    // 0) 재료 상자의 1 · 묶음 단추 (쟁반이나 요리사와 겹쳐도 단추가 먼저)
    for (const o of this.L.objs) {
      if (o.kind !== 'box') continue;
      const hit = D.boxLabelRects(o).find((r) => x > r.x - 8 && x < r.x + r.w + 8 && y > r.y - 8 && y < r.y + r.h + 8);
      if (!hit) continue;
      const ch = this.chefs[o.owner];
      if (!ch) return;
      if (this.isNear(ch, o)) this.useObject(ch, o, hit.part);
      else { this.chefSay(ch, '가까이 가서 눌러요!'); o.pingT = 1.2; }
      return;
    }
    // 1) 요리사가 든 쟁반 (생만두를 하나 내려놓기 — 너무 많이 집었을 때)
    for (const ch of this.chefs) {
      const r = ch.carry && !ch.carry.cooked && ch.trayRect;
      if (r && x > r.x - 10 && x < r.x + r.w + 30 && y > r.y - 20 && y < r.y + r.h + 10) {
        if (!ch.carry.cooked) {
          ch.carry.n -= 1;
          ch.carry.taps += 1;
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
        if (!ch) return;
        // 재료 상자는 왼쪽 칸 = 1개, 오른쪽 칸 = 묶음
        if (this.isNear(ch, o)) this.useObject(ch, o, o.kind === 'box' && x >= o.x ? 'pack' : 'one');
        else { this.chefSay(ch, '가까이 가서 눌러요!'); o.pingT = 1.2; }
        return;
      }
    }
    // 3) 손님 (말풍선이나 몸)
    for (const c of this.customers) {
      if (c.state !== 'wait') continue;
      const b = c.bubble;
      const onBubble = b && x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 16;
      const onBody = Math.abs(x - c.x) < 60 && y > c.y - this.L.custH && y < c.y + 30;
      if (onBubble || onBody) { this.tapCustomer(c); return; }
    }
  }

  // 요리사 발 ↔ 물건 사각형 거리
  gapTo(ch, o) {
    const dx = Math.max(Math.abs(ch.x - o.x) - o.w / 2, 0);
    const dy = Math.max(Math.abs(ch.y - o.y) - o.h / 2, 0);
    return Math.hypot(dx, dy);
  }

  isNear(ch, o) {
    return this.gapTo(ch, o) < (o.kind === 'box' ? BOX_REACH : NEAR);
  }

  // 손님 앞 (계산대 가까이, 좌우로 손님 근처)
  nearCustomer(ch, c) {
    return Math.abs(ch.x - c.x) < 130 && ch.y < this.L.counterY + 290;
  }

  // 키보드 '누르기': 가까운 손님(구운 접시를 들었을 때) → 가까운 물건
  interact(i, part = 'one') {
    const ch = this.chefs[i];
    if (!ch || this.state !== 'play') return;
    if (ch.carry && ch.carry.cooked) {
      const c = this.customers.filter((q) => q.state === 'wait' && this.nearCustomer(ch, q)).sort((a, b) => Math.abs(a.x - ch.x) - Math.abs(b.x - ch.x))[0];
      if (c) { this.deliver(ch, c); return; }
    }
    const o = this.L.objs.filter((q) => q.owner === ch.p && this.isNear(ch, q)).sort((a, b) => this.gapTo(ch, a) - this.gapTo(ch, b))[0];
    if (o) this.useObject(ch, o, part);
    else this.chefSay(ch, '가까이 가서 눌러요!');
  }

  useObject(ch, o, part = 'one') {
    if (o.kind === 'box') {
      if (ch.carry && ch.carry.cooked) { this.chefSay(ch, '구운 음식부터 배달해요!'); return; }
      if (ch.carry && ch.carry.dish !== o.dish) { this.chefSay(ch, `${DISHES[ch.carry.dish].name}랑 섞으면 안 돼요!`); return; }
      this.grab(ch, o, part === 'pack' ? o.pack : 1);
    } else if (o.kind === 'stove') {
      if (o.state === 'empty') {
        if (!ch.carry || ch.carry.cooked) { this.chefSay(ch, ch.carry ? '손이 꽉 찼어요' : '재료를 먼저 담아요'); return; }
        const d = DISHES[ch.carry.dish];
        o.state = 'cooking'; o.n = ch.carry.n; o.t = 0;
        o.dish = ch.carry.dish; o.taps = ch.carry.taps; o.cookTime = d.cook;
        ch.carry = null;
        sfx.machine();
        this.float(o.x, o.y - o.h / 2 - 10, d.sound, '#ff9a3c', 26);
      } else if (o.state === 'cooking') {
        this.chefSay(ch, `${DISHES[o.dish].sound} 굽는 중!`);
      } else {
        if (ch.carry) { this.chefSay(ch, '손이 꽉 찼어요'); return; }
        ch.carry = { n: o.n, cooked: true, dish: o.dish, taps: o.taps };
        o.state = 'empty'; o.n = 0; o.t = 0; o.dish = null;
        sfx.hop();
      }
    } else if (o.kind === 'trash') {
      if (!ch.carry) return;
      ch.carry = null;
      sfx.give();
      this.float(o.x, o.y - o.h / 2 - 10, '쏙!', '#5ccf95', 28);
    }
  }

  tapCustomer(c) {
    // 손님 앞에 와 있는, 구운 접시를 든 요리사가 배달 (둘이면 수가 맞는 쪽 → 가까운 쪽)
    const holders = this.chefs.filter((ch) => ch.carry && ch.carry.cooked);
    const near = holders.filter((ch) => this.nearCustomer(ch, c));
    if (!near.length) {
      // 주문을 읽어 주고(그림 주문은 처음엔 그림 안내, 한 번 더 누르면 숫자로), 접시를 든 요리사가 멀리 있으면 알려 준다
      const words = c.tokens && !c.helped ? this.pictureWords(c) : this.problemWords(c.p);
      if (c.tokens) c.helped = true;
      this.say(`${DISHES[c.dish].name}! ${words}`, true);
      c.shakeT = 0.3;
      if (c.mood === 'sleep' || c.mood === 'think') {
        if (c.mood === 'sleep') this.float(c.x, c.y - this.L.custH * 0.9, '깜짝!', '#ffd23f', 28);
        c.mood = 'idle'; c.moodT = 2.5;   // 잠깐 깨서 주문을 다시 말해 준다
      }
      if (holders.length) this.chefSay(holders[0], '손님 앞으로 가요!');
      else {
        const raw = this.chefs.find((h) => h.carry && !h.carry.cooked);
        if (raw) this.chefSay(raw, '먼저 불에 구워요!');
      }
      return;
    }
    const ch = near.find((h) => h.carry.n === c.p.answer && h.carry.dish === c.dish) || near.sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0];
    this.deliver(ch, c);
  }

  grab(ch, o, n) {
    if (!ch.carry) ch.carry = { n: 0, cooked: false, dish: o.dish, taps: 0 };
    if (ch.carry.cooked) return;
    const add = Math.min(n, CAP - ch.carry.n);
    if (add <= 0) { this.chefSay(ch, '20개까지만 들 수 있어요'); return; }
    ch.carry.n += add;
    ch.carry.taps += 1;
    sfx.pop(Math.min(ch.carry.n, 12));
    this.float(o.x + (Math.random() - 0.5) * 30, o.y - o.h / 2, `+${add}`, '#ffd65c', 30);
  }

  deliver(ch, c) {
    if (!ch.carry || !ch.carry.cooked) return;
    if (c.state !== 'wait') { this.chefSay(ch, '다른 손님에게 줘요'); return; }
    const { n, dish, taps } = ch.carry;
    if (dish !== c.dish) {
      // 다른 음식 — 벌 없이 접시는 그대로
      sfx.oops();
      c.shakeT = 0.5;
      c.mood = 'sad'; c.moodT = 1.2;
      ch.mood = 'sad'; ch.moodT = 1;
      this.combo = 0;
      this.renderCombo();
      this.float(c.x, c.y - 70, `${DISHES[c.dish].name} 주세요!`, '#ff8fab', 28);
      this.say(`저는 ${DISHES[c.dish].name}를 주문했어요!`, true);
      return;
    }
    if (c.kind === 'boss') { this.deliverBoss(ch, c); return; }
    if (n !== c.p.answer) {
      c.missed = true;
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
    let coins = 2 + (fast ? 1 : 0) + (c.vip ? 3 : 0) + (c.kind === 'party' ? 4 : 0);
    if (this.fever > 0) coins *= 2;
    // 척척 보너스: 묶음을 잘 써서 가장 적게 눌러 만들었을 때 — 더하기(13 = 10 + 3)도, 빼기(8 = 10 − 2)도
    const best = fewestTaps(n, DISHES[dish].pack);
    const smart = best < n && taps > 0 && taps <= best;
    if (smart) {
      coins += 1;
      this.smart += 1;
      this.float(ch.x, ch.y - this.L.chefH - 40, '척척! 🎯', '#7fdcae', 30);
    }
    this.dishServed[dish] = (this.dishServed[dish] || 0) + 1;
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
    c.mood = 'happy'; c.plateN = n; c.plateDish = dish;
    c.joy = smart || (c.p.review && !c.missed) ? 'love' : 'happy';   // 척척 · 다시 도전 성공이면 하트 뿅뿅
    // 배움 기록 · 미션
    if (c.kind === 'normal') {
      record(c.p, !c.missed);
      if (c.p.review && !c.missed) this.float(c.x, c.y - 140, '다시 도전 성공! 👍', '#7fdcae', 28);
    }
    this.mission('kitchen.serve');
    if (smart) this.mission('kitchen.smart');
    if (c.tokens) this.mission('kitchen.pic');
    if (c.kind === 'party') this.mission('kitchen.party');
    // 가끔 손님이 돈을 내면 거스름돈 묻기 (10 − 7, 20 − 13)
    if (c.kind === 'normal' && !this.pay && n % 10 !== 0 && Math.random() < CHANGE_RATE) this.askChange(c, n);
    else { c.state = 'eat'; c.t = 0; this.say(pick(['딩동댕!', '맛있겠다!', '고마워요!', '냠냠!']), true); }
  }

  // 대왕 손님: 여러 접시를 합쳐서 정확히 채우면 성공 (넘치면 "너무 많아요", 접시는 그대로)
  deliverBoss(ch, c) {
    const { n, dish } = ch.carry;
    const left = c.p.answer - c.got;
    if (n > left) {
      sfx.oops();
      c.shakeT = 0.5;
      c.mood = 'sad'; c.moodT = 1.2;
      ch.mood = 'sad'; ch.moodT = 1;
      this.float(c.x, c.y - 70, '너무 많아요!', '#ff8fab', 28);
      this.say(c.got ? '너무 많아요! 받은 것 빼고 남은 만큼만 주세요' : '너무 많아요!', true);
      return;
    }
    ch.carry = null;
    ch.served += 1;
    ch.mood = 'happy'; ch.moodT = 1.2;
    this.served += 1;
    $('#served-count').textContent = this.served;
    this.dishServed[dish] = (this.dishServed[dish] || 0) + 1;
    c.got += n;
    this.updateNote(c);
    this.mission('kitchen.serve');
    if (c.got === c.p.answer) {
      const coins = 15 * (this.fever > 0 ? 2 : 1);
      this.addCoins(coins);
      this.float(c.x, c.y - 120, `+${coins}`, '#ffd23f', 46);
      this.banner('👑 대왕 손님 배불러요! 🎉', 2);
      sfx.fanfare();
      this.say('배불러요! 정말 고마워요!', true);
      c.state = 'eat'; c.t = -1; c.mood = 'happy'; c.joy = 'love'; c.plateN = c.got; c.plateDish = dish;
    } else {
      this.addCoins(1);
      sfx.give();
      c.mood = 'happy'; c.moodT = 1;
      this.float(c.x, c.y - 90, `냠! ${n}개`, '#ffd23f', 34);
      this.say('냠냠! 더 주세요!', true);
    }
  }

  // ── 거스름돈 ─────────────────────────────────────────
  askChange(c, price) {
    const paid = price < 10 ? 10 : 20;
    const change = paid - price;
    c.state = 'pay'; c.t = 0;
    this.pay = { c, paid, price, change, tries: 0 };
    const box = $('#pay');
    box.querySelector('.pay-paid').textContent = paid;
    box.querySelector('.pay-price').textContent = price;
    const opts = new Set([change]);
    for (const d of shuffle([-2, -1, 1, 2])) if (opts.size < 3 && change + d >= 1 && change + d <= 19) opts.add(change + d);
    const wrap = box.querySelector('.pay-choices');
    wrap.innerHTML = '';
    for (const v of shuffle([...opts])) {
      const b = document.createElement('button');
      b.className = 'pay-btn';
      b.textContent = v;
      b.addEventListener('click', () => this.answerChange(v, b));
      wrap.appendChild(b);
    }
    // 돈을 내는 손님 몸 위에 — 말풍선 줄 아래라서 다른 손님 주문을 가리지 않는다 (화면 밖으로 안 나가게)
    box.hidden = false;
    box.style.left = `${clamp(c.x - box.offsetWidth / 2, 10, W - box.offsetWidth - 10)}px`;
    box.style.top = `${clamp(c.y - this.L.custH * c.size + 4, 90, H - box.offsetHeight - 10)}px`;
    box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    sfx.coin();
    this.say(`${paid}코인을 냈어요. 음식은 ${price}코인! 거스름돈은 얼마일까요?`, true);
  }

  answerChange(v, btn) {
    const pay = this.pay;
    if (!pay || this.state !== 'play') return;
    const { c, paid, price, change } = pay;
    if (v !== change) {
      pay.tries += 1;
      sfx.oops();
      btn.classList.add('wrong');
      btn.disabled = true;
      this.say(pay.tries >= 2 ? `${paid}에서 ${price}를 빼 봐요` : '음... 다시 세어 볼까요?', true);
      if (pay.tries >= 2) [...$('#pay .pay-choices').children].find((b) => Number(b.textContent) === change)?.classList.add('hint');
      return;
    }
    record({ mode: 'sub', diff: 1, level: 'number', a: paid, b: price, answer: change, left: `${paid} − ${price} = `, right: '' }, pay.tries === 0);
    sfx.correct();
    this.addCoins(2);
    this.mission('kitchen.change');
    this.float(c.x, c.y - 120, '거스름돈 딩동댕! +2', '#7fdcae', 28);
    this.say('고마워요! 잘 먹을게요!', true);
    this.closePay();
    c.state = 'eat'; c.t = 0;
  }

  closePay() {
    this.pay = null;
    const box = $('#pay');
    if (box) box.hidden = true;
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

  arrivalWords(c) {
    const dish = DISHES[c.dish].name;
    if (c.kind === 'party') return `단체 손님! ${c.p.b}명이 ${dish}를 ${c.p.a}개씩 먹어요. 모두 몇 개?`;
    if (c.kind === 'boss') return `대왕 손님이에요! ${dish} ${c.tokens ? '' : this.problemWords(c.p)} 여러 접시로 나눠 줘도 돼요!`;
    return `${c.vip ? '귀한 손님! ' : ''}${dish} 주세요! ${c.tokens ? this.pictureWords(c) : this.problemWords(c.p)}`;
  }

  // 그림 주문을 말로 (숫자는 말하지 않고 그림을 보게)
  pictureWords(c) {
    switch (c.p.mode) {
      case 'add': return c.tokens[0].t === 'dice' ? '주사위 두 개를 더하면?' : '점을 모두 세어 봐요!';
      case 'sub': return '지운 것을 빼면 몇 개?';
      case 'ten': return '빈칸이 몇 개일까요?';
      case 'mul': return '모두 몇 개일까요?';
      case 'div': return '한 접시에 몇 개씩일까요?';
      case 'party': return '모두 몇 개일까요?';
      default: return this.problemWords(c.p);
    }
  }

  // 주문 식: 글자 식은 늘 만들고, 가끔 그림 식(주사위 · 10칸 판 · 묶음 · 점과 접시)
  orderTokens(p) {
    const text = [{ t: 'text', s: p.left.trim() }, { t: 'q' }];
    if (p.right.trim()) text.push({ t: 'text', s: p.right.trim() });
    let pic = null;
    if (Math.random() < (p.mode === 'ten' ? 0.5 : PIC_RATE)) {
      const { a, b } = p;
      const eq = [{ t: 'op', s: '=' }, { t: 'q' }];
      if (p.mode === 'add') {
        if (a <= 6 && b <= 6 && Math.random() < 0.6) pic = [{ t: 'dice', v: a }, { t: 'op', s: '+' }, { t: 'dice', v: b }, ...eq];
        else if (a <= 10 && b <= 10) pic = [{ t: 'frame', v: a }, { t: 'op', s: '+' }, { t: 'frame', v: b }, ...eq];
      } else if (p.mode === 'sub' && a <= 20) pic = [{ t: 'frame', v: a, cross: b }, ...eq];
      else if (p.mode === 'ten') pic = [{ t: 'frame', v: a, empty: true }, { t: 'word', s: '빈칸' }, { t: 'q' }];
      else if (p.mode === 'mul') pic = [{ t: 'groups', g: b, each: a }, ...eq];   // a 개씩 b 묶음
      else if (p.mode === 'div') pic = [{ t: 'dots', v: a }, { t: 'op', s: '÷' }, { t: 'plates', v: b }, ...eq];
    }
    return { text, pic };
  }

  problemWords(p) {
    if (p.mode === 'party') return `${p.a}개씩 ${p.b}명은 모두 몇 개?`;
    if (p.mode === 'ten') return `${p.a} 더하기 몇은 ${p.b}?`;
    return `${p.a} ${OP_WORD[p.mode]} ${p.b}는?`;
  }

  // ── 손님 ────────────────────────────────────────────
  busyAnswers() {
    return new Set(this.customers.filter((c) => c.state === 'wait' || c.state === 'walkin').map((c) => c.p.answer));
  }

  nextProblem() {
    const busy = this.busyAnswers();
    // 전에 틀린 문제가 다시 나올 때가 됐으면 가끔 섞는다 ('다시 도전')
    if (this.reviewsLeft > 0 && Math.random() < 0.35) {
      const due = dueReviews({ mode: this.mode, diff: 1, maxAnswer: this.answerCap, exclude: [...busy] }, 1)[0];
      if (due && due.answer >= 1) {
        this.reviewsLeft -= 1;
        const rp = buildProblem(due.mode, due.level, 1, due.a, due.b);
        rp.review = true;
        return rp;
      }
    }
    for (let tries = 0; tries < 3; tries++) {
      if (this.pool.length < 4) this.pool.push(...makeProblemSet(this.mode, LEVEL[this.mode], 12, 1));
      // 기다리는 손님끼리 답이 겹치지 않게 (어느 손님 접시인지 헷갈리지 않게)
      const i = this.pool.findIndex((p) => !busy.has(p.answer) && p.answer >= 1 && p.answer <= this.answerCap);
      if (i >= 0) return this.pool.splice(i, 1)[0];
      this.pool = [];
    }
    return null;
  }

  // 단체 손님: a 개씩 b 명 (묶어 세기). 답은 다른 손님과 겹치지 않게
  partyProblem() {
    const busy = this.busyAnswers();
    const combos = [];
    for (const g of [2, 3]) for (let e = 2; e <= 5; e++) if (g * e <= Math.min(15, this.answerCap) && !busy.has(g * e)) combos.push([e, g]);
    if (!combos.length) return null;
    const [e, g] = pick(combos);
    return { mode: 'party', diff: 1, level: 'number', a: e, b: g, answer: e * g, left: `${e}개씩 ${g}명 =`, right: '' };
  }

  // 대왕 손님: 큰 수 (12~20). 여러 접시를 합쳐서 정확히 채운다
  bossProblem() {
    const r = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
    switch (this.mode) {
      case 'add': return buildProblem('add', 'number', 1, r(6, 9), r(6, 9));
      case 'sub': return buildProblem('sub', 'number', 1, 20, r(3, 8));
      case 'ten': return buildProblem('ten', 'number', 1, r(3, 8), 20);
      default: { const [a, b] = pick([[3, 4], [4, 4], [5, 3], [4, 5], [6, 3]]); return buildProblem('mul', 'number', 1, a, b); }
    }
  }

  spawnCustomer(seatIdx, kind = 'normal') {
    const p = kind === 'party' ? this.partyProblem() : kind === 'boss' ? this.bossProblem() : this.nextProblem();
    if (!p) return false;
    if (!this.bag.length) this.bag = shuffle([...FEATURED_CUSTOMERS]);
    let tokens;
    if (kind === 'party') {
      tokens = {
        text: [{ t: 'text', s: `${p.a}개씩 ${p.b}명` }, { t: 'op', s: '=' }, { t: 'q' }],
        pic: [{ t: 'groups', g: p.b, each: p.a }, { t: 'op', s: '=' }, { t: 'q' }],
      };
    } else tokens = this.orderTokens(p);
    const key = this.bag.pop();
    const c = {
      key, seatIdx, p, dish: pick(this.dishes), tokens: tokens.pic, textTokens: tokens.text, helped: false, born: this.time,
      x: this.L.door.x, y: this.L.custY,
      state: 'walkin', t: 0, mood: 'walk', moodT: 0,
      patience: PATIENCE, patienceMax: PATIENCE, vip: kind === 'normal' && Math.random() < VIP_RATE,
      bubbleT: 0, shakeT: 0, phase: Math.random() * 10, bubble: null, plateN: 0, missed: false,
      kind, size: kind === 'boss' ? 1.32 : 1,
    };
    if (kind === 'party') c.friends = shuffle(FEATURED_CUSTOMERS.filter((k) => k !== key)).slice(0, p.b - 1);
    if (kind === 'boss') { c.got = 0; c.patience = c.patienceMax = 999; }
    this.updateNote(c);
    this.L.seats[seatIdx].cust = c;
    this.customers.push(c);
    if (kind === 'party') { this.banner('🎉 단체 손님이 왔어요!', 1.8); sfx.fanfare(); }
    if (kind === 'boss') { this.banner('👑 대왕 손님! 여러 접시로 나눠 줘도 돼요', 2.4); sfx.fanfare(); }
    return true;
  }

  // 말풍선 아래 작은 글 (다시 도전 · 단체 · 대왕 손님이 받은 수)
  updateNote(c) {
    if (c.kind === 'boss') c.note = c.got ? `받은 것 ${c.got}개 — 더 주세요!` : '👑 대왕 손님 · 나눠 줘도 돼요';
    else if (c.kind === 'party') c.note = '🎉 단체 손님';
    else if (c.p.review) c.note = '🔁 다시 도전';
    else c.note = null;
  }

  // 손님 동작: 걷기 / 받고 기뻐하기 → 마지막엔 좋아하는 간식 들고 반짝 / 기다리는 기분(기본 · 긁적 · 꾸벅)
  custAnim(c) {
    if (c.state === 'walkin' || c.state === 'leave') return 'walk';
    if (c.state === 'eat') return c.t < 0.9 ? c.joy || 'happy' : 'yay';
    if (c.state === 'pay') return 'happy';
    return c.mood;
  }

  // ── 루프 ────────────────────────────────────────────
  update(dt) {
    this.time += dt;
    for (const f of this.floats) f.age += dt;
    this.floats = this.floats.filter((f) => f.age < f.life);
    if (this.state !== 'play') return;

    if (!this.pay) this.clock -= dt;   // 거스름돈을 묻는 동안은 시계를 멈춘다
    this.renderClock();
    if (this.fever > 0) { this.fever -= dt; if (this.fever <= 0) this.renderCombo(); }

    // 빈자리에 손님 들이기
    const elapsed = SHIFT - this.clock;
    if (!this.bossDone && this.clock <= BOSS_AT) this.bossWanted = true;
    this.L.seats.forEach((seat, i) => {
      if (seat.cust) return;
      seat.wait -= dt;
      if (seat.wait > 0) return;
      if (this.bossWanted) {
        // 대왕 손님은 처음 비는 자리에 (그 사이엔 다른 손님을 들이지 않는다)
        if (this.clock > 12 && this.spawnCustomer(i, 'boss')) { this.bossWanted = false; this.bossDone = true; }
        return;
      }
      if (this.clock <= 8) return;
      const kind = !this.partyDone && elapsed >= this.partyAt ? 'party' : 'normal';
      if (this.spawnCustomer(i, kind)) { if (kind === 'party') this.partyDone = true; } else seat.wait = 1;
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
          this.say(this.arrivalWords(c), c.kind !== 'normal');
        }
      } else if (c.state === 'wait') {
        c.bubbleT += dt;
        if (!this.pay && c.kind !== 'boss') c.patience = Math.max(0, c.patience - dt);
        if (c.moodT <= 0) {
          // 오래 기다리면 긁적긁적 → 꾸벅꾸벅 (떠나지는 않아요. 눌러 주면 깜짝 깨요)
          const r = c.patience / c.patienceMax;
          c.mood = r > 0.45 ? 'idle' : r > 0.12 ? 'think' : 'sleep';
        }
      } else if (c.state === 'eat') {
        if (c.t > 1.8) { c.state = 'leave'; c.mood = 'walk'; seat.cust = null; seat.wait = 1.2; }
      } else if (c.state === 'leave') {
        c.x -= CUST_SPEED * dt;
      }
    }
    this.customers = this.customers.filter((c) => !(c.state === 'leave' && c.x < this.L.door.x));

    // 요리사 걷기 (조이스틱 · 키보드)
    const want = this.chefs.map(() => ({ x: 0, y: 0 }));
    for (const st of this.sticks.values()) {
      if (!st.drag || !want[st.chef]) continue;
      const dx = st.x - st.ox, dy = st.y - st.oy, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / STICK_R) / d;
      want[st.chef] = { x: dx * k, y: dy * k };
    }
    const keyDir = (up, down, left, right) => {
      const v = { x: 0, y: 0 };
      if (up.some((k) => this.keys.has(k))) v.y -= 1;
      if (down.some((k) => this.keys.has(k))) v.y += 1;
      if (left.some((k) => this.keys.has(k))) v.x -= 1;
      if (right.some((k) => this.keys.has(k))) v.x += 1;
      const d = Math.hypot(v.x, v.y);
      return d ? { x: v.x / d, y: v.y / d } : null;
    };
    const solo = this.players === 1;
    const k1 = keyDir(solo ? ['w', 'arrowup'] : ['w'], solo ? ['s', 'arrowdown'] : ['s'], solo ? ['a', 'arrowleft'] : ['a'], solo ? ['d', 'arrowright'] : ['d']);
    if (k1) want[0] = k1;
    if (!solo) { const k2 = keyDir(['arrowup'], ['arrowdown'], ['arrowleft'], ['arrowright']); if (k2 && want[1]) want[1] = k2; }
    this.chefs.forEach((ch, i) => {
      if (ch.moodT > 0) { ch.moodT -= dt; if (ch.moodT <= 0) ch.mood = 'idle'; }
      if (ch.sayT > 0) ch.sayT -= dt;
      const v = want[i];
      const sp = Math.hypot(v.x, v.y);
      ch.walking = sp > 0.12;
      if (!ch.walking) return;
      ch.moved = true;
      ch.x += v.x * CHEF_SPEED * dt;
      ch.y += v.y * CHEF_SPEED * dt;
      if (Math.abs(v.x) > 0.1) ch.flip = v.x < 0;
      this.collide(ch);
    });
    for (const o of this.L.objs) if (o.pingT > 0) o.pingT -= dt;

    // 굽기
    for (const o of this.L.objs) {
      if (o.kind !== 'stove' || o.state !== 'cooking') continue;
      o.t += dt;
      if (o.t >= o.cookTime) { o.state = 'done'; o.t = 0; sfx.count(10); }
    }

    if (this.clock <= 0) this.finish();
  }

  // 물건 몸통(발 닿는 부분)은 지나갈 수 없다 — 물건 뒤로는 돌아가서
  collide(ch) {
    blockOut(this.L, ch);
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
    D.drawRoom(ctx, W, H, L, t, this.decor);

    // 손님 (계산대 뒤)
    const custs = this.customers.slice().sort((a, b) => a.x - b.x);
    const seatGap0 = L.seats.length > 1 ? L.seats[1].x - L.seats[0].x : 300;
    for (const c of custs) {
      const anim = this.custAnim(c);
      const hh = L.custH * c.size * (c.vip ? 1.06 : 1);
      const back = c.state === 'leave';
      if (c.friends) {
        // 단체 손님: 친구들이 양옆에 (조금 작게)
        const off = Math.min(66, seatGap0 * 0.3);
        c.friends.forEach((k, i) => drawCharacter(ctx, k, anim, t + c.phase + i + 1, c.x + (i ? off : -off), c.y, hh * 0.8, back));
        drawCharacter(ctx, c.key, anim, t + c.phase, c.x, c.y + 6, hh * 0.86, back);
      } else {
        drawCharacter(ctx, c.key, anim, t + c.phase, c.x, c.y, hh, back);
      }
    }
    D.drawCounter(ctx, W, L);
    D.drawCounterDeco(ctx, W, L, t, this.decor);
    for (const c of custs) if (c.state === 'eat' || c.state === 'pay') D.drawPlate(ctx, c.x, L.counterY - 34, c.plateN, c.plateDish);
    // 말풍선 (맨 위). 세로 화면은 이웃 손님끼리 높낮이를 엇갈려서 말풍선을 두 배 넓게 (그림 주문이 크게 보이게)
    const seatGap = L.seats.length > 1 ? L.seats[1].x - L.seats[0].x : 300;
    const stagger = PORTRAIT;
    const high = (c) => stagger && c.seatIdx % 2 === 0;
    for (const c of custs) c.bubble = null;
    for (const c of [...custs.filter(high), ...custs.filter((q) => !high(q))]) {
      if (c.state !== 'wait' && c.state !== 'eat' && c.state !== 'pay') continue;
      const lift = high(c) ? 98 : 0;
      c.bubble = D.drawOrder(ctx, c.x, c.y - L.custH * c.size - 6 - lift, stagger ? seatGap * 2 - 40 : seatGap - 12, c, t,
        stagger ? { tail: 14 + lift, minX: 8, maxX: W - 8, maxScale: 1.25, minY: 146 } : { minY: 84 });
    }

    if (this.players === 2 && this.state !== 'menu') D.drawDivider(ctx, W, H, L, PORTRAIT);

    // 안내 손가락이 가리킬 곳
    const hints = this.state === 'play' ? this.chefs.map((ch) => this.hintFor(ch)) : [];
    const prompts = this.state === 'play' ? this.chefs.map((ch) => this.nearPrompt(ch)) : [];
    const glowing = new Set([...hints, ...prompts].map((h) => h && h.obj).filter(Boolean));
    for (const o of L.objs) if (o.pingT > 0) glowing.add(o);

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
        drawCharacter(ctx, ch.key, ch.walking ? 'walk' : ch.mood, t, ch.x, ch.y, L.chefH, ch.flip, this.hat);
      }
    }
    const chefs = this.chefs;
    if (this.players === 2) for (const ch of chefs) D.drawTag(ctx, ch.x, ch.y - L.chefH + 4, `${ch.p + 1}P`, ch.ring, 18);
    // 요리사 머리 위 글자: 상자 줄과 겹치면 방 가운데 쪽으로 비켜서 (1 · 묶음 단추를 가리지 않게)
    const headTag = (ch, text, fill, size = 22, bob = 0) => {
      const y = ch.y - L.chefH - (ch.carry ? 110 : 16) + bob;
      const half = D.tagWidth(ctx, text, size) / 2;
      let x = ch.x;
      for (const z of L.boxZones) {
        const edge = z.left ? z.x - L.boxGapX + 8 : z.x + L.boxGapX - 8;   // 상자 바깥 끝
        if (y < z.y0 - 34 - 60 || y - size - 16 > z.y1) continue;           // 높이가 안 겹치면 그대로
        x = z.left ? Math.max(x, edge + half) : Math.min(x, edge - half);
      }
      D.drawTag(ctx, x, y, text, fill, size);
    };
    for (const ch of chefs) {
      ch.trayRect = ch.carry ? D.drawCarry(ctx, ch.x, ch.y - L.chefH - 8, ch.carry, t) : null;
      if (ch.sayT > 0) headTag(ch, ch.say, '#fff');
    }

    // 처음 몇 번은 다음에 갈 곳 안내 (가까이 와서 누를 수 있으면 그 이름표가 대신)
    hints.forEach((h, i) => {
      if (!h) return;
      const ch = this.chefs[i];
      if (h.obj && !(prompts[i] && prompts[i].obj === h.obj)) {
        const o = h.obj;
        // 상자는 옆(벽 반대쪽)에서 가리킨다 — 위에서 가리키면 윗상자의 1 · 묶음 칸을 가려서
        if (o.kind === 'box') D.drawFinger(ctx, o.x + (o.x < W / 2 ? 1 : -1) * (o.w / 2 + 34), o.y + 6, t + i, o.x < W / 2 ? 'left' : 'right');
        else D.drawFinger(ctx, o.x, o.y - o.h / 2 - 14, t + i);
      }
      if (h.text && ch.sayT <= 0 && !prompts[i]) headTag(ch, h.text, '#fff3c4', 20);
    });
    prompts.forEach((pr, i) => {
      if (!pr) return;
      const ch = this.chefs[i];
      // 물건 이름표는 요리사 머리 위에 (물건은 반짝이로 표시) — 상자 칸을 가리지 않게
      if (pr.obj && ch.sayT <= 0) headTag(ch, pr.text, '#ffe08a', 22, Math.sin(t * 6) * 3);
      else if (pr.cust && pr.cust.bubble) D.drawTag(ctx, pr.cust.x, pr.cust.y - 40, pr.text, '#ffe08a', 22);
    });
    // 재료 상자의 1 · 묶음 단추는 맨 위에 (요리사 · 쟁반 · 이름표에 가리지 않게)
    for (const o of L.objs) if (o.kind === 'box') D.drawBoxLabels(ctx, o);

    for (const f of this.floats) D.drawFloat(ctx, f);

    // 조이스틱
    if (this.sticks) for (const st of this.sticks.values()) {
      const ch = this.chefs[st.chef];
      if (ch) D.drawStick(ctx, st, STICK_R, ch.ring);
    }
  }

  // 지금 할 일 안내 (배달 성공 HINT_UNTIL 번까지): 손가락이 가리킬 물건 + 요리사 머리 위 글
  hintFor(ch) {
    if (ch.served >= HINT_UNTIL) return null;
    if (!ch.moved) return { text: '화면을 꾹 누르고 밀어서 걸어요!' };
    const mine = this.L.objs.filter((o) => o.owner === ch.p);
    const stoves = mine.filter((o) => o.kind === 'stove');
    if (ch.carry && ch.carry.cooked) return { text: '알맞은 손님 앞으로 가서 손님을 눌러요' };
    const done = stoves.find((o) => o.state === 'done');
    if (done && !ch.carry) return { obj: done, text: '다 구웠어요! 화덕으로 가서 팬을 눌러요' };
    if (ch.carry) {
      const free = stoves.find((o) => o.state === 'empty');
      return free ? { obj: free, text: '주문만큼 담았으면 화덕으로!' } : null;
    }
    if (stoves.some((o) => o.state === 'cooking')) return null;
    // 가장 오래 기다린 손님의 음식 상자로
    const first = this.customers.filter((q) => q.state === 'wait').sort((a, b) => a.born - b.born)[0];
    const dish = first ? first.dish : this.dishes[0];
    return { obj: mine.find((o) => o.kind === 'box' && o.dish === dish), text: `${DISHES[dish].name} 상자로 가서 눌러요` };
  }

  // 지금 가까이 있어서 '눌러서 쓸 수 있는' 것 (빛나고 이름표가 뜬다)
  nearPrompt(ch) {
    if (ch.carry && ch.carry.cooked) {
      const c = this.customers.find((q) => q.state === 'wait' && this.nearCustomer(ch, q));
      if (c) return { cust: c, text: '손님을 눌러 배달!' };
    }
    const near = this.L.objs.filter((o) => o.owner === ch.p && this.isNear(ch, o)).sort((a, b) => this.gapTo(ch, a) - this.gapTo(ch, b));
    for (const o of near) {
      const raw = ch.carry && !ch.carry.cooked;
      if (o.kind === 'box' && !(ch.carry && ch.carry.cooked)) return { obj: o, text: `눌러서 담기 (1 · ${o.pack})` };
      if (o.kind === 'stove' && o.state === 'empty' && raw) return { obj: o, text: '눌러서 굽기' };
      if (o.kind === 'stove' && o.state === 'done' && !ch.carry) return { obj: o, text: '눌러서 들기' };
      if (o.kind === 'trash' && ch.carry) return { obj: o, text: '눌러서 버리기' };
    }
    return null;
  }

  finish() {
    this.state = 'over';
    const run = this.runId;
    this.sticks.clear();
    this.closePay();
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
    box.querySelector('.served-line').textContent = `음식 ${this.served}접시 배달 완료!`;
    const parts = this.dishes.map((k) => `${DISHES[k].emoji} ${this.dishServed[k] || 0}`);
    if (this.smart) parts.push(`척척 🎯 ${this.smart}`);
    box.querySelector('.dish-line').textContent = parts.join(' · ');
    // 새 레시피 열기 (지금까지 배달한 접시 수)
    const before = store.load('kitchen.total', 0);
    const total = before + this.served;
    store.save('kitchen.total', total);
    const newly = DISH_KEYS.filter((k) => DISHES[k].unlock > before && DISHES[k].unlock <= total);
    const next = DISH_KEYS.find((k) => DISHES[k].unlock > total);
    const unlock = box.querySelector('.unlock-line');
    unlock.classList.toggle('new', newly.length > 0);
    if (newly.length) {
      unlock.textContent = `🎉 새 레시피! ${newly.map((k) => `${DISHES[k].emoji} ${DISHES[k].name}`).join(' · ')} — 다음 판부터 주문이 와요`;
      const run = this.runId;
      setTimeout(() => { if (run === this.runId) { sfx.fanfare(); speak(`새 레시피! ${newly.map((k) => DISHES[k].name).join(', ')}!`); } }, 900);
    } else {
      unlock.textContent = next ? `🔒 ${DISHES[next].emoji} ${DISHES[next].name}까지 ${DISHES[next].unlock - total}접시` : '';
    }
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
