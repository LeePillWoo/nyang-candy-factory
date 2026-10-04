// 캐릭터 정의. kind 로 그리는 방식을 고른다.
//   kind: 'sprite' — SPRITES 의 시트를 사용. anims[이름] = { anim: 시트 애니 이름, seq?: 프레임 순서, fps?, scale? }
//   kind: 'shape'  — Canvas 코드로 직접 그림. draw(ctx, pose) 를 제공.
// 게임 로직은 'idle' / 'walk' / 'happy' … 같은 동작 이름만 쓰고(없는 동작은 idle 로 그림),
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
  // 동작 이름 (게임은 이 이름만 쓴다. 없으면 idle 로 그린다)
  //   idle  기다리기 — 좋아하는 간식을 꼭 들고 (가끔 웃고 깜빡)
  //   happy 받았다! (만세 · 하트)        love  척척 · 한 번에 맞힘 (하트 뿅뿅)
  //   yay   기분 최고 (간식 들고 반짝)   eat   사탕 받아먹기 (뺄셈)
  //   sad   어? 이게 아닌데 (갸우뚱)      think 오래 기다리면 긁적 · 물음표
  //   sleep 아주 오래 기다리면 꾸벅꾸벅 (그림에 zzz 가 없으면 zzz: [x, y] 자리(키 비율, 발 기준)에 코드로 그려 줌)
  tiger: {
    name: '호돌이',
    food: '물고기',
    kind: 'sprite',
    sprite: 'tiger',
    scale: 1.08,          // 다른 손님들(키 약 150~165px)과 비슷하게
    faces: 'right',
    height: 165,
    anims: {
      idle:  { anim: 'hold', seq: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0], fps: 3 },
      walk:  { anim: 'walk' },
      happy: { anim: 'happy', seq: [2, 3, 4, 4, 3], fps: 5 },
      love:  { anim: 'happy', seq: [4], fps: 1 },
      yay:   { anim: 'hold', seq: [4, 5, 5, 5, 5], fps: 4 },
      eat:   { anim: 'giggle', seq: [1, 2, 3, 2], fps: 7 },
      sad:   { anim: 'feel', seq: [1], fps: 1 },
      think: { anim: 'feel', seq: [0, 0, 0, 0, 1, 1], fps: 2 },
      sleep: { anim: 'giggle', seq: [0], fps: 1, zzz: [0.28, 0.78] },
    },
  },

  // 시트 행: walk=걷기, sit=앉은 표정, fun=걱정·긁적·하트·만세, item=간식 줍기·먹기·졸기, hold=간식 들고 있기
  rabbit:   spriteCustomer('토순이', 'rabbit', 1.12, '당근', {
    happy: { anim: 'fun', seq: [2, 3, 4, 4, 3], fps: 5 },
    love: { anim: 'fun', seq: [4], fps: 1 },
    eat: { anim: 'sit', seq: [1, 2, 1, 2], fps: 6 },
    sleep: { anim: 'item', seq: [2], fps: 1, zzz: [0.26, 0.46] },   // 당근 안고 누워서 쿨쿨
  }),
  bear:     spriteCustomer('곰돌이', 'bear', 1.25, '사과', {
    happy: { anim: 'fun', seq: [3, 4, 4, 2], fps: 5 },
    love: { anim: 'fun', seq: [3, 4], fps: 2 },
    eat: { anim: 'sit', seq: [1, 2, 1, 2], fps: 6 },
    sleep: { anim: 'item', seq: [2], fps: 1, zzz: [0.26, 0.46] },   // 사과 안고 누워서 쿨쿨
  }),
  shiba:    spriteCustomer('시바', 'shiba', 1.25, '뼈다귀', {
    happy: { anim: 'fun', seq: [3, 4, 2, 4], fps: 5 },
    eat: { anim: 'sit', seq: [1, 3, 1, 3], fps: 6 },
    think: { anim: 'fun', seq: [5, 5, 5, 1, 1, 1], fps: 2 },  // 물음표 → 긁적
  }),
  chick:    spriteCustomer('삐약이', 'chick', 1.22, '오리 인형', {
    happy: { anim: 'fun', seq: [3, 4, 2, 4], fps: 5 },
    eat: { anim: 'sit', seq: [1, 3, 1, 3], fps: 6 },
  }),
  chipmunk: spriteCustomer('다람이', 'chipmunk', 1.28, '도토리', {
    happy: { anim: 'fun', seq: [3, 4, 2, 4], fps: 5 },
    eat: { anim: 'sit', seq: [1, 3, 1, 3], fps: 6 },
    think: { anim: 'fun', seq: [5, 5, 5, 1, 1, 1], fps: 2 },
  }),
  panda:    spriteCustomer('판돌이', 'panda', 1.28, '대나무', {
    happy: { anim: 'fun', seq: [3, 4, 2, 4], fps: 5 },
    eat: { anim: 'sit', seq: [1, 2, 1, 2], fps: 6 },
  }),
  // 거북이 시트는 행이 조금 달라요: sit=미역 들고 앉기, fun=걱정·긁적·하트눈·웃음·파란 하트·생각, item=서기·먹기·안기·졸기·뒷모습·반짝
  turtle:   spriteCustomer('엉금이', 'turtle', 1.3, '미역', {
    idle: { anim: 'sit', seq: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 4, 0], fps: 3 },
    happy: { anim: 'fun', seq: [3, 3, 4, 4], fps: 4 },
    love: { anim: 'fun', seq: [2], fps: 1 },
    eat: { anim: 'sit', seq: [1, 2, 1, 2], fps: 6 },
    think: { anim: 'fun', seq: [5, 5, 5, 1, 1, 1], fps: 2 },
    yay: { anim: 'item', seq: [5], fps: 1 },
  }),
};

// 스프라이트 손님 — 한 판에 이 중에서 겹치지 않게 나온다. 새 동물 시트를 넣으면 여기에 추가.
export const FEATURED_CUSTOMERS = ['tiger', 'rabbit', 'bear', 'shiba', 'chick', 'chipmunk', 'panda', 'turtle'];

// 표준 시트(walk · sit · fun · feel · item · hold) 손님의 기본 동작. 동물마다 다른 것만 덮어쓴다.
function spriteCustomer(name, sprite, scale, food, anims) {
  return {
    name, food, kind: 'sprite', sprite, scale, faces: 'right', height: 160,
    anims: {
      walk: { anim: 'walk' },
      idle: { anim: 'hold', seq: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0], fps: 3 },
      love: { anim: 'fun', seq: [2, 4], fps: 2 },
      yay: { anim: 'hold', seq: [4, 5, 5, 5, 5], fps: 4 },
      sad: { anim: 'fun', seq: [0], fps: 1 },
      think: { anim: 'fun', seq: [1, 1, 1, 0, 0, 0], fps: 2 },
      sleep: { anim: 'item', seq: [3], fps: 1 },
      ...anims,
    },
  };
}
