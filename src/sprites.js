// 스프라이트 시트 메타데이터.
// tools/sprite_pack.py 가 만든 <name>.json 내용을 그대로 붙여 넣으면 된다.
// src는 assets/sprites/ 기준 상대 경로.
export const SPRITES = {
  cat: {
    src: 'cat.png',
    frameW: 165,
    frameH: 181,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      groom: { row: 1, frames: 6, fps: 4 },
      happy: { row: 2, frames: 6, fps: 5 },
      surprise: { row: 3, frames: 6, fps: 8 },
    },
  },
  tiger: {
    src: 'tiger.png',
    frameW: 162,
    frameH: 180,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      giggle: { row: 1, frames: 6, fps: 8 },
      happy: { row: 2, frames: 6, fps: 5 },
    },
  },
  rabbit: {
    src: 'rabbit.png',
    frameW: 146,
    frameH: 166,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
    },
  },
  bear: {
    src: 'bear.png',
    frameW: 151,
    frameH: 166,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
    },
  },
  shiba: {
    src: 'shiba.png',
    frameW: 121,
    frameH: 166,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
    },
  },
  chick: {
    src: 'chick.png',
    frameW: 116,
    frameH: 166,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
    },
  },
  chipmunk: {
    src: 'chipmunk.png',
    frameW: 128,
    frameH: 166,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
    },
  },
  penguin: {
    src: 'penguin.png',
    frameW: 166,
    frameH: 165,
    anims: {
      row0: { row: 0, frames: 6, fps: 8 },
      row1: { row: 1, frames: 6, fps: 8 },
      row2: { row: 2, frames: 6, fps: 8 },
      row3: { row: 3, frames: 6, fps: 8 },
      row4: { row: 4, frames: 6, fps: 8 },
      row5: { row: 5, frames: 6, fps: 8 },
    },
  },
};

const SPRITE_DIR = 'assets/sprites/';
// 그림을 바꾸면 올린다 (폰 캐시에 예전 그림이 남지 않게)
const SPRITE_VERSION = 8;

// 시트 이미지를 불러와 SPRITES[name].image 에 붙인다. names 를 주면 그 시트만 (페이지마다 필요한 것만).
export function loadSprites(names = Object.keys(SPRITES)) {
  return Promise.all(names.map((name) => [name, SPRITES[name]]).filter(([, sheet]) => sheet).map(([name, sheet]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { sheet.image = img; resolve(); };
    img.onerror = () => { console.warn(`스프라이트 로드 실패: ${name}`); resolve(); };
    // 단일 HTML 빌드(tools/build_single.py)에서는 data URI로 박아 넣은 이미지를 쓴다
    const inline = window.NYANG_INLINE_SPRITES && window.NYANG_INLINE_SPRITES[sheet.src];
    img.src = inline || `${SPRITE_DIR}${sheet.src}?v=${SPRITE_VERSION}`;
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
