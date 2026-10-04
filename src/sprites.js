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
  // 손님 시트 행: walk=걷기, sit=앉은 표정, fun=걱정·긁적·하트·만세, feel=놀람·뾰로통(울음·화남은 안 씀),
  //            item=좋아하는 간식(사과·당근·뼈다귀…) 줍기·먹기·졸기, hold=간식 들고 있기(마지막 칸은 반짝)
  // 거북이는 sit 에 미역을 들고 있고, item 칸 순서가 달라요 (서기·먹기·안기·졸기·뒷모습·반짝)
  tiger: {
    src: 'tiger.png',
    frameW: 167,
    frameH: 183,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      giggle: { row: 1, frames: 6, fps: 8 },
      happy: { row: 2, frames: 6, fps: 5 },
      feel: { row: 3, frames: 6, fps: 8 },
      item: { row: 4, frames: 6, fps: 8 },
      hold: { row: 5, frames: 6, fps: 8 },
    },
  },
  rabbit: {
    src: 'rabbit.png',
    frameW: 149,
    frameH: 165,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
      feel: { row: 3, frames: 6, fps: 8 },
      item: { row: 4, frames: 6, fps: 8 },
      hold: { row: 5, frames: 6, fps: 8 },
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
      feel: { row: 3, frames: 6, fps: 8 },
      item: { row: 4, frames: 6, fps: 8 },
      hold: { row: 5, frames: 6, fps: 8 },
    },
  },
  shiba: {
    src: 'shiba.png',
    frameW: 151,
    frameH: 167,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
      feel: { row: 3, frames: 6, fps: 8 },
      item: { row: 4, frames: 6, fps: 8 },
      hold: { row: 5, frames: 6, fps: 8 },
    },
  },
  chick: {
    src: 'chick.png',
    frameW: 166,
    frameH: 168,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
      feel: { row: 3, frames: 6, fps: 8 },
      item: { row: 4, frames: 6, fps: 8 },
      hold: { row: 5, frames: 6, fps: 8 },
    },
  },
  chipmunk: {
    src: 'chipmunk.png',
    frameW: 147,
    frameH: 165,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
      feel: { row: 3, frames: 6, fps: 8 },
      item: { row: 4, frames: 6, fps: 8 },
      hold: { row: 5, frames: 6, fps: 8 },
    },
  },
  turtle: {
    src: 'turtle.png',
    frameW: 152,
    frameH: 163,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
      feel: { row: 3, frames: 6, fps: 8 },
      item: { row: 4, frames: 6, fps: 8 },
    },
  },
  panda: {
    src: 'panda.png',
    frameW: 150,
    frameH: 154,
    anims: {
      walk: { row: 0, frames: 6, fps: 10 },
      sit: { row: 1, frames: 6, fps: 8 },
      fun: { row: 2, frames: 6, fps: 8 },
      feel: { row: 3, frames: 6, fps: 8 },
      item: { row: 4, frames: 6, fps: 8 },
      hold: { row: 5, frames: 6, fps: 8 },
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

// 머리 꼭대기 (모자 자리): 프레임 아래 가운데를 (0,0) 으로 한 시트 픽셀 좌표 [x, y], size = 모자 크기.
// 고양이는 귀 사이, 펭귄은 머리 깃털 바로 아래. (tools 없이 시트를 보고 맞춘 값)
export const HEADS = {
  cat: {
    size: 80,
    anims: {
      walk: [[44, -124], [44, -126], [44, -119], [44, -119], [44, -118], [44, -125]],
      groom: [[12, -131], [29, -136], [27, -135], [17, -128], [13, -131], [5, -133]],
      happy: [[9, -133], [4, -139], [9, -143], [8, -140], [17, -142], [6, -125]],
      surprise: [[12, -121], [26, -118], [-4, -102], [-12, -124], [4, -101], [17, -117]],
    },
  },
  penguin: {
    size: 66,
    anims: {
      row0: [[24, -117], [14, -108], [6, -125], [-2, -125], [-13, -126], [-7, -121]],
      row1: [[22, -129], [15, -131], [7, -130], [-3, -114], [-12, -107], [-20, -111]],
      row2: [[24, -135], [16, -135], [6, -124], [-2, -134], [-10, -130], [-18, -136]],
      row3: [[21, -141], [13, -141], [8, -141], [-2, -135], [-14, -142], [-20, -140]],
      row4: [[36, -149], [26, -105], [14, -91], [10, -129], [-6, -140], [-21, -135]],
      row5: [[32, -145], [20, -145], [8, -140], [-2, -152], [-11, -152], [-20, -152]],
    },
  },
};

// 시트 픽셀 좌표의 머리 꼭대기 → 그릴 때 좌표 (scale, flip 적용). 없으면 null
export function headOf(sheetName, animName, frame, scale = 1, flip = false) {
  const h = HEADS[sheetName];
  const list = h && h.anims[animName];
  if (!list) return null;
  const n = list.length;
  const f = Number.isFinite(frame) ? ((Math.floor(frame) % n) + n) % n : 0;
  const [x, y] = list[f];
  return { x: (flip ? -x : x) * scale, y: y * scale, size: h.size * scale };
}

const SPRITE_DIR = 'assets/sprites/';
// 그림을 바꾸면 올린다 (폰 캐시에 예전 그림이 남지 않게)
const SPRITE_VERSION = 9;

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
