// 냥냥 구구단 그리기 — 연못 · 징검돌 · 물보라 · 엉금이(거북이), 마당 · 구멍 · 두더지 · 뿅망치. 모두 Canvas 코드
//   냥이 · 엉금이는 스프라이트, 나머지는 코드로 그린다. (0,0) = 무대 왼쪽 위 (1280×800 또는 720×H)
//   shop.js 를 불러오면 roundRect 도 채워진다(오래된 브라우저)
import { SPRITES, drawSpriteFrame, headOf } from '../sprites.js';
import { drawHat } from '../shop.js';

export const OUTLINE = '#4a3434';
export const FONT = 'Jua, sans-serif';

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function line(ctx, w = 4) { ctx.lineWidth = w; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
function oval(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }
// 같은 자리 · 같은 번호면 늘 같은 '무작위' 값 (장식 위치용)
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ── 캐릭터 ──────────────────────────────────────────
// 냥이 (상점 모자 포함). (x, y) = 발 아래 가운데
export function drawCat(ctx, anim, frame, x, y, scale, { flip = false, hat = null, t = 0, tilt = 0 } = {}) {
  const sheet = SPRITES.cat;
  if (!sheet || !sheet.image) return;
  ctx.save();
  ctx.translate(x, y);
  if (tilt) ctx.rotate(tilt);
  drawSpriteFrame(ctx, sheet, anim, frame, scale, flip);
  const head = hat && headOf('cat', anim, frame, scale, flip);
  if (head) drawHat(ctx, hat, head.x, head.y, head.size, t, flip);
  ctx.restore();
}

// 엉금이 스프라이트 (도착 섬에서 기다렸다가 반겨 준다)
export function drawTurtle(ctx, anim, frame, x, y, scale, flip = false) {
  const sheet = SPRITES.turtle;
  if (!sheet || !sheet.image) return;
  ctx.save();
  ctx.translate(x, y);
  drawSpriteFrame(ctx, sheet, anim, frame, scale, flip);
  ctx.restore();
}

// 헤엄치는 엉금이 (옆모습, 코드 그림) — 물에 빠진 냥이를 등에 태운다. (x, y) = 물 위 등딱지 아래 가운데
//   dir: 1 = 오른쪽으로 헤엄, -1 = 왼쪽. 반환: 냥이가 앉을 자리 y
export function drawSwimTurtle(ctx, x, y, s, t, dir = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const paddle = Math.sin(t * 9) * 0.5;
  // 지느러미발 (물속이라 연하게)
  ctx.fillStyle = 'rgba(126,196,96,.75)';
  for (const [px, ph] of [[52, paddle], [-46, -paddle]]) {
    ctx.save(); ctx.translate(px * s, 6 * s); ctx.rotate(0.5 + ph);
    oval(ctx, 0, 14 * s, 13 * s, 24 * s); ctx.fill();
    ctx.restore();
  }
  // 머리
  ctx.fillStyle = '#a8da6e';
  oval(ctx, 86 * s, -22 * s, 28 * s, 24 * s); ctx.fill(); line(ctx, 4 * s); ctx.stroke();
  ctx.fillStyle = OUTLINE;
  oval(ctx, 96 * s, -30 * s, 4.5 * s, 5.5 * s); ctx.fill();
  ctx.fillStyle = '#fff'; oval(ctx, 94.5 * s, -32 * s, 1.6 * s, 1.6 * s); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(98 * s, -17 * s, 7 * s, 0.2, Math.PI - 0.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,143,171,.55)'; oval(ctx, 86 * s, -16 * s, 6 * s, 4 * s); ctx.fill();
  // 등딱지 (반달) + 무늬
  ctx.fillStyle = '#76bf55';
  ctx.beginPath(); ctx.ellipse(0, 4 * s, 82 * s, 62 * s, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  line(ctx, 5 * s); ctx.stroke();
  ctx.fillStyle = '#5d9f43';
  for (const [hx, hy, r] of [[0, -30, 16], [-40, -12, 12], [40, -12, 12], [-22, -46, 9], [22, -46, 9]]) { oval(ctx, hx * s, hy * s, r * s, r * 0.8 * s); ctx.fill(); }
  ctx.fillStyle = '#d9eca8';
  rr(ctx, -84 * s, -2 * s, 168 * s, 12 * s, 6 * s); ctx.fill(); line(ctx, 3.5 * s); ctx.stroke();
  ctx.restore();
  return y - 58 * s;
}

export function drawShadow(ctx, x, y, w, alpha = 0.18) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  oval(ctx, x, y, w / 2, w * 0.12);
  ctx.fill();
  ctx.restore();
}

// ── 연못 ────────────────────────────────────────────
// scroll = 카메라가 움직인 거리 (물결 · 연잎이 함께 흘러간다), vertical = 세로 화면(위로 건넌다)
export function drawWater(ctx, W, H, top, t, scroll = 0, vertical = false) {
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#a6e0ff');
  g.addColorStop(1, '#62b8ef');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, H - top);
  // 물결 무늬
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const span = vertical ? H - top : W;
  for (let i = 0; i < 26; i++) {
    let a = (hash(i) * (span + 300) - (vertical ? -scroll : scroll) + t * 8) % (span + 300);
    if (a < 0) a += span + 300;
    a -= 150;
    const b = hash(i + 50);
    const x = vertical ? 30 + b * (W - 60) : a;
    const y = vertical ? top + a : top + 30 + b * (H - top - 60);
    const wob = Math.sin(t * 1.6 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x - 26, y + wob);
    ctx.quadraticCurveTo(x - 13, y - 6 + wob, x, y + wob);
    ctx.quadraticCurveTo(x + 13, y + 6 + wob, x + 26, y + wob);
    ctx.stroke();
  }
  ctx.restore();
}

