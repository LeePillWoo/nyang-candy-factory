// 냥냥 주방 그리기 — 모두 Canvas 코드. (0,0)=무대 왼쪽 위, 1280×800 또는 720×H.
export const OUTLINE = '#4a3434';
const FONT = 'Jua, sans-serif';

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function line(ctx, w = 4) { ctx.lineWidth = w; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }

// ── 배경: 손님 홀(벽) · 계산대 · 주방 바닥 ───────────────────
export function drawRoom(ctx, W, H, L, t) {
  // 벽 (줄무늬 벽지)
  ctx.fillStyle = '#ffe9c2';
  ctx.fillRect(0, 0, W, L.counterY);
  ctx.fillStyle = 'rgba(255, 255, 255, .45)';
  for (let x = 0; x < W; x += 56) ctx.fillRect(x, 0, 24, L.counterY);
  // 창문 두 개 (구름이 지나감)
  for (const wx of [W * 0.3, W * 0.7]) {
    const ww = Math.min(170, W * 0.2), wh = 92, wy = L.counterY - 300;
    if (wy < 70) continue;
    ctx.save();
    rr(ctx, wx - ww / 2, wy, ww, wh, 14);
    ctx.fillStyle = '#bfe6ff'; ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#fff';
    const cx = wx - ww / 2 + ((t * 18 + wx) % (ww + 80)) - 40;
    ctx.beginPath(); ctx.ellipse(cx, wy + 34, 26, 11, 0, 0, Math.PI * 2); ctx.ellipse(cx + 18, wy + 26, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    line(ctx, 5);
    rr(ctx, wx - ww / 2, wy, ww, wh, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy + wh); ctx.moveTo(wx - ww / 2, wy + wh / 2); ctx.lineTo(wx + ww / 2, wy + wh / 2); ctx.stroke();
  }
  // 입구 (왼쪽)
  ctx.fillStyle = '#c99366';
  rr(ctx, -20, L.counterY - 190, 70, 190, 12); ctx.fill();
  line(ctx, 5); ctx.stroke();
  ctx.fillStyle = '#ffd65c';
  ctx.beginPath(); ctx.arc(36, L.counterY - 95, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 주방 바닥 (체크 타일)
  const top = L.counterY;
  ctx.fillStyle = '#fff6e6';
  ctx.fillRect(0, top, W, H - top);
  ctx.fillStyle = '#ffe3bd';
  const s = 64;
  for (let y = top; y < H; y += s) {
    for (let x = ((y - top) / s) % 2 ? s : 0; x < W; x += s * 2) ctx.fillRect(x, y, s, s);
  }
}

// 계산대: 손님 다리를 가리도록 손님보다 나중에 그린다
export function drawCounter(ctx, W, L) {
  const y = L.counterY - 46;
  ctx.fillStyle = '#d99a62';
  ctx.fillRect(0, y, W, 74);
  ctx.fillStyle = '#f2b97f';
  ctx.fillRect(0, y, W, 20);
  line(ctx, 5);
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.moveTo(0, y + 20); ctx.lineTo(W, y + 20); ctx.moveTo(0, y + 74); ctx.lineTo(W, y + 74); ctx.stroke();
  ctx.strokeStyle = 'rgba(74, 52, 52, .25)';
  ctx.lineWidth = 3;
  for (let x = 40; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 66); ctx.stroke(); }
}

// 2인: 주방 가운데 나눔 줄 + 이름표
export function drawDivider(ctx, W, H, L, portrait) {
  ctx.save();
  ctx.setLineDash([16, 14]);
  ctx.strokeStyle = 'rgba(74, 52, 52, .3)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(W / 2, L.counterY + 40); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.restore();
  ctx.font = `${portrait ? 22 : 24}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = H - 22;
  ctx.fillStyle = '#ff6f94'; ctx.fillText('1P 냥이 주방', W * 0.25, y);
  ctx.fillStyle = '#3d9be0'; ctx.fillText('2P 펭귄 주방', W * 0.75, y);
}

// ── 음식 한 개 ─────────────────────────────────────────
// 만두 (반달 + 주름)
export function drawDumpling(ctx, x, y, r, cooked) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.35);
  ctx.quadraticCurveTo(-r * 0.9, -r * 0.95, 0, -r * 0.95);
  ctx.quadraticCurveTo(r * 0.9, -r * 0.95, r, r * 0.35);
  ctx.quadraticCurveTo(0, r * 0.75, -r, r * 0.35);
  ctx.closePath();
  ctx.fillStyle = cooked ? '#f4b860' : '#fff6e3';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.22);
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  // 주름
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.strokeStyle = cooked ? '#b8742c' : '#d8c2a0';
  ctx.beginPath();
  for (const k of [-0.45, 0, 0.45]) { ctx.moveTo(r * k, -r * 0.85); ctx.lineTo(r * k * 0.8, -r * 0.35); }
  ctx.stroke();
  if (cooked) {   // 노릇한 윤기
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 경단 꼬치 알 — 한 꼬치(10알)의 앞 5알은 분홍, 뒤 5알은 흰색이라 5와 10이 한눈에 보인다
function dangoColor(i, cooked) {
  const pink = i % 10 < 5;
  if (cooked) return pink ? '#f59ab0' : '#ffe0a8';
  return pink ? '#ffc4d3' : '#fffaf0';
}
export function drawDango(ctx, x, y, r, cooked, i = 0) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = dangoColor(i, cooked); ctx.fill();
  ctx.lineWidth = Math.max(1.2, r * 0.24); ctx.strokeStyle = OUTLINE; ctx.stroke();
  if (cooked) {   // 석쇠 자국
    ctx.strokeStyle = 'rgba(140, 70, 25, .7)';
    ctx.lineWidth = Math.max(1, r * 0.2);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y + r * 0.1); ctx.lineTo(x - r * 0.05, y - r * 0.5);
    ctx.moveTo(x - r * 0.1, y + r * 0.5); ctx.lineTo(x + r * 0.5, y - r * 0.1);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.24, 0, Math.PI * 2); ctx.fill();
  }
}

// 초코칩 쿠키
const CHIPS = [[-0.4, -0.15], [0.25, -0.38], [0.05, 0.3], [-0.25, 0.45], [0.45, 0.2]];
export function drawCookie(ctx, x, y, r, cooked) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = cooked ? '#dc9c55' : '#f7e3bd'; ctx.fill();
  ctx.lineWidth = Math.max(1.2, r * 0.2); ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = cooked ? '#5e3423' : '#8d6b55';
  for (const [dx, dy] of CHIPS) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, Math.max(1, r * 0.14), 0, Math.PI * 2); ctx.fill(); }
}

export function drawItem(ctx, dish, x, y, r, cooked, i = 0) {
  if (dish === 'kkochi') drawDango(ctx, x, y, r * 0.92, cooked, i);
  else if (dish === 'cookie') drawCookie(ctx, x, y, r * 0.95, cooked);
  else drawDumpling(ctx, x, y, r, cooked);
}

// ── 한 접시 모양 — 음식마다 수가 한눈에 보이게 ───────────────
//   만두: 10칸 판(5×2, 10개마다 한 칸 띄움) · 꼬치: 10알 꼬치 · 쿠키: 2개씩 짝(5짝마다 띄움)
//   wide: 만두를 10칸 한 줄로 (팬처럼 납작한 곳)
export function portionSize(dish, n, g, wide = false) {
  n = Math.max(1, Math.min(n, 20));
  if (dish === 'kkochi') return { w: 10 * g * 0.82 + g * 0.9, h: Math.ceil(n / 10) * g * 0.95 };
  if (dish === 'cookie') {
    const cols = Math.ceil(n / 2);
    return { w: cols * g + (cols > 5 ? g * 0.4 : 0), h: (n > 1 ? 2 : 1) * g };
  }
  const cols = wide && n > 10 ? 10 : 5;
  const rows = Math.ceil(n / cols);
  if (cols === 10) return { w: 10 * g + g * 0.3, h: rows * g };
  return { w: 5 * g, h: rows * g + (rows > 2 ? g * 0.35 : 0) };
}

export function drawPortion(ctx, dish, cx, cy, n, g, cooked, wide = false) {
  n = Math.min(n, 20);
  if (n <= 0) return;
  const { w, h } = portionSize(dish, n, g, wide);
  const x0 = cx - w / 2, y0 = cy - h / 2;
  if (dish === 'kkochi') {
    const s = g * 0.82;
    for (let r = 0; r * 10 < n; r++) {
      const yy = y0 + g * 0.95 * (r + 0.5);
      const cnt = Math.min(10, n - r * 10);
      const end = x0 + g * 0.6 + cnt * s + g * 0.25;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2.5, g * 0.2); ctx.strokeStyle = OUTLINE;
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(end, yy); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, g * 0.1); ctx.strokeStyle = '#e0ad74';
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(end, yy); ctx.stroke();
      for (let i = 0; i < cnt; i++) drawDango(ctx, x0 + g * 0.6 + s * (i + 0.5), yy, s * 0.5, cooked, i);
    }
    return;
  }
  if (dish === 'cookie') {
    for (let i = 0; i < n; i++) {
      const c = Math.floor(i / 2), r = i % 2;
      drawCookie(ctx, x0 + c * g + g / 2 + (c >= 5 ? g * 0.4 : 0), y0 + r * g + g / 2, g * 0.44, cooked);
    }
    return;
  }
  const cols = wide && n > 10 ? 10 : 5;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const x = x0 + col * g + g / 2 + (cols === 10 && col >= 5 ? g * 0.3 : 0);
    const y = y0 + row * g + g / 2 + (cols === 5 && row >= 2 ? g * 0.35 : 0);
    drawDumpling(ctx, x, y, g * 0.42, cooked);
  }
}

function badge(ctx, x, y, text, fill, r = 22) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  line(ctx, 4); ctx.stroke();
  ctx.fillStyle = fill === '#fff' ? OUTLINE : '#fff';
  ctx.font = `${r * 1.15}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + r * 0.08);
}

