// 펭귄 남극탐험 — 그리기 함수 모음 (모두 Canvas 코드 드로잉)
export const OUTLINE = '#4a3434';
const NAVY = '#2f3f5f';
const ORANGE = '#ffa53c';
const SCARF = '#ff5c7a';

function ell(ctx, x, y, rx, ry, fill, rot = 0, stroke = true) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) ctx.stroke();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ── 하늘 · 먼 빙산 ─────────────────────────────────────
export function drawSky(ctx, W, horizon, t) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#6ec2f5');
  g.addColorStop(1, '#d8f1ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horizon + 2);

  // 해
  ctx.save();
  ctx.fillStyle = '#fff4b0';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 5;
  ell(ctx, W * 0.82, horizon * 0.42, 38, 38, '#ffe27a');
  ctx.restore();

  // 구름
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  for (let i = 0; i < 4; i++) {
    const x = ((i * 337 + t * (12 + i * 4)) % (W + 240)) - 120;
    const y = horizon * (0.22 + 0.13 * (i % 3));
    ctx.beginPath();
    ctx.ellipse(x, y, 52, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 30, y - 12, 32, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 28, y - 6, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 지평선의 빙산들
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  const peaks = [[0.04, 54], [0.13, 92], [0.22, 60], [0.66, 70], [0.76, 112], [0.88, 66], [0.97, 84]];
  for (const [u, h] of peaks) {
    const x = u * W, w = h * 1.3;
    ctx.beginPath();
    ctx.moveTo(x - w, horizon);
    ctx.lineTo(x - w * 0.2, horizon - h);
    ctx.lineTo(x + w * 0.15, horizon - h * 0.82);
    ctx.lineTo(x + w, horizon);
    ctx.closePath();
    ctx.fillStyle = '#eef9ff';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - w * 0.2, horizon - h);
    ctx.lineTo(x - w * 0.05, horizon);
    ctx.lineTo(x + w * 0.15, horizon - h * 0.82);
    ctx.closePath();
    ctx.fillStyle = '#bfe3f7';
    ctx.fill();
  }
  ctx.restore();
}

// ── 얼음 땅 (원근 줄무늬 · 차선 · 길 가장자리) ─────────────
// proj(x, z) → {x, y, s}
export function drawGround(ctx, W, H, horizon, proj, dist, far) {
  const g = ctx.createLinearGradient(0, horizon, 0, H);
  g.addColorStop(0, '#e9f7ff');
  g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, W, H - horizon);

  // 달리는 느낌을 주는 줄무늬 (4 단위마다 옅은 띠)
  ctx.fillStyle = 'rgba(160, 214, 245, .28)';
  const off = dist % 4;
  for (let z = 4 - off; z < far; z += 4) {
    if (z < 0.6) continue;
    const y1 = proj(0, z).y, y2 = proj(0, z + 2).y;
    ctx.fillRect(0, y2, W, y1 - y2);
  }

  // 길 (푸른 얼음판)
  const edge = 1.75;
  const nearZ = 0.7;
  const a = proj(-edge, far), b = proj(edge, far), c = proj(edge, nearZ), d = proj(-edge, nearZ);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  ctx.fillStyle = 'rgba(188, 228, 250, .55)';
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();

  // 차선 점선
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineCap = 'round';
  const doff = dist % 3;
  for (const lx of [-0.5, 0.5]) {
    for (let z = 3 - doff; z < far; z += 3) {
      if (z < nearZ) continue;
      const p1 = proj(lx, z), p2 = proj(lx, Math.min(far, z + 1.4));
      ctx.lineWidth = Math.max(1.5, p1.s * 0.025);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }
  ctx.restore();
}

// 길가 눈 더미 (장식)
export function drawMound(ctx, p, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, p.s * 0.02);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.s * 0.32, p.s * 0.16, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ── 얼음 구멍 ─────────────────────────────────────────
export function drawHole(ctx, p, alpha, t) {
  const w = p.s * 0.42, h = p.s * 0.12;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1.5, p.s * 0.02);
  ctx.strokeStyle = OUTLINE;
  ell(ctx, p.x, p.y, w * 1.12, h * 1.25, '#ffffff');
  ell(ctx, p.x, p.y, w, h, '#2a6db0');
  ctx.save();
  ctx.globalAlpha = alpha * 0.6;
  ell(ctx, p.x - w * 0.25, p.y - h * 0.2 + Math.sin(t * 3) * h * 0.08, w * 0.35, h * 0.25, '#6fb6ef', 0, false);
  ctx.restore();
  ctx.restore();
}