// 연잎 (장식) — (x, y) 가운데, s 크기
export function drawLilyPad(ctx, x, y, s, rot = 0, flower = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#7fcf6a';
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.62, 0, 0.35, Math.PI * 2 - 0.35);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(74,52,52,.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.6, -s * 0.2); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.5, s * 0.3); ctx.stroke();
  if (flower) {
    ctx.fillStyle = '#ffb3c8';
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; oval(ctx, -s * 0.25 + Math.cos(a) * 9, -s * 0.15 + Math.sin(a) * 6, 8, 6); ctx.fill(); }
    ctx.fillStyle = '#ffe08a'; oval(ctx, -s * 0.25, -s * 0.15, 6, 5); ctx.fill();
  }
  ctx.restore();
}

// 물가 (풀밭 + 모래톱). side: 'left' | 'right' | 'bottom' | 'top' — 물이 있는 쪽 반대편이 땅
export function drawBank(ctx, W, H, edge, side, t, top = 0) {
  ctx.save();
  ctx.beginPath();
  const wave = (k) => Math.sin(k * 0.035 + 1.3) * 14 + Math.sin(k * 0.11) * 5;
  if (side === 'left' || side === 'right') {
    const dir = side === 'left' ? -1 : 1;
    const far = side === 'left' ? -10 : W + 10;
    ctx.moveTo(far, top);
    for (let y = top; y <= H; y += 20) ctx.lineTo(edge - dir * wave(y), y);
    ctx.lineTo(far, H);
  } else {
    const dir = side === 'top' ? -1 : 1;
    const far = side === 'top' ? top - 10 : H + 10;
    ctx.moveTo(-10, far);
    for (let x = -10; x <= W + 10; x += 20) ctx.lineTo(x, edge - dir * wave(x));
    ctx.lineTo(W + 10, far);
  }
  ctx.closePath();
  ctx.fillStyle = '#f2dfb0';   // 모래
  ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(74,52,52,.35)'; ctx.stroke();
  // 안쪽 풀밭
  ctx.clip();
  ctx.fillStyle = '#9edc7e';
  if (side === 'left') ctx.fillRect(-10, top, edge - 34 + 10, H - top);
  else if (side === 'right') ctx.fillRect(edge + 34, top, W - edge, H - top);
  else if (side === 'bottom') ctx.fillRect(-10, edge + 34, W + 20, H);
  else ctx.fillRect(-10, top - 10, W + 20, edge - 34 - top + 10);
  // 풀잎
  ctx.strokeStyle = '#6fbf57'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const hx = hash(i + 7), hy = hash(i + 91);
    let x, y;
    if (side === 'left') { x = hx * (edge - 60); y = top + hy * (H - top); } else if (side === 'right') { x = edge + 60 + hx * (W - edge); y = top + hy * (H - top); } else if (side === 'bottom') { x = hx * W; y = edge + 60 + hy * 400; } else { x = hx * W; y = edge - 60 - hy * 400; }
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y - 12); ctx.moveTo(x, y); ctx.lineTo(x + 5, y - 10); ctx.stroke();
  }
  ctx.restore();
}