// ── 재료 상자: 왼쪽 칸 = 1개씩, 오른쪽 칸 = 묶음 (만두 5 · 꼬치 10 · 쿠키 2) ──
const CRATE = { mandu: '#e8a965', kkochi: '#f0a3b6', cookie: '#c9925f' };
export function drawBox(ctx, o, t, glow) {
  const { x, y, w, h } = o;
  const top = y - h / 2 + 18;
  ctx.save();
  if (glow) { ctx.shadowColor = '#ffd65c'; ctx.shadowBlur = 24; }
  ctx.fillStyle = CRATE[o.dish] || CRATE.mandu;
  rr(ctx, x - w / 2, top, w, h - 18, 14); ctx.fill();
  ctx.shadowBlur = 0;
  line(ctx, 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, y + h / 2); ctx.stroke();   // 칸막이
  ctx.restore();
  // 칸 위로 보이는 재료
  const lx = x - w / 4, rx = x + w / 4, iy = top - 2;
  drawItem(ctx, o.dish, lx, iy - 2, 15, false, 0);
  if (o.dish === 'kkochi') {
    ctx.save(); ctx.translate(rx + 2, iy - 8); ctx.rotate(-0.42);
    drawPortion(ctx, 'kkochi', 0, 0, 10, 11, false);
    ctx.restore();
  } else if (o.dish === 'cookie') {
    drawCookie(ctx, rx - 11, iy - 4, 12, false);
    drawCookie(ctx, rx + 11, iy - 4, 12, false);
  } else {
    ctx.save(); ctx.translate(rx, iy - 4); ctx.rotate(-0.08);
    drawPortion(ctx, 'mandu', 0, 0, 5, Math.min(15, (w / 2 - 10) / 5), false);
    ctx.restore();
  }
  // 칸 이름표: 1 · 묶음 수
  for (const [cx, label] of [[lx, '1'], [rx, String(o.pack)]]) {
    const lw = 46, lh = 34;
    ctx.fillStyle = '#fff';
    rr(ctx, cx - lw / 2, y + h / 2 - lh - 8, lw, lh, 10); ctx.fill();
    line(ctx, 3.5); ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.font = `28px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, y + h / 2 - lh / 2 - 7);
  }
}

// ── 화덕 + 요리 도구 (만두 팬 · 꼬치 석쇠 · 쿠키 오븐 판) ─────────
const TOOL = { mandu: 'pan', kkochi: 'grill', cookie: 'tray' };
const STOVE_G = { mandu: 13, kkochi: 14, cookie: 12.5 };
export function drawStove(ctx, o, t, glow) {
  const { x, y, w, h } = o;
  ctx.save();
  if (glow) { ctx.shadowColor = '#ffd65c'; ctx.shadowBlur = 26; }
  ctx.fillStyle = '#9aa3b5';
  rr(ctx, x - w / 2, y - h / 2 + 24, w, h - 24, 16); ctx.fill();
  ctx.shadowBlur = 0;
  line(ctx, 5); ctx.stroke();
  // 손잡이 둘
  for (const kx of [-0.25, 0.25]) {
    ctx.fillStyle = o.state === 'cooking' && kx < 0 ? '#ff6b3d' : '#fff';
    ctx.beginPath(); ctx.arc(x + kx * w, y + h / 2 - 22, 9, 0, Math.PI * 2); ctx.fill(); line(ctx, 3); ctx.stroke();
  }
  ctx.restore();
  // 불꽃
  const py = y - h / 2 + 28;
  if (o.state === 'cooking') {
    for (let i = -2; i <= 2; i++) {
      const fh = 16 + Math.sin(t * 20 + i * 1.7) * 6;
      ctx.fillStyle = i % 2 ? '#ffb347' : '#ff6b3d';
      ctx.beginPath();
      ctx.moveTo(x + i * 16 - 8, py + 14); ctx.quadraticCurveTo(x + i * 16, py + 14 - fh * 2, x + i * 16 + 8, py + 14); ctx.fill();
    }
  }
  // 도구
  const tool = o.state === 'empty' || !o.dish ? 'pan' : TOOL[o.dish];
  line(ctx, 5);
  if (tool === 'grill') {
    const gw = w * 0.92, gh = 46;
    ctx.fillStyle = '#3d3d48';
    rr(ctx, x - gw / 2, py - gh / 2, gw, gh, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#7a7a88'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let gx = x - gw / 2 + 12; gx < x + gw / 2 - 6; gx += 12) { ctx.moveTo(gx, py - gh / 2 + 5); ctx.lineTo(gx, py + gh / 2 - 5); }
    ctx.stroke();
  } else if (tool === 'tray') {
    const tw = w * 0.92, th = 44;
    ctx.fillStyle = '#c7ccd6';
    rr(ctx, x - tw / 2, py - th / 2, tw, th, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e3e6ec';
    rr(ctx, x - tw / 2 + 6, py - th / 2 + 5, tw - 12, th - 10, 6); ctx.fill();
  } else {
    const pr = w * 0.44;
    ctx.fillStyle = '#4b4b57';
    ctx.beginPath(); ctx.moveTo(x + pr * 0.9, py); ctx.lineTo(x + pr + 34, py - 10); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, py, pr, pr * 0.48, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6d6d7b';
    ctx.beginPath(); ctx.ellipse(x, py - 2, pr * 0.82, pr * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (o.n > 0 && o.state !== 'empty') {
    const shake = o.state === 'cooking' ? Math.sin(t * 30) * 1.5 : 0;
    drawPortion(ctx, o.dish, x + shake, py - 3, o.n, STOVE_G[o.dish] || 13, o.state === 'done', true);
  }
  // 상태 표시
  if (o.state === 'cooking') {
    const p = Math.min(1, o.t / o.cookTime);
    const bx = x + w / 2 - 6, by = y - h / 2 + 4;
    ctx.beginPath(); ctx.arc(bx, by, 24, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); line(ctx, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, 17, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.closePath();
    ctx.fillStyle = '#ff9a3c'; ctx.fill();
  } else if (o.state === 'done') {
    // 김 + 띵!
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 6;
    for (let i = -1; i <= 1; i++) {
      const k = (t * 0.8 + i * 0.33) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      const sx = x + i * 26, sy = py - 24 - k * 40;
      ctx.moveTo(sx, sy + 20); ctx.quadraticCurveTo(sx - 10, sy + 10, sx, sy); ctx.quadraticCurveTo(sx + 10, sy - 10, sx, sy - 20);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const s = 1 + Math.sin(t * 8) * 0.08;
    ctx.save(); ctx.translate(x + w / 2 - 6, y - h / 2 + 2); ctx.scale(s, s);
    badge(ctx, 0, 0, '띵!', '#23a86b', 26);
    ctx.restore();
  }
  if (o.n > 0 && o.state !== 'empty') badge(ctx, x - w / 2 + 8, y - h / 2 + 4, String(o.n), '#fff', 22);
}

// ── 남은 음식통 (버리기) ─────────────────────────────────
export function drawTrash(ctx, o) {
  const { x, y, w, h } = o;
  ctx.fillStyle = '#7fdcae';
  rr(ctx, x - w / 2 + 6, y - h / 2 + 14, w - 12, h - 14, 12); ctx.fill();
  line(ctx, 5); ctx.stroke();
  ctx.fillStyle = '#5ccf95';
  rr(ctx, x - w / 2, y - h / 2, w, 20, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.font = `20px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('버리기', x, y + 14);
}

// ── 요리사가 든 쟁반 (머리 위) — 반환: 쟁반 사각형 (누르기 판정용) ──────
const CARRY_G = { mandu: 18, kkochi: 15, cookie: 16 };
export function drawCarry(ctx, x, y, carry, t) {
  const n = carry.n, dish = carry.dish || 'mandu';
  const g = CARRY_G[dish] || 18;
  const ps = portionSize(dish, n, g);
  const tw = Math.max(ps.w + 20, 60), th = ps.h + 16;
  const ty = y - th;
  ctx.fillStyle = carry.cooked ? '#ffffff' : '#c99366';
  rr(ctx, x - tw / 2, ty, tw, th, 12); ctx.fill();
  line(ctx, 4); ctx.stroke();
  drawPortion(ctx, dish, x, ty + th / 2, n, g, carry.cooked);
  badge(ctx, x + tw / 2 + 8, ty + 6, String(n), carry.cooked ? '#ff9a3c' : '#fff', 20);
  if (carry.cooked) {
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5;
    const k = (t * 0.9) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.moveTo(x - 10, ty - 6 - k * 26); ctx.quadraticCurveTo(x - 18, ty - 16 - k * 26, x - 10, ty - 26 - k * 26); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  return { x: x - tw / 2, y: ty, w: tw, h: th };
}

// ── 그림 주문 조각 (주사위 · 10칸 판 · 묶음 · 점 · 접시) ─────────────
const PIP = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
function drawDice(ctx, cx, cy, s, v) {
  ctx.fillStyle = '#fff';
  rr(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.2); ctx.fill();
  line(ctx, 3); ctx.stroke();
  ctx.fillStyle = v === 1 ? '#ff5c8a' : OUTLINE;
  for (const [dx, dy] of PIP[v] || []) {
    ctx.beginPath(); ctx.arc(cx + dx * s * 0.26, cy + dy * s * 0.26, s * (v === 1 ? 0.13 : 0.09), 0, Math.PI * 2); ctx.fill();
  }
}

// 10칸 판: v 개 채움 (10 넘으면 판 두 개). cross = 뒤에서부터 지운 개수(뺄셈), empty = 빈칸 강조(10 만들기)
const FC = 13;
function drawFrames(ctx, x, cy, tk) {
  const frames = tk.v > 10 ? 2 : 1;
  const fw = 5 * FC + 6, fh = 2 * FC + 6, top = cy - fh / 2;
  for (let f = 0; f < frames; f++) {
    const fx = x + f * (fw + 6);
    ctx.fillStyle = '#fff';
    rr(ctx, fx, top, fw, fh, 5); ctx.fill();
    line(ctx, 2.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(74, 52, 52, .35)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let c = 1; c < 5; c++) { ctx.moveTo(fx + 3 + c * FC, top + 3); ctx.lineTo(fx + 3 + c * FC, top + fh - 3); }
    ctx.moveTo(fx + 3, top + 3 + FC); ctx.lineTo(fx + fw - 3, top + 3 + FC);
    ctx.stroke();
    for (let k = 0; k < 10; k++) {
      const idx = f * 10 + k;
      const px = fx + 3 + (k % 5) * FC + FC / 2, py = top + 3 + Math.floor(k / 5) * FC + FC / 2;
      if (idx < tk.v) {
        const crossed = tk.cross && idx >= tk.v - tk.cross;
        ctx.globalAlpha = crossed ? 0.35 : 1;
        ctx.fillStyle = f ? '#7cc8f8' : '#ff8fab';
        ctx.beginPath(); ctx.arc(px, py, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        if (crossed) {
          line(ctx, 2.5);
          ctx.beginPath(); ctx.moveTo(px - 5, py - 5); ctx.lineTo(px + 5, py + 5); ctx.moveTo(px + 5, py - 5); ctx.lineTo(px - 5, py + 5); ctx.stroke();
        }
      } else if (tk.empty && f === 0) {
        ctx.save();
        ctx.setLineDash([2.5, 2.5]);
        ctx.strokeStyle = '#ff5c8a'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(px, py, 4.4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }
}

// 묶음 하나: 동그라미 안에 each 개 (주사위 모양 배치)
function drawGroup(ctx, cx, cy, each) {
  ctx.fillStyle = '#fff7e0';
  ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
  line(ctx, 2.5); ctx.stroke();
  ctx.fillStyle = '#ff8fab';
  for (const [dx, dy] of PIP[Math.min(each, 6)] || []) {
    ctx.beginPath(); ctx.arc(cx + dx * 7, cy + dy * 7, 3.6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawDots(ctx, x, cy, v) {
  const rows = v > 10 ? 2 : 1;
  const top = cy - (rows * 11) / 2;
  ctx.fillStyle = '#ff8fab';
  for (let i = 0; i < v; i++) {
    const r = Math.floor(i / 10), c = i % 10;
    ctx.beginPath(); ctx.arc(x + 6 + c * 11 + (c >= 5 ? 3 : 0), top + 5.5 + r * 11, 4.2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPlates(ctx, x, cy, v) {
  for (let i = 0; i < v; i++) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x + 11 + i * 24, cy, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    line(ctx, 2.5); ctx.stroke();
  }
}

const TOKEN_FONT = { text: 34, op: 32, word: 24, q: 36 };
function tokenText(tk, answer) { return tk.t === 'q' ? (answer != null ? String(answer) : '?') : tk.s; }
function tokenSize(ctx, tk, answer) {
  switch (tk.t) {
    case 'dice': return { w: 40, h: 40 };
    case 'frame': return { w: tk.v > 10 ? 2 * (5 * FC + 6) + 6 : 5 * FC + 6, h: 2 * FC + 6 };
    case 'groups': return { w: tk.g * 38 - 4, h: 34 };
    case 'dots': return { w: Math.min(tk.v, 10) * 11 + (tk.v > 5 ? 3 : 0) + 1, h: (tk.v > 10 ? 2 : 1) * 11 };
    case 'plates': return { w: tk.v * 24 - 2, h: 12 };
    default: {
      const fs = TOKEN_FONT[tk.t] || 34;
      ctx.font = `${fs}px ${FONT}`;
      return { w: ctx.measureText(tokenText(tk, answer)).width, h: fs };
    }
  }
}
function drawToken(ctx, tk, x, cy, answer) {
  switch (tk.t) {
    case 'dice': drawDice(ctx, x + 20, cy, 40, tk.v); break;
    case 'frame': drawFrames(ctx, x, cy, tk); break;
    case 'groups': for (let i = 0; i < tk.g; i++) drawGroup(ctx, x + 17 + i * 38, cy, tk.each); break;
    case 'dots': drawDots(ctx, x, cy, tk.v); break;
    case 'plates': drawPlates(ctx, x, cy, tk.v); break;
    default: {
      const fs = TOKEN_FONT[tk.t] || 34;
      ctx.font = `${fs}px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = tk.t === 'q' ? (answer != null ? '#23a86b' : '#ff5c8a') : tk.t === 'word' ? '#8a6f66' : OUTLINE;
      ctx.fillText(tokenText(tk, answer), x, cy + 1);
    }
  }
}

// ── 손님 주문 말풍선: [음식] + 식(글자 또는 그림) ──────────────
// 그림이 너무 작아지면(좁은 화면) 글자 식으로 보여 준다. 반환: 말풍선 사각형 (누르기 판정용)
//   opt.tail: 꼬리 길이(높이 엇갈린 말풍선은 길게), opt.minX/maxX: 화면 밖으로 안 나가게, opt.maxScale: 넓으면 그림 크게
export function drawOrder(ctx, cx, bottom, maxW, c, t, opt = {}) {
  const tail = opt.tail || 14, maxScale = opt.maxScale || 1;
  const answer = c.state === 'eat' || c.state === 'leave' ? c.p.answer : null;
  const ICON = 36, PAD = 14, GAP = 8;
  const measure = (tks) => {
    let w = 0, h = 0;
    for (const tk of tks) { const z = tokenSize(ctx, tk, answer); tk.w = z.w; w += z.w; h = Math.max(h, z.h); }
    return { w: w + GAP * (tks.length - 1), h };
  };
  const avail = Math.max(60, maxW - PAD * 2 - ICON);
  let tokens = c.tokens || c.textTokens;
  let m = measure(tokens);
  let s = Math.min(maxScale, avail / m.w);
  if (s < 0.62 && tokens !== c.textTokens) { tokens = c.textTokens; m = measure(tokens); s = Math.min(maxScale, avail / m.w); }
  const cw = m.w * s, chh = m.h * s;
  const w = Math.max(cw + PAD * 2 + ICON, 120), h = Math.max(chh, 30) + 40;
  let x = cx - w / 2;
  if (opt.maxX != null) x = Math.max(opt.minX || 0, Math.min(x, opt.maxX - w));
  const y = bottom - h;
  const pop = c.bubbleT < 0.3 ? 0.6 + c.bubbleT / 0.3 * 0.4 : 1;
  ctx.save();
  ctx.translate(cx, bottom); ctx.scale(pop, pop); ctx.translate(-cx, -bottom);
  if (c.shakeT > 0) ctx.translate(Math.sin(c.shakeT * 40) * 6, 0);
  ctx.fillStyle = c.vip ? '#fff3c4' : '#fff';
  rr(ctx, x, y, w, h, 18); ctx.fill();
  line(ctx, 4); ctx.stroke();
  // 꼬리 (손님 머리 쪽으로)
  const tb = tail > 30 ? 8 : 10;
  ctx.beginPath(); ctx.moveTo(cx - tb, bottom - 1); ctx.lineTo(cx, bottom + tail); ctx.lineTo(cx + tb, bottom - 1);
  ctx.fillStyle = c.vip ? '#fff3c4' : '#fff'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - tb + 2.5, bottom - 2.5); ctx.lineTo(cx + tb - 2.5, bottom - 2.5); ctx.lineWidth = 5; ctx.strokeStyle = c.vip ? '#fff3c4' : '#fff'; ctx.stroke();
  // 음식 그림 (어떤 요리인지)
  const midY = y + 10 + Math.max(chh, 30) / 2;
  ctx.fillStyle = '#fff1d6';
  ctx.beginPath(); ctx.arc(x + PAD + ICON / 2 - 4, midY, 17, 0, Math.PI * 2); ctx.fill();
  drawItem(ctx, c.dish, x + PAD + ICON / 2 - 4, midY + (c.dish === 'mandu' ? 3 : 0), 13, true, 0);
  // 식
  ctx.save();
  ctx.translate(x + PAD + ICON + (w - PAD * 2 - ICON - cw) / 2, midY);
  ctx.scale(s, s);
  let tx = 0;
  for (const tk of tokens) { drawToken(ctx, tk, tx, 0, answer); tx += tk.w + GAP; }
  ctx.restore();
  // 기다림 막대 (줄어도 손님은 떠나지 않아요)
  if (c.state === 'wait') {
    const r = c.patience / c.patienceMax;
    const bw = w - 28;
    rr(ctx, x + 14, y + h - 18, bw, 9, 5); ctx.fillStyle = '#f3ece6'; ctx.fill();
    rr(ctx, x + 14, y + h - 18, Math.max(6, bw * r), 9, 5); ctx.fillStyle = r > 0.5 ? '#5ccf95' : r > 0.2 ? '#ffd65c' : '#ff8fab'; ctx.fill();
  }
  ctx.restore();
  if (c.vip) { ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👑', x + 6, y + 4); }
  return { x, y, w, h };
}

// 다 먹는 동안 계산대 위 접시
export function drawPlate(ctx, x, y, n, dish) {
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x, y, 54, 16, 0, 0, Math.PI * 2); ctx.fill();
  line(ctx, 4); ctx.stroke();
  if (dish === 'kkochi') { drawPortion(ctx, 'kkochi', x, y - 8, Math.min(n, 10), 9, true); return; }
  const show = Math.min(n, 5);
  for (let i = 0; i < show; i++) drawItem(ctx, dish, x + (i - (show - 1) / 2) * 18, y - 6, 9, true, i);
}

// 요리사 발밑 표시 (1P 분홍 / 2P 파랑)
export function drawFootRing(ctx, x, y, color) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, 46, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 다음에 누를 곳을 가리키는 손가락
export function drawFinger(ctx, x, y, t) {
  const b = Math.sin(t * 6) * 8;
  ctx.font = '46px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('👇', x, y - 24 + b);
}

// 요리사 머리 위 안내 / 떠오르는 글자
export function drawTag(ctx, x, y, text, fill = '#fff', size = 22) {
  ctx.font = `${size}px ${FONT}`;
  const w = ctx.measureText(text).width + 24, h = size + 16;
  ctx.fillStyle = fill;
  rr(ctx, x - w / 2, y - h, w, h, 12); ctx.fill();
  line(ctx, 3); ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - h / 2 + 1);
}

export function drawFloat(ctx, f) {
  const k = f.age / f.life;
  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
  ctx.font = `${f.size}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round';
  const y = f.y - k * 60;
  ctx.strokeText(f.text, f.x, y);
  ctx.fillStyle = f.color;
  ctx.fillText(f.text, f.x, y);
  ctx.restore();
}

// 떠다니는 조이스틱: 누른 자리(받침) + 민 쪽(손잡이)
export function drawStick(ctx, st, R, color) {
  const dx = st.x - st.ox, dy = st.y - st.oy, d = Math.hypot(dx, dy);
  const k = d > R ? R / d : 1;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(st.ox, st.oy, R, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 5; ctx.strokeStyle = color;
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(st.ox + dx * k, st.oy + dy * k, R * 0.45, 0, Math.PI * 2); ctx.fill();
  line(ctx, 4); ctx.stroke();
  ctx.restore();
}