// ── 물고기 ────────────────────────────────────────────
export function drawFish(ctx, x, y, size, t, color = ORANGE) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 6) * 0.15);
  ctx.lineWidth = Math.max(1.5, size * 0.07);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size * 0.35, 0);
  ctx.lineTo(size * 0.65, -size * 0.25);
  ctx.lineTo(size * 0.65, size * 0.25);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ell(ctx, 0, 0, size * 0.42, size * 0.26, color);
  ctx.fillStyle = OUTLINE;
  ctx.beginPath(); ctx.arc(-size * 0.2, -size * 0.04, Math.max(1, size * 0.055), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── 정답 깃발 (세 갈래) ────────────────────────────────
const BOARD = ['#ff8fab', '#ffd65c', '#7cc8f8'];
export function drawFlag(ctx, p, text, laneIdx, alpha, state) {
  const s = p.s;
  const bw = s * 0.9, bh = s * 0.48;
  const poleH = s * 0.62;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1.5, s * 0.018);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  // 기둥 둘
  ctx.fillStyle = '#c99366';
  for (const sx of [-0.3, 0.3]) {
    rr(ctx, p.x + bw * sx - s * 0.018, p.y - poleH, s * 0.036, poleH, s * 0.01);
    ctx.fill(); ctx.stroke();
  }
  // 판
  let fill = BOARD[laneIdx];
  if (state === 'right') fill = '#23a86b';
  if (state === 'wrong') fill = '#d9d0cb';
  rr(ctx, p.x - bw / 2, p.y - poleH - bh, bw, bh, s * 0.07);
  ctx.fillStyle = fill;
  ctx.fill(); ctx.stroke();
  // 숫자
  const len = String(text).length;
  const fs = Math.min(bh * 0.78, (bw * 0.9) / (len * 0.58));
  if (fs > 4) {
    ctx.font = `${fs}px Jua, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = state === 'wrong' ? '#9c8478' : state === 'right' ? '#ffffff' : OUTLINE;
    ctx.fillText(text, p.x, p.y - poleH - bh / 2 + fs * 0.06);
  }
  if (state === 'right' && s > 40) {
    ctx.font = `${bh * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⭐', p.x, p.y - poleH - bh - bh * 0.25);
  }
  ctx.restore();
}

// ── 문제 간판 (깃발 세 개 위에 걸린 큰 판) ─────────────────
// p = 가운데 길 바닥 위치, parts = [앞, 빈칸, 뒤] 글자, answer 가 있으면 빈칸에 정답을 초록으로
// 멀리서도 일찍 읽히도록 크게 (길 폭보다 넓은 간판). review = 전에 틀린 문제 → '다시 도전' 리본
export function drawQuizSign(ctx, p, parts, alpha, answer = null, review = false) {
  const s = p.s;
  const bw = s * 6.2, bh = s * 1.5;
  const bottom = p.y - s * 1.3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  // 양쪽 기둥
  ctx.fillStyle = '#c99366';
  for (const sx of [-1, 1]) {
    rr(ctx, p.x + sx * bw * 0.47 - s * 0.03, bottom - bh * 0.5, s * 0.06, p.y - bottom + bh * 0.5, s * 0.015);
    ctx.fill(); ctx.stroke();
  }
  // 판 (그림자 + 흰 판)
  ctx.fillStyle = OUTLINE;
  rr(ctx, p.x - bw / 2, bottom - bh + s * 0.05, bw, bh, s * 0.14); ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, p.x - bw / 2, bottom - bh, bw, bh, s * 0.14); ctx.fill(); ctx.stroke();
  // 글자: 앞 · ? · 뒤 (빈칸만 색을 바꿈)
  const [left, , right] = parts;
  const mid = answer === null ? '?' : String(answer);
  const len = (left + mid + right).length;
  const fs = Math.min(bh * 0.72, (bw * 0.92) / (len * 0.5));
  if (review && fs > 6) {
    const rs = fs * 0.42, rw = rs * 5.4, rh = rs * 1.5;
    const rx = p.x - bw / 2 + s * 0.2, ry = bottom - bh - rh * 0.6;
    ctx.fillStyle = '#ffd65c';
    rr(ctx, rx, ry, rw, rh, rh * 0.4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.font = `${rs}px Jua, sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText('🔁 다시 도전', rx + rw / 2, ry + rh / 2 + rs * 0.05);
  }
  if (fs > 3) {
    ctx.font = `${fs}px Jua, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const wl = ctx.measureText(left).width, wm = ctx.measureText(mid).width, wr = ctx.measureText(right).width;
    let x = p.x - (wl + wm + wr) / 2;
    const y = bottom - bh / 2 + fs * 0.06;
    ctx.fillStyle = OUTLINE; ctx.fillText(left, x, y); x += wl;
    ctx.fillStyle = answer === null ? '#ff5f8f' : '#23a86b'; ctx.fillText(mid, x, y); x += wm;
    ctx.fillStyle = OUTLINE; ctx.fillText(right, x, y);
  }
  ctx.restore();
}

// ── 남극 기지 ─────────────────────────────────────────
export function drawBase(ctx, p, alpha, flagUp, t) {
  const s = p.s;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(2, s * 0.02);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  // 이글루
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s * 0.9, s * 0.75, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,170,200,.6)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  for (let r = 1; r <= 3; r++) {
    const yy = p.y - s * 0.19 * r;
    ctx.beginPath(); ctx.moveTo(p.x - s, yy); ctx.lineTo(p.x + s, yy); ctx.stroke();
  }
  ctx.restore();
  // 문
  ctx.fillStyle = '#2a6db0';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s * 0.24, s * 0.32, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 깃대 + 깃발
  const px = p.x + s * 0.95, top = p.y - s * 1.5;
  ctx.fillStyle = '#c99366';
  rr(ctx, px - s * 0.02, top, s * 0.04, s * 1.5, s * 0.01); ctx.fill(); ctx.stroke();
  const fy = top + (1 - flagUp) * s * 1.05;
  const wave = Math.sin(t * 6) * s * 0.03;
  ctx.fillStyle = SCARF;
  ctx.beginPath();
  ctx.moveTo(px + s * 0.02, fy);
  ctx.quadraticCurveTo(px + s * 0.25, fy + wave, px + s * 0.5, fy + s * 0.02);
  ctx.lineTo(px + s * 0.5, fy + s * 0.3);
  ctx.quadraticCurveTo(px + s * 0.25, fy + s * 0.3 - wave, px + s * 0.02, fy + s * 0.28);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  if (s > 30) drawFish(ctx, px + s * 0.26, fy + s * 0.15, s * 0.2, 0, '#ffffff');
  ctx.restore();
}