// 징검돌. (x, y) = 윗면 가운데, w = 너비
//   path: 지나온 돌(연두빛) · glow: 정답 힌트 반짝 · sink 0~1: 가라앉는 중 · wobble 0~1: 기우뚱
export function drawStone(ctx, x, y, w, label, { path = false, glow = false, sink = 0, wobble = 0, t = 0, big = false } = {}) {
  const h = w * 0.42;
  ctx.save();
  ctx.translate(x + Math.sin(t * 40) * 7 * wobble, y + sink * 46);
  ctx.globalAlpha *= Math.max(0, 1 - sink * 1.1);
  // 물에 비친 그림자 · 잔물결
  ctx.fillStyle = 'rgba(40,90,140,.22)';
  oval(ctx, 0, h * 0.62, w * 0.56, h * 0.42); ctx.fill();
  if (glow) {
    ctx.save();
    ctx.shadowColor = '#fff36b'; ctx.shadowBlur = 30 + Math.sin(t * 8) * 10;
    ctx.fillStyle = 'rgba(255,240,120,.9)';
    oval(ctx, 0, h * 0.18, w * 0.6, h * 0.62); ctx.fill();
    ctx.restore();
  }
  // 옆면
  ctx.fillStyle = path ? '#8fb07c' : '#8e98a3';
  oval(ctx, 0, h * 0.22, w / 2, h / 2); ctx.fill();
  line(ctx, 4); ctx.stroke();
  // 윗면
  ctx.fillStyle = path ? '#d8f0c0' : '#dfe5ea';
  oval(ctx, 0, 0, w / 2 - 3, h / 2 - 4); ctx.fill();
  ctx.strokeStyle = 'rgba(74,52,52,.35)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  oval(ctx, -w * 0.18, -h * 0.14, w * 0.12, h * 0.08); ctx.fill();
  if (label != null) {
    const s = String(label);
    ctx.font = `${Math.round(w * (big ? 0.36 : 0.31) * (s.length > 2 ? 0.8 : 1))}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
    ctx.strokeText(s, 0, 2);
    ctx.fillStyle = path ? '#2f7d3f' : OUTLINE;
    ctx.fillText(s, 0, 2);
  }
  ctx.restore();
}

// 물보라 알갱이 · 동그란 물결
export function drawDrops(ctx, drops) {
  ctx.save();
  for (const d of drops) {
    const k = d.age / d.life;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = d.color || '#e8f7ff';
    oval(ctx, d.x, d.y, d.r, d.r); ctx.fill();
  }
  ctx.restore();
}
export function drawRings(ctx, rings) {
  ctx.save();
  for (const r of rings) {
    const k = r.age / r.life;
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4 * (1 - k) + 1;
    oval(ctx, r.x, r.y, r.w * (0.3 + k), r.w * 0.32 * (0.3 + k)); ctx.stroke();
  }
  ctx.restore();
}

// 뛰어 세기 띠: 0 → 3 → 6 → … (지나온 수는 보이고, 다음 칸은 ?, 그 뒤는 빈칸)
//   slots: [{ v, state: 'done' | 'now' | 'todo' }], step: '+3' / '−3'
export function drawStrip(ctx, cx, cy, maxW, slots, step, t) {
  const n = slots.length;
  const gap = 10;
  const cw = Math.min(74, (maxW - gap * (n - 1)) / n), ch = 46;
  const x0 = cx - (n * cw + (n - 1) * gap) / 2;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  slots.forEach((s, i) => {
    const x = x0 + i * (cw + gap), y = cy - ch / 2;
    // 칸 사이 뛰기 화살표 (+3)
    if (i > 0 && s.state !== 'todo') {
      ctx.strokeStyle = s.state === 'now' ? '#ff5c8a' : 'rgba(74,52,52,.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - gap - cw * 0.3, y - 2);
      ctx.quadraticCurveTo(x - gap / 2, y - 22, x + cw * 0.3, y - 2);
      ctx.stroke();
      ctx.font = `15px ${FONT}`;
      ctx.fillStyle = s.state === 'now' ? '#ff5c8a' : '#8a6f66';
      ctx.fillText(step, x - gap / 2, y - 22);
    }
    const now = s.state === 'now';
    ctx.fillStyle = s.state === 'done' ? '#d8f0c0' : now ? '#fff3b0' : '#fff';
    rr(ctx, x, y, cw, ch, 14); ctx.fill();
    line(ctx, now ? 4 : 3);
    if (s.state === 'todo') { ctx.setLineDash([6, 6]); ctx.strokeStyle = '#d8c4b8'; }
    ctx.stroke();
    ctx.setLineDash([]);
    if (s.state !== 'todo') {
      const txt = now ? '?' : String(s.v);
      ctx.font = `${txt.length > 2 ? 22 : 28}px ${FONT}`;
      ctx.fillStyle = now ? '#ff5c8a' : s.state === 'done' ? '#2f7d3f' : OUTLINE;
      ctx.save();
      if (now) { ctx.translate(x + cw / 2, y + ch / 2 + 1); ctx.rotate(Math.sin(t * 5) * 0.12); ctx.fillText(txt, 0, 0); } else ctx.fillText(txt, x + cw / 2, y + ch / 2 + 1);
      ctx.restore();
    }
  });
  ctx.restore();
}

// 수직선 자 (쉬움 단계): 연못 가장자리를 따라 눈금. at(v) = 그 수의 화면 좌표(가로면 x, 세로면 y)
export function drawRuler(ctx, at, from, to, n, fixed, vertical, highlight = null) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const unit = Math.abs(at(1) - at(0));
  for (let v = from; v <= to; v++) {
    const p = at(v);
    const major = v % n === 0;
    const len = major ? 20 : 10;
    ctx.strokeStyle = major ? 'rgba(74,52,52,.85)' : 'rgba(74,52,52,.45)';
    ctx.lineWidth = major ? 4 : 2;
    ctx.beginPath();
    if (vertical) { ctx.moveTo(fixed, p); ctx.lineTo(fixed + len, p); } else { ctx.moveTo(p, fixed); ctx.lineTo(p, fixed - len); }
    ctx.stroke();
    if (major || unit >= 34) {
      ctx.font = `${major ? 22 : 15}px ${FONT}`;
      ctx.fillStyle = v === highlight ? '#ff5c8a' : major ? OUTLINE : '#6f8aa0';
      if (vertical) ctx.fillText(v, fixed + 40, p); else ctx.fillText(v, p, fixed + 18);
    }
  }
  ctx.strokeStyle = 'rgba(74,52,52,.6)'; ctx.lineWidth = 3;
  ctx.beginPath();
  if (vertical) { ctx.moveTo(fixed, at(from)); ctx.lineTo(fixed, at(to)); } else { ctx.moveTo(at(from), fixed); ctx.lineTo(at(to), fixed); }
  ctx.stroke();
  ctx.restore();
}

// 도착 섬 표지: 물고기 가게 🐟 (앞으로) · '0' 집 (거꾸로)
export function drawGoalSign(ctx, x, y, text, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#b07a4a';
  rr(ctx, -5, -90, 10, 90, 4); ctx.fill(); line(ctx, 3); ctx.stroke();
  ctx.rotate(Math.sin(t * 2) * 0.04);
  ctx.fillStyle = '#fff3c4';
  rr(ctx, -70, -150, 140, 64, 16); ctx.fill(); line(ctx, 4); ctx.stroke();
  ctx.font = `30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = OUTLINE;
  ctx.fillText(text, 0, -117);
  ctx.restore();
}

// ── 공통 글씨 ────────────────────────────────────────
// 둥근 판 위 큰 글씨. parts: [{ text, color }] 를 이어 쓴다
export function drawSign(ctx, cx, cy, parts, { size = 56, sub = null, pad = 24, fill = '#fff', wiggle = 0, t = 0 } = {}) {
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  const widths = parts.map((p) => ctx.measureText(p.text).width);
  let w = widths.reduce((s, v) => s + v, 0) + pad * 2;
  let subW = 0;
  if (sub) { ctx.font = `${Math.round(size * 0.42)}px ${FONT}`; subW = ctx.measureText(sub).width + pad * 2; }
  w = Math.max(w, subW);
  const h = size + 24 + (sub ? size * 0.5 : 0);
  ctx.fillStyle = fill;
  rr(ctx, cx - w / 2, cy - h / 2, w, h, 26); ctx.fill();
  line(ctx, 5); ctx.stroke();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `${size}px ${FONT}`;
  let x = cx - (w - pad * 2) / 2 + ((w - pad * 2) - widths.reduce((s, v) => s + v, 0)) / 2;
  const ty = cy - (sub ? size * 0.22 : 0) + 2;
  parts.forEach((p, i) => {
    ctx.fillStyle = p.color || OUTLINE;
    if (p.color && wiggle) {
      ctx.save(); ctx.translate(x + widths[i] / 2, ty); ctx.rotate(Math.sin(t * 5) * 0.12);
      ctx.textAlign = 'center'; ctx.fillText(p.text, 0, 0); ctx.restore();
    } else ctx.fillText(p.text, x, ty);
    x += widths[i];
  });
  if (sub) {
    ctx.font = `${Math.round(size * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a6f66';
    ctx.fillText(sub, cx, cy + h / 2 - size * 0.36);
  }
  ctx.restore();
}

// 떠오르는 글자 (+1, 퐁당!, 뿅!)
export function drawFloat(ctx, f) {
  const k = f.age / f.life;
  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
  ctx.font = `${f.size}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round';
  const y = f.y - k * 60;
  const s = 1 + (k < 0.15 ? (0.15 - k) * 3 : 0);
  ctx.translate(f.x, y); ctx.scale(s, s);
  ctx.strokeText(f.text, 0, 0);
  ctx.fillStyle = f.color;
  ctx.fillText(f.text, 0, 0);
  ctx.restore();
}

// 말풍선 (냥이 · 두더지)
export function drawBubble(ctx, x, y, text, size = 26) {
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  const w = ctx.measureText(text).width + 30, h = size + 20;
  ctx.fillStyle = '#fff';
  rr(ctx, x - w / 2, y - h, w, h, 18); ctx.fill();
  line(ctx, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 9, y - 2); ctx.lineTo(x, y + 12); ctx.lineTo(x + 9, y - 2); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); line(ctx, 4); ctx.stroke();
  ctx.fillRect(x - 8, y - 6, 16, 6);
  ctx.fillStyle = OUTLINE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - h / 2);
  ctx.restore();
}

