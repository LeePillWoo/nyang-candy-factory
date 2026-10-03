// 캐릭터 정의. kind 로 그리는 방식을 고른다.
//   kind: 'sprite' — SPRITES 의 시트를 사용. anims[이름] = { anim: 시트 애니 이름, seq?: 프레임 순서, fps?, scale? }
//   kind: 'shape'  — Canvas 코드로 직접 그림. draw(ctx, pose) 를 제공.
// 게임 로직은 'idle' / 'walk' (그리고 있으면 'happy') 이름만 사용하므로
// 같은 이름만 맞추면 어떤 캐릭터로든 교체할 수 있다.

export const OUTLINE = '#4a3434';

export const CHARACTERS = {
  nyang: {
    name: '냥이',
    kind: 'sprite',
    sprite: 'cat',
    scale: 1.0,           // 화면에 그릴 배율
    faces: 'right',       // 시트 그림(걷기)이 바라보는 방향
    height: 140,          // 머리 위 말풍선/짐 위치 계산용 (배율 적용 후 px)
    anims: {
      // 앉아서 두리번 → 가끔 세수
      idle:  { anim: 'groom', seq: [0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 0, 0, 0, 0, 1, 2, 3, 4, 3, 4, 0, 0], fps: 4 },
      walk:  { anim: 'walk' },
      happy: { anim: 'happy', seq: [1, 2, 3, 3, 2, 4, 4], fps: 5 },
      sad:   { anim: 'surprise', seq: [1, 1, 1, 0], fps: 3 },
    },
  },

  // ── 스프라이트 손님 (FEATURED_CUSTOMERS: 한 판에 한 번씩 꼭 나옴) ──
  tiger: {
    name: '호돌이',
    kind: 'sprite',
    sprite: 'tiger',
    scale: 1.08,          // 다른 손님들(키 약 150~165px)과 비슷하게
    faces: 'right',
    height: 165,
    anims: {
      idle:  { anim: 'happy', seq: [0, 0, 0, 0, 0, 5, 5, 5, 5], fps: 3 },
      walk:  { anim: 'walk' },
      happy: { anim: 'happy', seq: [2, 3, 4, 4, 3], fps: 5 },
      eat:   { anim: 'giggle', seq: [1, 2, 3, 2], fps: 7 },
    },
  },

  // idle = 앉아서 기다리기, happy = 정답!, eat = 뺄셈에서 사탕 받아먹기
  // (시트 행: walk=걷기, sit=앉은 표정들, fun=하트·만세)
  rabbit:   spriteCustomer('토순이', 'rabbit', 1.12, {
    idle: { anim: 'fun', seq: [5, 5, 5, 5, 5, 0, 0, 0], fps: 3 },
    happy: { anim: 'fun', seq: [2, 3, 4, 4, 3], fps: 5 },
    eat: { anim: 'sit', seq: [1, 2, 1, 2], fps: 6 },
  }),
  bear:     spriteCustomer('곰돌이', 'bear', 1.25, {
    idle: { anim: 'sit', seq: [0, 0, 0, 0, 0, 3, 3, 3], fps: 3 },
    happy: { anim: 'fun', seq: [3, 4, 4, 2], fps: 5 },
    eat: { anim: 'sit', seq: [1, 2, 1, 2], fps: 6 },
  }),
  shiba:    spriteCustomer('시바', 'shiba', 1.25, {
    idle: { anim: 'sit', seq: [3, 3, 3, 3, 3, 4, 4, 4], fps: 3 },
    happy: { anim: 'fun', seq: [3, 4, 2, 4], fps: 5 },
    eat: { anim: 'sit', seq: [1, 3, 1, 3], fps: 6 },
  }),
  chick:    spriteCustomer('삐약이', 'chick', 1.22, {
    idle: { anim: 'sit', seq: [3, 3, 3, 3, 3, 0, 0, 0], fps: 3 },
    happy: { anim: 'fun', seq: [3, 4, 2, 4], fps: 5 },
    eat: { anim: 'sit', seq: [1, 3, 1, 3], fps: 6 },
  }),
  chipmunk: spriteCustomer('다람이', 'chipmunk', 1.28, {
    idle: { anim: 'sit', seq: [3, 3, 3, 3, 3, 4, 4, 4], fps: 3 },
    happy: { anim: 'fun', seq: [3, 4, 2, 4], fps: 5 },
    eat: { anim: 'sit', seq: [1, 3, 1, 3], fps: 6 },
  }),
};