// ── 펭귄 ──────────────────────────────────────────────
// pose: { t, run(0~1), view:'back'|'front', dir(-1~1 옆걸음), lift(px), mood:'run'|'happy'|'oops'|'fall', fallP(0~1) }
// (x, y) = 발 아래 중앙, S = 키(px)
export function drawPenguin(ctx, x, y, S, pose) {
  const { t, view = 'back', dir = 0, lift = 0, mood = 'run', fallP = 0 } = pose;
  const run = pose.run ?? 1;
  const step = Math.sin(t * 14) * run;

  // 그림자 (땅에 붙어 있음)
  ctx.save();
  ctx.globalAlpha = 0.18 * (1 - Math.min(0.6, lift / S));
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, S * 0.34, S * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 구멍에 빠짐: 물구멍을 먼저 그리고, 펭귄은 물 위쪽만 보이게 자른다
  if (mood === 'fall') {
    ctx.save();
    ctx.lineWidth = Math.max(2, S * 0.03);
    ctx.strokeStyle = OUTLINE;
    ell(ctx, x, y, S * 0.42, S * 0.12, '#2a6db0');
    ctx.restore();
  }
  ctx.save();
  if (mood === 'fall') { ctx.beginPath(); ctx.rect(x - S * 1.5, y - S * 3, S * 3, S * 3); ctx.clip(); }
  ctx.save();
  ctx.translate(x, y - lift + (mood === 'fall' ? S * 0.45 * fallP : 0));
  if (mood === 'fall') ctx.rotate(Math.sin(t * 18) * 0.12);
  else ctx.rotate(step * 0.06 + dir * 0.12);
  ctx.lineWidth = Math.max(2, S * 0.035);
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const bob = -Math.abs(step) * S * 0.03;

  // 발
  if (mood !== 'fall') {
    ell(ctx, -S * 0.15, -S * 0.03 + Math.min(0, step) * S * 0.06, S * 0.11, S * 0.05, ORANGE);
    ell(ctx, S * 0.15, -S * 0.03 + Math.min(0, -step) * S * 0.06, S * 0.11, S * 0.05, ORANGE);
  }

  ctx.translate(0, bob);
  const happy = mood === 'happy';

  // 날개 (몸 뒤)
  const flapUp = happy ? -0.9 + Math.sin(t * 12) * 0.3 : mood === 'oops' || mood === 'fall' ? -1.3 : 0.25 + step * 0.25;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * S * 0.27, -S * 0.5);
    ctx.rotate(sd * flapUp);
    ell(ctx, sd * S * 0.03, S * 0.14, S * 0.07, S * 0.18, NAVY);
    ctx.restore();
  }

  // 몸 + 머리: 외곽선을 먼저 그리고 채워서 이음새 없이
  const body = () => { ctx.beginPath(); ctx.ellipse(0, -S * 0.4, S * 0.3, S * 0.4, 0, 0, Math.PI * 2); };
  const head = () => { ctx.beginPath(); ctx.arc(0, -S * 0.8, S * 0.21, 0, Math.PI * 2); };
  ctx.lineWidth = Math.max(2, S * 0.035) * 2;
  body(); ctx.stroke(); head(); ctx.stroke();
  ctx.lineWidth = Math.max(2, S * 0.035);
  ctx.fillStyle = NAVY;
  body(); ctx.fill(); head(); ctx.fill();

  if (view === 'front') {
    // 배
    ell(ctx, 0, -S * 0.36, S * 0.2, S * 0.28, '#ffffff', 0, false);
    // 얼굴 흰 부분
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-S * 0.08, -S * 0.8, S * 0.1, S * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(S * 0.08, -S * 0.8, S * 0.1, S * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // 눈
    ctx.fillStyle = OUTLINE;
    ctx.strokeStyle = OUTLINE;
    for (const sd of [-1, 1]) {
      const ex = sd * S * 0.08, ey = -S * 0.82;
      if (happy) {
        ctx.lineWidth = Math.max(2, S * 0.025);
        ctx.beginPath(); ctx.arc(ex, ey + S * 0.02, S * 0.035, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else if (mood === 'oops' || mood === 'fall') {
        ctx.lineWidth = Math.max(2, S * 0.022);
        ctx.beginPath();
        ctx.moveTo(ex - S * 0.03, ey - S * 0.03); ctx.lineTo(ex + S * 0.03 * -sd, ey);
        ctx.lineTo(ex - S * 0.03, ey + S * 0.03);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(ex, ey, S * 0.03, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 볼
    ctx.save(); ctx.globalAlpha = 0.6;
    ell(ctx, -S * 0.14, -S * 0.72, S * 0.035, S * 0.022, '#ff9fb2', 0, false);
    ell(ctx, S * 0.14, -S * 0.72, S * 0.035, S * 0.022, '#ff9fb2', 0, false);
    ctx.restore();
    // 부리
    ctx.lineWidth = Math.max(1.5, S * 0.02);
    ctx.beginPath();
    ctx.moveTo(-S * 0.05, -S * 0.75); ctx.lineTo(S * 0.05, -S * 0.75); ctx.lineTo(0, -S * (happy ? 0.66 : 0.69));
    ctx.closePath();
    ctx.fillStyle = ORANGE; ctx.fill(); ctx.stroke();
  } else {
    // 뒷모습: 옆으로 갈 때 부리 끝이 살짝 보임
    if (Math.abs(dir) > 0.15) {
      ctx.lineWidth = Math.max(1.5, S * 0.02);
      const sd = Math.sign(dir);
      ctx.beginPath();
      ctx.moveTo(sd * S * 0.18, -S * 0.84); ctx.lineTo(sd * S * 0.29, -S * 0.8); ctx.lineTo(sd * S * 0.18, -S * 0.76);
      ctx.closePath();
      ctx.fillStyle = ORANGE; ctx.fill(); ctx.stroke();
    }
    // 등의 하얀 꼬리 끝
    ell(ctx, 0, -S * 0.06, S * 0.08, S * 0.04, '#ffffff', 0, false);
  }

  // 빨간 목도리 (탐험가!)
  ctx.lineWidth = Math.max(1.5, S * 0.025);
  rr(ctx, -S * 0.2, -S * 0.64, S * 0.4, S * 0.08, S * 0.04);
  ctx.fillStyle = SCARF; ctx.fill(); ctx.stroke();
  if (view === 'back') {
    // 목도리 꼬리가 바람에 펄럭
    const wv = Math.sin(t * 10) * S * 0.04;
    ctx.beginPath();
    ctx.moveTo(S * 0.06, -S * 0.58);
    ctx.quadraticCurveTo(S * 0.16 + wv, -S * 0.48, S * 0.1 + wv * 1.5, -S * 0.36);
    ctx.lineTo(S * 0.0 + wv, -S * 0.38);
    ctx.quadraticCurveTo(S * 0.06, -S * 0.48, -S * 0.02, -S * 0.58);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();

  // 구멍에 빠졌을 때: 앞쪽 물결
  if (mood === 'fall') {
    ctx.save();
    ctx.fillStyle = 'rgba(111, 182, 239, .9)';
    ctx.beginPath();
    ctx.ellipse(x, y + S * 0.02, S * 0.36, S * 0.08, 0, 0, Math.PI);
    ctx.fill();
    ctx.restore();
  }
}

// ── 파티클 ────────────────────────────────────────────
export function drawParticle(ctx, p) {
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
    ctx.fill(); ctx.stroke();
  } else if (p.kind === 'drop') {
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
