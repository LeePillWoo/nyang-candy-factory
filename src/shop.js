// 냥냥 상점 — 코인으로 모자(냥이·펭귄이 모든 게임에서 씀)와 주방 꾸미기를 산다.
// 산 물건과 착용 상태는 이 기기에 저장된다 (save.js).
import { load, save, getCoins, spendCoins } from './save.js';

// 구형 브라우저용 roundRect 대체 (첫 화면에서도 쓰므로 여기에도)
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
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

const KEY = 'nyang.shop';
const OUTLINE = '#4a3434';

export const ITEMS = [
  { id: 'hat.chef', kind: 'hat', name: '요리사 모자', price: 20 },
  { id: 'hat.ribbon', kind: 'hat', name: '분홍 리본', price: 30 },
  { id: 'hat.party', kind: 'hat', name: '고깔모자', price: 40 },
  { id: 'hat.flower', kind: 'hat', name: '꽃 핀', price: 50 },
  { id: 'hat.pirate', kind: 'hat', name: '해적 모자', price: 80 },
  { id: 'hat.crown', kind: 'hat', name: '왕관', price: 120 },
  { id: 'wall.mint', kind: 'wall', name: '민트 벽지', price: 30 },
  { id: 'wall.berry', kind: 'wall', name: '딸기 벽지', price: 30 },
  { id: 'wall.night', kind: 'wall', name: '별밤 벽지', price: 60 },
  { id: 'deco.plant', kind: 'deco', name: '화분', price: 25 },
  { id: 'deco.frame', kind: 'deco', name: '냥이 액자', price: 35 },
  { id: 'deco.lights', kind: 'deco', name: '반짝 전구', price: 45 },
];
export const itemOf = (id) => ITEMS.find((it) => it.id === id);

// ── 상태 ────────────────────────────────────────────────
export function shopState() {
  const s = load(KEY, null) || {};
  return { owned: s.owned || [], hat: s.hat || null, wall: s.wall || null, deco: s.deco || [] };
}
function put(s) { save(KEY, s); }

export function isEquipped(id) {
  const s = shopState();
  return s.hat === id || s.wall === id || s.deco.includes(id);
}

// 사기: 코인이 모자라면 얼마나 더 필요한지 알려 준다. 사면 바로 착용.
export function buy(id) {
  const it = itemOf(id);
  if (!it) return { ok: false, reason: 'none' };
  const s = shopState();
  if (s.owned.includes(id)) return { ok: false, reason: 'owned' };
  const before = getCoins();
  if (before < it.price) return { ok: false, reason: 'coins', need: it.price - before, before };
  if (!spendCoins(it.price)) return { ok: false, reason: 'coins', need: it.price - getCoins(), before };
  s.owned.push(id);
  put(s);
  setEquipped(id, true);
  return { ok: true, before, after: getCoins() };
}

// 착용 / 벗기 (모자 · 벽지는 하나만, 장식은 여러 개)
export function setEquipped(id, on) {
  const it = itemOf(id);
  const s = shopState();
  if (!it || !s.owned.includes(id)) return;
  if (it.kind === 'hat') s.hat = on ? id : (s.hat === id ? null : s.hat);
  else if (it.kind === 'wall') s.wall = on ? id : (s.wall === id ? null : s.wall);
  else s.deco = on ? [...new Set([...s.deco, id])] : s.deco.filter((d) => d !== id);
  put(s);
}

export const equippedHat = () => shopState().hat;
export function kitchenDecor() {
  const s = shopState();
  return { wall: s.wall, deco: s.deco };
}

// ── 모자 그리기: (x, y) = 머리 꼭대기, s = 머리 너비 ─────────────────
function stroke(ctx, w) { ctx.lineWidth = w; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }

