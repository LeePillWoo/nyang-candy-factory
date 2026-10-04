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

// 스프라이트 손님 — 한 판에 이 중에서 겹치지 않게 나온다. 새 동물 시트를 넣으면 여기에 추가.
export const FEATURED_CUSTOMERS = ['tiger', 'rabbit', 'bear', 'shiba', 'chick', 'chipmunk'];

function spriteCustomer(name, sprite, scale, anims) {
  return { name, kind: 'sprite', sprite, scale, faces: 'right', height: 160, anims: { walk: { anim: 'walk' }, ...anims } };
}
