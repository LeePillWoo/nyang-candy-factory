// 스프라이트 시트 메타데이터.
// tools/sprite_pack.py 가 만든 <name>.json 내용을 그대로 붙여 넣으면 된다.
// src는 assets/sprites/ 기준 상대 경로.
export const SPRITES = {
  cat: {
    src: 'cat.png',
    frameW: 116,
    frameH: 102,
    anims: {
      walk:  { row: 0, frames: 8, fps: 12 },
      run:   { row: 1, frames: 8, fps: 14 },
      jump:  { row: 2, frames: 8, fps: 8 },
      idle:  { row: 3, frames: 8, fps: 4 },
      groom: { row: 4, frames: 8, fps: 8 },
      sleep: { row: 5, frames: 8, fps: 8 },
      face:  { row: 6, frames: 8, fps: 8 },
      play:  { row: 7, frames: 8, fps: 8 },
    },
  },
};

const SPRITE_DIR = 'assets/sprites/';

// 모든 시트 이미지를 불러와 SPRITES[name].image 에 붙인다.
export function loadSprites() {
  return Promise.all(Object.entries(SPRITES).map(([name, sheet]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { sheet.image = img; resolve(); };
    img.onerror = () => { console.warn(`스프라이트 로드 실패: ${name}`); resolve(); };
    img.src = SPRITE_DIR + sheet.src;
  })));
}

// 시트의 한 프레임을 (0,0)=발 아래 중앙 기준으로 그린다.
export function drawSpriteFrame(ctx, sheet, animName, frame, scale = 1, flip = false) {
  const anim = sheet.anims[animName];
  if (!sheet.image || !anim) return false;
  const { frameW: w, frameH: h } = sheet;
  const f = ((frame % anim.frames) + anim.frames) % anim.frames;
  ctx.save();
  ctx.scale(flip ? -scale : scale, scale);
  ctx.drawImage(sheet.image, f * w, anim.row * h, w, h, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}
