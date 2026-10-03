// 문제 생성기. 초1 수준 범위로 제한한다.
//   add: a + b         (a: 딸기 사탕, b: 포도 사탕)
//   sub: a − b         (a: 봉지 안 사탕, b: 손님이 먹을 사탕)
//   mul: a × b         (a개씩 b봉지 — "2씩 3묶음")
//   div: a ÷ b         (사탕 a개를 b봉지에 똑같이 → 한 봉지에 몇 개)

export const MODES = {
  add: { sign: '+', label: '덧셈', emoji: '➕' },
  sub: { sign: '−', label: '뺄셈', emoji: '➖' },
  mul: { sign: '×', label: '곱셈', emoji: '✖️' },
  div: { sign: '÷', label: '나눗셈', emoji: '➗' },
};

export const LEVELS = {
  picture: { label: '그림으로 세기' },
  number:  { label: '숫자로 풀기' },
};

const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

const GEN = {
  add: {
    picture: () => { const s = rnd(3, 10); const a = rnd(1, s - 1); return [a, s - a]; },
    number:  () => { const a = rnd(2, 9); return [a, rnd(2, Math.min(9, 18 - a))]; },
  },
  sub: {
    picture: () => { const a = rnd(3, 10); return [a, rnd(1, a - 1)]; },
    number:  () => { const a = rnd(6, 18); return [a, rnd(1, Math.min(9, a - 1))]; },
  },
  mul: {
    picture: () => [rnd(2, 4), rnd(2, 4)],
    number:  () => [rnd(2, 5), rnd(2, 5)],
  },
  div: {
    picture: () => { const g = rnd(2, 3); return [g * rnd(2, 4), g]; },
    number:  () => { const g = rnd(2, 4); return [g * rnd(2, 5), g]; },
  },
};

function solve(mode, a, b) {
  switch (mode) {
    case 'add': return a + b;
    case 'sub': return a - b;
    case 'mul': return a * b;
    case 'div': return a / b;
  }
}

function makeChoices(mode, a, b, answer) {
  const ok = (n) => n >= 1 && n !== answer && n <= 30;
  // 아이들이 자주 하는 실수
  const common = {
    add: [],
    sub: [a + b],              // 빼야 하는데 더해 버림
    mul: [answer - a, answer + a], // 한 봉지 덜/더 셈
    div: [b],                  // 봉지 수와 헷갈림
  }[mode].filter(ok);
  const near = shuffle([answer - 1, answer + 1, answer - 2, answer + 2].filter(ok));
  const picks = [];
  if (common.length && Math.random() < 0.7) picks.push(common[rnd(0, common.length - 1)]);
  for (const n of near) if (picks.length < 2 && !picks.includes(n)) picks.push(n);
  return shuffle([answer, ...picks]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function orderText(p) {
  if (p.level === 'number') return '계산해 주세요!';
  switch (p.mode) {
    case 'add': return `딸기 사탕 ${p.a}개, 포도 사탕 ${p.b}개 주세요!`;
    case 'sub': return `사탕 ${p.a}개 중에 ${p.b}개는 지금 먹을래요!`;
    case 'mul': return `${p.a}개씩 ${p.b}봉지 주세요!`;
    case 'div': return `사탕 ${p.a}개를 ${p.b}봉지에 똑같이 나눠 주세요!`;
  }
}

export function questionText(p) {
  switch (p.mode) {
    case 'add': return '모두 몇 개일까?';
    case 'sub': return '남은 사탕은 몇 개일까?';
    case 'mul': return '모두 몇 개일까?';
    case 'div': return '한 봉지에 몇 개일까?';
  }
}

// count 개의 서로 다른 문제
export function makeProblemSet(mode, level, count = 5) {
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const [a, b] = GEN[mode][level]();
    const key = `${a},${b}`;
    if (seen.has(key) && guard < 150) continue;
    seen.add(key);
    const answer = solve(mode, a, b);
    out.push({
      mode, level, a, b, answer,
      expr: `${a} ${MODES[mode].sign} ${b}`,
      choices: makeChoices(mode, a, b, answer),
    });
  }
  return out;
}