export function drawHat(ctx, id, x, y, s, t = 0, flip = false) {
  if (!id) return;
  const lw = Math.max(1.6, s * 0.05);
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  stroke(ctx, lw);
  switch (id) {
    case 'hat.chef': {
      ctx.fillStyle = '#fff';
      for (const [dx, dy, r] of [[-0.24, -0.36, 0.2], [0.24, -0.36, 0.2], [0, -0.48, 0.25]]) {
        ctx.beginPath(); ctx.arc(dx * s, dy * s, r * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.roundRect(-0.36 * s, -0.24 * s, 0.72 * s, 0.26 * s, 0.06 * s); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(74,52,52,.25)'; ctx.lineWidth = lw * 0.6;
      ctx.beginPath(); ctx.moveTo(-0.12 * s, -0.22 * s); ctx.lineTo(-0.12 * s, 0); ctx.moveTo(0.12 * s, -0.22 * s); ctx.lineTo(0.12 * s, 0); ctx.stroke();
      break;
    }
    case 'hat.ribbon': {
      ctx.translate(0.26 * s, 0.02 * s);
      ctx.fillStyle = '#ff8fab';
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(sx * 0.17 * s, -0.04 * s, 0.19 * s, 0.12 * s, sx * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#ff5c8a';
      ctx.beginPath(); ctx.arc(0, -0.02 * s, 0.08 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 'hat.party': {
      ctx.rotate(0.18);
      ctx.beginPath(); ctx.moveTo(-0.24 * s, 0.03 * s); ctx.lineTo(0.02 * s, -0.72 * s); ctx.lineTo(0.26 * s, 0.03 * s); ctx.closePath();
      ctx.fillStyle = '#7cc8f8'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = '#ffd65c'; ctx.lineWidth = s * 0.08;
      for (let k = -1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-0.4 * s, -0.05 * s - k * 0.2 * s); ctx.lineTo(0.4 * s, -0.25 * s - k * 0.2 * s); ctx.stroke(); }
      ctx.restore();
      stroke(ctx, lw);
      ctx.beginPath(); ctx.moveTo(-0.24 * s, 0.03 * s); ctx.lineTo(0.02 * s, -0.72 * s); ctx.lineTo(0.26 * s, 0.03 * s); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#ff8fab';
      ctx.beginPath(); ctx.arc(0.02 * s, -0.74 * s, 0.09 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 'hat.flower': {
      ctx.translate(-0.3 * s, 0.05 * s);
      ctx.fillStyle = '#ffb3c7';
      for (let k = 0; k < 5; k++) {
        const a = k * Math.PI * 2 / 5 + t * 0.2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 0.12 * s, Math.sin(a) * 0.12 * s, 0.1 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#ffd65c';
      ctx.beginPath(); ctx.arc(0, 0, 0.08 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 'hat.pirate': {
      ctx.beginPath();
      ctx.moveTo(-0.52 * s, 0.02 * s);
      ctx.quadraticCurveTo(-0.3 * s, -0.5 * s, 0, -0.44 * s);
      ctx.quadraticCurveTo(0.3 * s, -0.5 * s, 0.52 * s, 0.02 * s);
      ctx.quadraticCurveTo(0, -0.12 * s, -0.52 * s, 0.02 * s);
      ctx.closePath();
      ctx.fillStyle = '#3b3b46'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffd65c'; ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.moveTo(-0.44 * s, -0.04 * s); ctx.quadraticCurveTo(0, -0.18 * s, 0.44 * s, -0.04 * s); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, -0.27 * s, 0.08 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = OUTLINE;
      ctx.beginPath(); ctx.arc(-0.03 * s, -0.28 * s, 0.018 * s, 0, Math.PI * 2); ctx.arc(0.03 * s, -0.28 * s, 0.018 * s, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'hat.crown': {
      ctx.translate(0, Math.sin(t * 3) * 0.015 * s);
      ctx.beginPath();
      ctx.moveTo(-0.3 * s, 0.02 * s); ctx.lineTo(-0.32 * s, -0.36 * s); ctx.lineTo(-0.15 * s, -0.18 * s);
      ctx.lineTo(0, -0.42 * s); ctx.lineTo(0.15 * s, -0.18 * s); ctx.lineTo(0.32 * s, -0.36 * s); ctx.lineTo(0.3 * s, 0.02 * s);
      ctx.closePath();
      ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
      for (const [dx, dy, c] of [[-0.32, -0.36, '#ff5c8a'], [0, -0.42, '#7cc8f8'], [0.32, -0.36, '#5ccf95'], [0, -0.08, '#ff5c8a']]) {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(dx * s, dy * s, 0.055 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

// ── 주방 벽지 · 장식 (냥냥 주방과 상점 미리보기에서 같이 씀) ─────────
export function drawWall(ctx, wallId, x, y, w, h, t = 0) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (wallId === 'wall.night') {
    ctx.fillStyle = '#3b4a7a'; ctx.fillRect(x, y, w, h);
    for (let i = 0; i < Math.ceil(w * h / 5000); i++) {
      const sx = x + (i * 97 % 1000) / 1000 * w, sy = y + (i * 61 % 997) / 997 * h;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2 + i);
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath(); ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (wallId === 'wall.berry') {
    ctx.fillStyle = '#ffe1ea'; ctx.fillRect(x, y, w, h);
    for (let yy = y + 30, r = 0; yy < y + h; yy += 70, r++) {
      for (let xx = x + 30 + (r % 2) * 50; xx < x + w; xx += 100) {
        ctx.fillStyle = '#ff6b8b';
        ctx.beginPath(); ctx.moveTo(xx, yy + 12); ctx.quadraticCurveTo(xx - 12, yy - 2, xx - 6, yy - 8); ctx.quadraticCurveTo(xx, yy - 10, xx + 6, yy - 8); ctx.quadraticCurveTo(xx + 12, yy - 2, xx, yy + 12); ctx.fill();
        ctx.fillStyle = '#5ccf95';
        ctx.beginPath(); ctx.ellipse(xx, yy - 9, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    const mint = wallId === 'wall.mint';
    ctx.fillStyle = mint ? '#d6f5e8' : '#ffe9c2'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = mint ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.45)';
    for (let xx = x; xx < x + w; xx += 56) ctx.fillRect(xx, y, 24, h);
  }
  ctx.restore();
}

export function drawDeco(ctx, id, x, y, s = 1, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  stroke(ctx, 4);
  if (id === 'deco.plant') {           // (0,0) = 화분 바닥
    ctx.fillStyle = '#5ccf95';
    for (const [a, l] of [[-0.6, 52], [-0.2, 64], [0.25, 60], [0.7, 46]]) {
      ctx.save(); ctx.rotate(a + Math.sin(t * 1.5 + a) * 0.05);
      ctx.beginPath(); ctx.ellipse(0, -30 - l / 2, 11, l / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#e8865c';
    ctx.beginPath(); ctx.moveTo(-26, -34); ctx.lineTo(26, -34); ctx.lineTo(19, 0); ctx.lineTo(-19, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2a37f';
    ctx.beginPath(); ctx.roundRect(-30, -42, 60, 12, 5); ctx.fill(); ctx.stroke();
  } else if (id === 'deco.frame') {    // (0,0) = 액자 가운데
    ctx.fillStyle = '#c99366';
    ctx.beginPath(); ctx.roundRect(-46, -38, 92, 76, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bfe6ff';
    ctx.beginPath(); ctx.roundRect(-36, -28, 72, 56, 4); ctx.fill(); ctx.stroke();
    // 냥이 얼굴
    ctx.fillStyle = '#c9c2bd';
    ctx.beginPath(); ctx.moveTo(-20, -6); ctx.lineTo(-16, -22); ctx.lineTo(-6, -12); ctx.lineTo(6, -12); ctx.lineTo(16, -22); ctx.lineTo(20, -6);
    ctx.quadraticCurveTo(22, 20, 0, 20); ctx.quadraticCurveTo(-22, 20, -20, -6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.beginPath(); ctx.arc(-8, 2, 2.6, 0, Math.PI * 2); ctx.arc(8, 2, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8fab';
    ctx.beginPath(); ctx.arc(0, 8, 2.4, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'deco.lights') {   // (0,0) = 왼쪽 끝, 오른쪽으로 길이 s 배수 없이 그림
    const len = 360;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const xx = i * len / 12, yy = Math.sin(i / 12 * Math.PI) * 18; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    const cols = ['#ff6b8b', '#ffd65c', '#5ccf95', '#7cc8f8', '#b592f5'];
    for (let i = 1; i < 12; i++) {
      const xx = i * len / 12, yy = Math.sin(i / 12 * Math.PI) * 18 + 8;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4 + i * 1.3);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(xx, yy, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; ctx.stroke();
    }
  }
  ctx.restore();
}

// 상점 카드 그림 (w×h 캔버스에 맞춰)
export function drawItemIcon(ctx, id, w, h, t = 0) {
  const it = itemOf(id);
  if (!it) return;
  if (it.kind === 'hat') {
    // 동그란 머리 위에 모자
    ctx.fillStyle = '#e9dfd8';
    ctx.beginPath(); ctx.arc(w / 2, h * 0.78, w * 0.28, Math.PI, 0); ctx.fill();
    drawHat(ctx, id, w / 2, h * 0.62, w * 0.62, t);
  } else if (it.kind === 'wall') {
    drawWall(ctx, id, 4, 4, w - 8, h - 8, t);
    ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.strokeRect(4, 4, w - 8, h - 8);
  } else if (id === 'deco.plant') drawDeco(ctx, id, w / 2, h * 0.92, h / 120, t);
  else if (id === 'deco.frame') drawDeco(ctx, id, w / 2, h / 2, Math.min(w / 110, h / 90), t);
  else if (id === 'deco.lights') drawDeco(ctx, id, w * 0.06, h * 0.35, w * 0.88 / 360, t);
}
