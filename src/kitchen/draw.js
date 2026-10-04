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

// ── 만두 한 알 (반달 + 주름) ─────────────────────────────
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

// n 개를 10칸 판(5×2) 모양으로 늘어놓기 — 가운데 (cx, cy), 칸 간격 g
export function drawDumplingGrid(ctx, cx, cy, n, g, cooked, cols = 5) {
  const rows = Math.ceil(Math.min(n, 20) / cols);
  const tenGap = g * 0.35;
  const h = rows * g + (rows > 2 ? tenGap : 0);
  for (let i = 0; i < Math.min(n, 20); i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const x = cx + (col - (cols - 1) / 2) * g;
    const y = cy - h / 2 + g / 2 + row * g + (row >= 2 ? tenGap : 0);
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

// ── 만두 상자 (1개씩 / 5개씩) ─────────────────────────────
export function drawBox(ctx, o, t, glow) {
  const { x, y, w, h } = o;
  ctx.save();
  if (glow) { ctx.shadowColor = '#ffd65c'; ctx.shadowBlur = 24; }
  // 상자
  ctx.fillStyle = '#e8a965';
  rr(ctx, x - w / 2, y - h / 2 + 18, w, h - 18, 14); ctx.fill();
  ctx.shadowBlur = 0;
  line(ctx, 5); ctx.stroke();
  ctx.strokeStyle = 'rgba(74, 52, 52, .3)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 10, y + 12); ctx.lineTo(x + w / 2 - 10, y + 12); ctx.stroke();
  ctx.restore();
  // 담긴 만두
  if (o.amount === 5) {
    // 5개씩 꼬치에 꿴 묶음 두 줄
    for (const [dy, dx] of [[-8, -6], [-22, 6]]) {
      const yy = y - h / 2 + 24 + dy;
      line(ctx, 4);
      ctx.beginPath(); ctx.moveTo(x - w * 0.42 + dx, yy); ctx.lineTo(x + w * 0.42 + dx, yy); ctx.stroke();
      for (let i = 0; i < 5; i++) drawDumpling(ctx, x + dx + (i - 2) * w * 0.16, yy, w * 0.075, false);
    }
  } else {
    const spots = [[-0.28, -4], [0, -10], [0.28, -4], [-0.14, -22], [0.14, -22]];
    for (const [fx, dy] of spots) drawDumpling(ctx, x + fx * w, y - h / 2 + 24 + dy, w * 0.11, false);
  }
  // 이름표
  const lw = w * 0.62;
  ctx.fillStyle = '#fff';
  rr(ctx, x - lw / 2, y + 2, lw, 34, 10); ctx.fill();
  line(ctx, 4); ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.font = `26px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(o.amount === 5 ? '5개씩' : '1개씩', x, y + 20);
}

// ── 화덕(불) + 팬 ─────────────────────────────────────
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
  // 팬
  const pr = w * 0.44;
  line(ctx, 5);
  ctx.fillStyle = '#4b4b57';
  ctx.beginPath(); ctx.moveTo(x + pr * 0.9, py); ctx.lineTo(x + pr + 34, py - 10); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, py, pr, pr * 0.48, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6d6d7b';
  ctx.beginPath(); ctx.ellipse(x, py - 2, pr * 0.82, pr * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  if (o.n > 0) {
    const shake = o.state === 'cooking' ? Math.sin(t * 30) * 1.5 : 0;
    drawDumplingGrid(ctx, x + shake, py - 4, o.n, Math.min(13, (pr * 1.5) / 5), o.state === 'done', o.n > 10 ? 10 : 5);
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

// ── 남은 만두통 (버리기) ─────────────────────────────────
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
export function drawCarry(ctx, x, y, carry, t) {
  const n = carry.n;
  const cols = 5;
  const rows = Math.max(1, Math.ceil(n / cols));
  const g = 18;
  const tw = cols * g + 20, th = rows * g + (rows > 2 ? 6 : 0) + 16;
  const ty = y - th;
  ctx.fillStyle = carry.cooked ? '#ffffff' : '#c99366';
  rr(ctx, x - tw / 2, ty, tw, th, 12); ctx.fill();
  line(ctx, 4); ctx.stroke();
  drawDumplingGrid(ctx, x, ty + th / 2, n, g, carry.cooked);
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

// ── 손님 주문 말풍선 ────────────────────────────────────
// 반환: 말풍선 사각형 (누르기 판정용)
export function drawOrder(ctx, cx, bottom, maxW, c, t) {
  const p = c.p;
  const mid = c.state === 'eat' || c.state === 'leave' ? String(p.answer) : '?';
  const text = p.left + mid + p.right;
  let fs = 36;
  ctx.font = `${fs}px ${FONT}`;
  const tw = (s) => ctx.measureText(s).width;
  while (tw(text) > maxW - 24 && fs > 18) { fs -= 2; ctx.font = `${fs}px ${FONT}`; }
  const w = Math.max(tw(text) + 28, 110), h = fs + 40;
  const x = cx - w / 2, y = bottom - h;
  const pop = c.bubbleT < 0.3 ? 0.6 + c.bubbleT / 0.3 * 0.4 : 1;
  ctx.save();
  ctx.translate(cx, bottom); ctx.scale(pop, pop); ctx.translate(-cx, -bottom);
  if (c.shakeT > 0) ctx.translate(Math.sin(c.shakeT * 40) * 6, 0);
  ctx.fillStyle = c.vip ? '#fff3c4' : '#fff';
  rr(ctx, x, y, w, h, 18); ctx.fill();
  line(ctx, 4); ctx.stroke();
  // 꼬리
  ctx.beginPath(); ctx.moveTo(cx - 10, bottom - 1); ctx.lineTo(cx, bottom + 14); ctx.lineTo(cx + 10, bottom - 1);
  ctx.fillStyle = c.vip ? '#fff3c4' : '#fff'; ctx.fill(); ctx.stroke();
  // 식: 앞 · 빈칸(분홍/초록) · 뒤
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const left = p.left, right = p.right;
  let tx = cx - tw(text) / 2;
  const ty = y + fs / 2 + 10;
  ctx.fillStyle = OUTLINE; ctx.fillText(left, tx, ty); tx += tw(left);
  ctx.fillStyle = mid === '?' ? '#ff5c8a' : '#23a86b'; ctx.fillText(mid, tx, ty); tx += tw(mid);
  ctx.fillStyle = OUTLINE; ctx.fillText(right, tx, ty);
  // 기다림 막대 (줄어도 손님은 떠나지 않아요)
  if (c.state === 'wait') {
    const r = c.patience / c.patienceMax;
    const bw = w - 28;
    rr(ctx, x + 14, y + h - 18, bw, 9, 5); ctx.fillStyle = '#f3ece6'; ctx.fill();
    rr(ctx, x + 14, y + h - 18, Math.max(6, bw * r), 9, 5); ctx.fillStyle = r > 0.5 ? '#5ccf95' : r > 0.2 ? '#ffd65c' : '#ff8fab'; ctx.fill();
  }
  ctx.restore();
  if (c.vip) { ctx.font = `30px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('👑', x + 6, y + 4); }
  return { x, y, w, h };
}

// 다 먹는 동안 계산대 위 접시
export function drawPlate(ctx, x, y, n) {
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x, y, 54, 16, 0, 0, Math.PI * 2); ctx.fill();
  line(ctx, 4); ctx.stroke();
  const show = Math.min(n, 5);
  for (let i = 0; i < show; i++) drawDumpling(ctx, x + (i - (show - 1) / 2) * 18, y - 6, 9, true);
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