// 반짝이 별 (어질어질 · 축하)
export function drawSparkle(ctx, x, y, r, color = '#ffd23f', rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.restore();
}

// ── 두더지 마당 ──────────────────────────────────────
export function drawGarden(ctx, W, H, top, t) {
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#c3eda6');
  g.addColorStop(1, '#8fd57a');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, H - top);
  // 잔디 줄무늬
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  for (let x = -40; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 60, top); ctx.lineTo(x + 140, H); ctx.lineTo(x + 80, H); ctx.closePath(); ctx.fill(); }
  // 꽃 · 클로버
  for (let i = 0; i < 26; i++) {
    const x = hash(i + 3) * W, y = top + 20 + hash(i + 33) * (H - top - 40);
    if (i % 3 === 0) {
      ctx.fillStyle = ['#ffb3c8', '#fff3b0', '#c9b6ff'][i % 3 === 0 ? (i / 3) % 3 : 0];
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2 + t * 0.2; oval(ctx, x + Math.cos(a) * 7, y + Math.sin(a) * 7, 6, 6); ctx.fill(); }
      ctx.fillStyle = '#ffd23f'; oval(ctx, x, y, 5, 5); ctx.fill();
    } else {
      ctx.strokeStyle = '#6fbf57'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y - 13); ctx.moveTo(x, y); ctx.lineTo(x + 6, y - 11); ctx.stroke();
    }
  }
}