// 스프라이트 손님 — 한 판(손님 5명)에 이 중에서 겹치지 않게 나온다. 새 동물 시트를 넣으면 여기에 추가.
export const FEATURED_CUSTOMERS = ['tiger', 'rabbit', 'bear', 'shiba', 'chick', 'chipmunk'];
// 코드로 그린 손님 — 스프라이트 손님이 5마리보다 적을 때 빈자리를 채운다 (지금은 모두 스프라이트로 바꿔서 비어 있음).
// 코드 동물이 필요하면 CHARACTERS 에 shape('이름', { body, belly, ears, face, tail, … }) 로 만들고 여기에 키를 넣으면 된다.
export const CUSTOMER_KEYS = [];

function spriteCustomer(name, sprite, scale, anims) {
  return { name, kind: 'sprite', sprite, scale, faces: 'right', height: 160, anims: { walk: { anim: 'walk' }, ...anims } };
}

// eslint-disable-next-line no-unused-vars
function shape(name, look) {
  return {
    name,
    kind: 'shape',
    faces: 'front',
    height: 165,
    look,
    draw: (ctx, pose) => drawCritter(ctx, look, pose),
  };
}

// ── 코드 드로잉 동물 ──────────────────────────────────────────
function ell(ctx, x, y, rx, ry, fill, rot = 0, stroke = true) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) ctx.stroke();
}

// pose: { anim: 'idle'|'walk'|'happy'|'eat', t: 초 }
// (0,0) = 발 아래 중앙. 키는 약 165px.
export function drawCritter(ctx, L, pose) {
  const t = pose.t || 0;
  const anim = pose.anim || 'idle';
  const walking = anim === 'walk';
  const happy = anim === 'happy';
  const eating = anim === 'eat';
  const limb = L.limbs || L.body;

  const step = walking ? Math.sin(t * 12) : 0;
  const bob = walking ? -Math.abs(Math.sin(t * 12)) * 6 : happy ? -Math.abs(Math.sin(t * 9)) * 10 : Math.sin(t * 2.4) * 1.5;
  const headTilt = walking ? Math.sin(t * 6) * 0.05 : happy ? Math.sin(t * 9) * 0.08 : Math.sin(t * 1.3) * 0.03;

  ctx.save();
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.18;
  ell(ctx, 0, 0, 46, 9, '#000', 0, false);
  ctx.restore();

  // 다리
  ell(ctx, -20, -12 + Math.min(0, step) * 8, 15, 13, limb);
  ell(ctx, 20, -12 + Math.min(0, -step) * 8, 15, 13, limb);

  ctx.translate(0, bob);

  // 꼬리 (몸 뒤)
  drawTail(ctx, L, t);

  // 몸
  ell(ctx, 0, -52, 40, 40, L.body);
  ell(ctx, 0, -48, 25, 26, L.belly, 0, false);

  // 팔
  const armUp = happy ? -30 + Math.sin(t * 9) * 6 : eating ? -18 : 0;
  const armSwing = walking ? step * 5 : 0;
  ell(ctx, -38, -60 + armUp + armSwing, 12, 15, limb, happy ? 0.6 : 0.3);
  ell(ctx, 38, -60 + armUp - armSwing, 12, 15, limb, happy ? -0.6 : -0.3);

  // 머리
  ctx.save();
  ctx.translate(0, -112);
  ctx.rotate(headTilt);
  drawEars(ctx, L, t, 'back');
  ell(ctx, 0, 0, 48, 44, L.body);
  drawFace(ctx, L, { happy, eating, t });
  drawEars(ctx, L, t, 'front');
  ctx.restore();

  ctx.restore();
}

function drawTail(ctx, L, t) {
  switch (L.tail) {
    case 'puff': ell(ctx, 36, -32, 13, 13, '#ffffff'); break;
    case 'nub': ell(ctx, 34, -30, 10, 9, L.limbs || L.body); break;
    case 'curl':
      ctx.beginPath();
      ctx.moveTo(36, -40);
      ctx.bezierCurveTo(60, -50, 56, -24, 46, -32);
      ctx.bezierCurveTo(40, -38, 52, -44, 56, -36);
      ctx.stroke();
      break;
    case 'wag': {
      const a = Math.sin(t * 10) * 0.35;
      ctx.save(); ctx.translate(32, -44); ctx.rotate(-0.6 + a);
      ell(ctx, 14, 0, 18, 8, L.body);
      ctx.restore();
      break;
    }
    case 'fox': {
      const a = Math.sin(t * 2.5) * 0.12;
      ctx.save(); ctx.translate(30, -30); ctx.rotate(-0.5 + a);
      ell(ctx, 30, 0, 34, 16, L.body);
      ell(ctx, 54, 0, 12, 10, '#fff3e6');
      ctx.restore();
      break;
    }
  }
}