// 구멍 뒤쪽 (어두운 굴) — 두더지보다 먼저
export function drawHoleBack(ctx, x, y, w) {
  const h = w * 0.34;
  ctx.save();
  ctx.fillStyle = '#b8875c';                       // 흙더미
  oval(ctx, x, y + 4, w * 0.62, h * 0.95); ctx.fill();
  ctx.fillStyle = '#3d2a22';
  oval(ctx, x, y, w / 2, h / 2); ctx.fill();
  line(ctx, 4); ctx.stroke();
  ctx.restore();
}
// 구멍 앞 턱 (흙) — 두더지 아랫부분을 가린다
export function drawHoleFront(ctx, x, y, w) {
  const h = w * 0.34;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2 + 2, h / 2 + 2, 0, 0, Math.PI);
  ctx.ellipse(x, y + 10, w * 0.6, h * 0.62, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = '#c9965f'; ctx.fill();
  line(ctx, 4); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  oval(ctx, x - w * 0.22, y + h * 0.48, w * 0.1, 4); ctx.fill();
  ctx.restore();
}

// 두더지 (코드 그림). (x, y) = 구멍 가운데, s = 크기(1 = 키 약 150px), rise 0~1 = 얼마나 나왔나
//   state: 'up' · 'hit'(어질어질) · 'tease'(메롱) · 'hide', num = 들고 있는 숫자판
export function drawMole(ctx, x, y, s, rise, { num = null, state = 'up', t = 0, gold = false, glow = false, blink = false } = {}) {
  if (rise <= 0.01) return;
  const bodyW = 104 * s, bodyH = 150 * s;
  const lift = rise * bodyH * 0.92;
  ctx.save();
  // 구멍 가운데 아래로는 안 보이게 (굴 안)
  ctx.beginPath();
  ctx.rect(x - bodyW * 1.6, y - bodyH * 2.2, bodyW * 3.2, bodyH * 2.2);
  ctx.clip();
  const squash = state === 'hit' ? 0.86 : 1;
  ctx.translate(x, y + bodyH - lift);
  ctx.scale(1 / Math.sqrt(squash), squash);
  if (state === 'tease') ctx.rotate(Math.sin(t * 18) * 0.05);
  const fur = gold ? '#f2c443' : '#9b6a43', belly = gold ? '#fff0b0' : '#e7c39b';
  // 반짝 (정답 힌트)
  if (glow) {
    ctx.save();
    ctx.shadowColor = '#fff36b'; ctx.shadowBlur = 34 + Math.sin(t * 9) * 12;
    ctx.fillStyle = 'rgba(255,243,107,.95)';
    rr(ctx, -bodyW / 2 - 8, -bodyH - 8, bodyW + 16, bodyH + 16, bodyW * 0.5); ctx.fill();
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = fur;
  rr(ctx, -bodyW / 2, -bodyH, bodyW, bodyH + 20 * s, bodyW * 0.48); ctx.fill();
  line(ctx, 5 * Math.max(0.7, s)); ctx.stroke();
  // 귀
  for (const sx of [-1, 1]) { ctx.fillStyle = fur; oval(ctx, sx * bodyW * 0.36, -bodyH * 0.9, 12 * s, 10 * s); ctx.fill(); line(ctx, 3.5 * s); ctx.stroke(); }
  // 배 · 주둥이
  ctx.fillStyle = belly;
  oval(ctx, 0, -bodyH * 0.18, bodyW * 0.34, bodyH * 0.3); ctx.fill();
  oval(ctx, 0, -bodyH * 0.6, bodyW * 0.26, bodyH * 0.15); ctx.fill();
  // 코
  ctx.fillStyle = '#ff8fab';
  oval(ctx, 0, -bodyH * 0.69, 11 * s, 8 * s); ctx.fill(); line(ctx, 3 * s); ctx.stroke();
  // 볼
  ctx.fillStyle = 'rgba(255,143,171,.45)';
  for (const sx of [-1, 1]) { oval(ctx, sx * bodyW * 0.3, -bodyH * 0.58, 10 * s, 6 * s); ctx.fill(); }
  // 눈
  ctx.strokeStyle = OUTLINE; ctx.fillStyle = OUTLINE; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const ex = sx * bodyW * 0.2, ey = -bodyH * 0.76;
    if (state === 'hit') {
      // 어질어질 소용돌이
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3.2; a += 0.3) { const r = 1.2 * s + a * 2.2 * s; ctx.lineTo(ex + Math.cos(a + t * 8 * sx) * r, ey + Math.sin(a + t * 8 * sx) * r); }
      ctx.stroke();
    } else if (state === 'tease' || blink) {
      ctx.beginPath(); ctx.arc(ex, ey + 3 * s, 7 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();   // ^ ^
    } else {
      oval(ctx, ex, ey, 6.5 * s, 7.5 * s); ctx.fill();
      ctx.fillStyle = '#fff'; oval(ctx, ex - 2 * s, ey - 3 * s, 2.2 * s, 2.2 * s); ctx.fill(); ctx.fillStyle = OUTLINE;
    }
  }
  // 입 (메롱 = 혀)
  if (state === 'tease') {
    ctx.fillStyle = '#ff6f91';
    rr(ctx, -9 * s, -bodyH * 0.6, 18 * s, 22 * s, 9 * s); ctx.fill(); line(ctx, 3 * s); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.lineWidth = 3 * s;
    ctx.arc(-6 * s, -bodyH * 0.6, 6 * s, 0.2, Math.PI - 0.2); ctx.arc(6 * s, -bodyH * 0.6, 6 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 숫자판 (앞발로 든다)
  if (num != null) {
    const pw = bodyW * 1.08, ph = 58 * s, py = -bodyH * 0.42;
    ctx.fillStyle = gold ? '#fff7cc' : '#fff8e8';
    rr(ctx, -pw / 2, py - ph / 2, pw, ph, 14 * s); ctx.fill();
    line(ctx, 4.5 * s); ctx.stroke();
    const txt = String(num);
    ctx.font = `${Math.round((txt.length > 2 ? 36 : 46) * s)}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = OUTLINE;
    ctx.fillText(txt, 0, py + 3 * s);
    // 앞발
    ctx.fillStyle = '#f2b8a0';
    for (const sx of [-1, 1]) { oval(ctx, sx * pw * 0.42, py + ph * 0.2, 11 * s, 9 * s); ctx.fill(); line(ctx, 3 * s); ctx.stroke(); }
  }
  if (gold) {
    for (let i = 0; i < 3; i++) drawSparkle(ctx, Math.cos(t * 3 + i * 2.1) * bodyW * 0.7, -bodyH * 0.8 + Math.sin(t * 3 + i * 2.1) * 20 * s, 9 * s, '#fff36b', t * 2);
  }
  ctx.restore();
  // 어질어질 별 (구멍 밖이라 clip 없이)
  if (state === 'hit') {
    const hy = y + bodyH - lift - bodyH * squash - 14 * s;
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + i * (Math.PI * 2 / 3);
      drawSparkle(ctx, x + Math.cos(a) * 34 * s, hy + Math.sin(a) * 9 * s, 10 * s, '#ffd23f', a);
    }
  }
}

// 뿅망치 (빨간 장난감 망치). (px, py) = 손잡이 끝(손), angle = 0 이면 오른쪽, s = 크기
export function drawHammer(ctx, px, py, angle, s = 1, gold = false) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  // 손잡이
  ctx.fillStyle = gold ? '#ffe28a' : '#ffd65c';
  rr(ctx, -4 * s, -7 * s, 92 * s, 14 * s, 7 * s); ctx.fill();
  line(ctx, 4 * s); ctx.stroke();
  // 머리 (통 모양)
  ctx.translate(92 * s, 0);
  const hw = 46 * s, hh = 76 * s;
  ctx.fillStyle = gold ? '#ffcf3a' : '#ff6f91';
  rr(ctx, -hw / 2, -hh / 2, hw, hh, 14 * s); ctx.fill();
  line(ctx, 4.5 * s); ctx.stroke();
  // 양 끝 띠
  ctx.fillStyle = gold ? '#fff7cc' : '#fff3c4';
  for (const sy of [-1, 1]) { rr(ctx, -hw / 2, sy > 0 ? hh / 2 - 16 * s : -hh / 2, hw, 16 * s, 8 * s); ctx.fill(); line(ctx, 3.5 * s); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  rr(ctx, -hw / 2 + 6 * s, -hh / 2 + 18 * s, 8 * s, hh - 36 * s, 4 * s); ctx.fill();
  ctx.restore();
}

// 문제 진행 점 (두더지 6문제)
export function drawDots(ctx, cx, cy, results, cur, t) {
  const n = results.length, r = 15, gap = 12;
  const x0 = cx - (n * r * 2 + (n - 1) * gap) / 2 + r;
  ctx.save();
  results.forEach((res, i) => {
    const x = x0 + i * (r * 2 + gap);
    const now = i === cur && !res;
    ctx.fillStyle = res === 'star' ? '#ffd65c' : res === 'ok' ? '#7fdcae' : '#fff';
    oval(ctx, x, cy, r * (now ? 1 + Math.sin(t * 6) * 0.08 : 1), r); ctx.fill();
    line(ctx, now ? 4 : 3);
    if (!res && !now) { ctx.setLineDash([5, 5]); ctx.strokeStyle = '#d8c4b8'; }
    ctx.stroke(); ctx.setLineDash([]);
    if (res) { ctx.font = `17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = OUTLINE; ctx.fillText(res === 'star' ? '★' : '✓', x, cy + 1); }
  });
  ctx.restore();
}