function drawEars(ctx, L, t, layer) {
  const ec = L.earColor || L.body;
  if (layer === 'back') {
    switch (L.ears) {
      case 'round':
        ell(ctx, -34, -34, 16, 16, ec); ell(ctx, 34, -34, 16, 16, ec);
        ell(ctx, -34, -34, 8, 8, L.inner, 0, false); ell(ctx, 34, -34, 8, 8, L.inner, 0, false);
        break;
      case 'long': {
        const w = Math.sin(t * 2) * 0.06;
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(s * 18, -34); ctx.rotate(s * (0.16 + w));
          ell(ctx, 0, -34, 13, 38, ec);
          ell(ctx, 0, -32, 6, 28, L.inner, 0, false);
          ctx.restore();
        }
        break;
      }
      case 'pointy':
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 14, -36); ctx.lineTo(s * 40, -72); ctx.lineTo(s * 46, -22); ctx.closePath();
          ctx.fillStyle = ec; ctx.fill(); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s * 40, -72); ctx.lineTo(s * 35, -54); ctx.lineTo(s * 44, -50); ctx.closePath();
          ctx.fillStyle = L.tip; ctx.fill();
        }
        break;
    }
  } else {
    switch (L.ears) {
      case 'floppy':
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(s * 40, -18); ctx.rotate(s * (0.25 + Math.sin(t * 3) * 0.05));
          ell(ctx, 0, 18, 13, 26, L.inner);
          ctx.restore();
        }
        break;
      case 'flop-tri':
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 16, -38); ctx.lineTo(s * 46, -46); ctx.lineTo(s * 38, -14); ctx.closePath();
          ctx.fillStyle = L.inner; ctx.fill(); ctx.stroke();
        }
        break;
    }
  }
}

function drawFace(ctx, L, { happy, eating, t }) {
  const blink = !happy && (t % 3.7) < 0.12;

  if (L.face === 'panda') {
    ell(ctx, -18, 0, 13, 16, '#3d3535', -0.5, false);
    ell(ctx, 18, 0, 13, 16, '#3d3535', 0.5, false);
  }
  if (L.patch) ell(ctx, 18, -4, 14, 12, L.patch, 0.3, false);
  if (L.face === 'fox') {
    ell(ctx, -20, 16, 20, 15, '#fff3e6', 0.3, false);
    ell(ctx, 20, 16, 20, 15, '#fff3e6', -0.3, false);
  }

  // 눈
  const eyeColor = L.face === 'panda' ? '#ffffff' : '#3a2a2a';
  for (const s of [-1, 1]) {
    const ex = s * 17, ey = -2;
    if (happy || blink) {
      ctx.save();
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (happy) ctx.arc(ex, ey + 3, 6, Math.PI * 1.1, Math.PI * 1.9);
      else { ctx.moveTo(ex - 6, ey); ctx.lineTo(ex + 6, ey); }
      ctx.stroke();
      ctx.restore();
    } else {
      ell(ctx, ex, ey, 6, 7, eyeColor, 0, false);
      ell(ctx, ex + 2, ey - 3, 2.2, 2.2, L.face === 'panda' ? '#3d3535' : '#ffffff', 0, false);
    }
  }

  // 볼터치
  ctx.save(); ctx.globalAlpha = 0.55;
  ell(ctx, -30, 14, 8, 5, '#ff8fa3', 0, false);
  ell(ctx, 30, 14, 8, 5, '#ff8fa3', 0, false);
  ctx.restore();

  // 코 / 입
  const mouthOpen = happy || (eating && Math.sin(t * 14) > 0);
  ctx.lineWidth = 3.5;
  switch (L.face) {
    case 'snout':
      ell(ctx, 0, 14, 15, 11, L.snout);
      ell(ctx, -5, 14, 2.5, 3.5, OUTLINE, 0, false);
      ell(ctx, 5, 14, 2.5, 3.5, OUTLINE, 0, false);
      mouth(ctx, 0, 30, mouthOpen);
      break;
    case 'muzzle':
      ell(ctx, 0, 16, 18, 13, L.muzzle, 0, true);
      ell(ctx, 0, 10, 6, 4.5, OUTLINE, 0, false);
      mouth(ctx, 0, 18, mouthOpen);
      break;
    case 'bunny':
      ell(ctx, 0, 9, 4.5, 3.5, '#ff9fb2', 0, false);
      mouth(ctx, 0, 14, mouthOpen);
      break;
    default:
      ell(ctx, 0, 9, 5, 4, OUTLINE, 0, false);
      mouth(ctx, 0, 14, mouthOpen);
  }
}

function mouth(ctx, x, y, open) {
  ctx.beginPath();
  if (open) {
    ctx.moveTo(x - 7, y);
    ctx.quadraticCurveTo(x, y + 12, x + 7, y);
    ctx.closePath();
    ctx.fillStyle = '#e8606f';
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.moveTo(x - 7, y);
    ctx.quadraticCurveTo(x - 3.5, y + 5, x, y);
    ctx.quadraticCurveTo(x + 3.5, y + 5, x + 7, y);
    ctx.stroke();
  }
}
