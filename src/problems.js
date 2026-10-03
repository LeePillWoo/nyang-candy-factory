// 문제 생성기.
//   add:  a + b        (a: 딸기 사탕, b: 포도 사탕)
//   sub:  a − b        (a: 봉지 안 사탕, b: 손님이 먹을 사탕)
//   mul:  a × b        (a개씩 b봉지 — "2씩 3묶음")
//   div:  a ÷ b        (사탕 a개를 b봉지에 똑같이 → 한 봉지에 몇 개)
//   ten:  a + ? = 10   (10 만들기, 10의 보수)
//
// 난이도(diff)
//   1: 한 자리          — 사탕 그림으로 세기 / 숫자로 풀기
//   2: 두 자리 · 한 자리 — 27+5, 43−8, 23×4, 84÷4
//   3: 두 자리 · 두 자리 — 38+47, 72−35, 23×14, 96÷32
//   4: 세 자리 · 세 자리 — 345+678, 702−358, 345×678, 864÷432
// 2단계부터는 숫자로 풀고, 틀리면 세로셈·자리값 풀이를 보여 준다.

export const MODES = {
  add: { sign: '+', label: '덧셈' },
  sub: { sign: '−', label: '뺄셈' },
  mul: { sign: '×', label: '곱셈' },
  div: { sign: '÷', label: '나눗셈' },
  ten: { sign: '+', label: '10 만들기' },
};

export const LEVELS = {
  picture: { label: '그림으로 세기' },
  number:  { label: '숫자로 풀기' },
};

export const DIFFS = {
  1: { label: '한 자리' },
  2: { label: '두 자리 · 한 자리' },
  3: { label: '두 자리 · 두 자리' },
  4: { label: '세 자리 · 세 자리' },
};

const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// 1단계(한 자리): 그림 레벨은 사탕을 셀 수 있는 크기로
const SMALL = {
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
  ten: {
    picture: () => [rnd(1, 9), 10],
    number:  () => [rnd(1, 9), 10],
  },
};

// 2~4단계: 자릿수로 범위를 정한다 [최소, 최대]
const DIGITS = { 1: [2, 9], 2: [10, 99], 3: [100, 999] };
const SIZES = { 2: [2, 1], 3: [2, 2], 4: [3, 3] };   // [a 자릿수, b 자릿수]
const pickDigits = (n) => rnd(...DIGITS[n]);

const BIG = {
  add: (da, db) => [pickDigits(da), pickDigits(db)],
  sub: (da, db) => {
    // a > b, 받아내림이 자주 나오게 그대로 무작위
    for (;;) {
      const a = pickDigits(da), b = pickDigits(db);
      if (a > b) return [a, b];
    }
  },
  mul: (da, db) => [pickDigits(da), pickDigits(db)],
  div: (da, db) => {
    // a ÷ b 가 나누어떨어지고 몫이 2 이상, a 는 da 자리, b 는 db 자리
    const [alo, ahi] = DIGITS[da];
    for (;;) {
      const b = pickDigits(db);
      const qlo = Math.max(2, Math.ceil(alo / b)), qhi = Math.floor(ahi / b);
      if (qlo <= qhi) { const q = rnd(qlo, qhi); return [b * q, b]; }
    }
  },
};

// 2~4단계 그림 레벨(사탕 포장 놀이): 낱개·막대(10)·상자(100)가 계산대에 들어가는 크기로,
// 받아올림·받아내림이 자주 나오게 고른다.
export function pictureSupported(mode, diff) {
  if (diff === 1) return true;
  if (mode === 'add' || mode === 'sub') return true;
  return diff === 2 && (mode === 'mul' || mode === 'div');
}
const often = (p) => Math.random() < p;
const BIG_PIC = {
  add: {
    2: () => { for (;;) { const a = rnd(11, 89), b = rnd(2, 9); if (a + b <= 99 && (often(0.3) || a % 10 + b >= 10)) return [a, b]; } },
    3: () => { for (;;) { const a = rnd(11, 79), b = rnd(11, 79); if (a + b <= 99 && (often(0.3) || a % 10 + b % 10 >= 10)) return [a, b]; } },
    4: () => { for (;;) { const a = rnd(101, 499), b = rnd(101, 499); if (a + b <= 999 && (often(0.3) || a % 10 + b % 10 >= 10 || Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10 >= 10)) return [a, b]; } },
  },
  sub: {
    2: () => { for (;;) { const a = rnd(20, 99), b = rnd(2, 9); if (often(0.3) || a % 10 < b) return [a, b]; } },
    3: () => { for (;;) { const a = rnd(30, 99), b = rnd(11, a - 10); if (often(0.3) || a % 10 < b % 10) return [a, b]; } },
    4: () => { for (;;) { const a = rnd(200, 999), b = rnd(100, a - 100); if (often(0.3) || a % 10 < b % 10 || Math.floor(a / 10) % 10 < Math.floor(b / 10) % 10) return [a, b]; } },
  },
  // 23 × 4: 봉지마다 막대 ≤3, 낱개 ≤5 (봉지 4개가 계산대에 들어가게)
  mul: { 2: () => [rnd(1, 3) * 10 + rnd(1, 5), rnd(2, 4)] },
  // 72 ÷ 3: 봉지 2~3개, 몫은 두 자리
  div: { 2: () => { const b = rnd(2, 3); return [b * rnd(11, Math.floor(99 / b)), b]; } },
};

function solve(mode, a, b) {
  switch (mode) {
    case 'add': return a + b;
    case 'sub': return a - b;
    case 'mul': return a * b;
    case 'div': return a / b;
    case 'ten': return b - a;
  }
}

// ── 오답 보기: 아이들이 자주 하는 실수 ─────────────────────
const digits = (n) => String(n).split('').reverse().map(Number);
const fromDigits = (ds) => Number(ds.slice().reverse().join('')) || 0;

// 받아올림을 잊은 덧셈 (자리마다 더하고 10 넘는 건 버림)
function noCarryAdd(a, b) {
  const da = digits(a), db = digits(b), out = [];
  for (let i = 0; i < Math.max(da.length, db.length); i++) out.push(((da[i] || 0) + (db[i] || 0)) % 10);
  return fromDigits(out);
}
// 받아내림 대신 자리마다 큰 수에서 작은 수를 뺌
function noBorrowSub(a, b) {
  const da = digits(a), db = digits(b), out = [];
  for (let i = 0; i < da.length; i++) out.push(Math.abs(da[i] - (db[i] || 0)));
  return fromDigits(out);
}

function mistakes(mode, a, b, answer, diff) {
  if (diff === 1) {
    return {
      add: [],
      sub: [a + b],                    // 빼야 하는데 더해 버림
      mul: [answer - a, answer + a],   // 한 봉지 덜/더 셈
      div: [b],                        // 봉지 수와 헷갈림
      ten: [10 + a, a],                // 10에 더함 / 있던 개수
    }[mode];
  }
  switch (mode) {
    case 'add': return [noCarryAdd(a, b), answer + 10, answer - 10];
    case 'sub': return [noBorrowSub(a, b), answer + 10, answer - 10];
    case 'mul': {
      const out = [answer + a, answer - a];
      if (b >= 10) out.push(a * (b % 10) + a * Math.floor(b / 10));  // 십의 자리 곱을 자리 올리지 않음
      return out;
    }
    case 'div': return [answer + 1, answer - 1];
  }
  return [];
}

function makeChoices(mode, a, b, answer, diff) {
  const ok = (n) => Number.isInteger(n) && n >= 0 && n !== answer && (mode === 'ten' || n >= 1);
  const common = mistakes(mode, a, b, answer, diff).filter(ok);
  const steps = answer >= 100 ? [1, 10, 100, 2, 20] : answer >= 20 ? [1, 10, 2] : [1, 2];
  const near = shuffle(steps.flatMap((d) => [answer - d, answer + d]).filter(ok));
  const picks = [];
  if (common.length && Math.random() < 0.75) picks.push(common[rnd(0, common.length - 1)]);
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

// ── 화면 문구 ──────────────────────────────────────────
export function orderText(p) {
  if (p.diff > 1 && p.level === 'picture') {
    switch (p.mode) {
      case 'add': return `사탕 ${p.a}개랑 ${p.b}개를 한 쟁반에 모아 주세요!`;
      case 'sub': return `사탕 ${p.a}개 중에 ${p.b}개 주세요!`;
      case 'mul': return `사탕 ${p.a}개씩 ${p.b}봉지 주세요!`;
      case 'div': return `사탕 ${p.a}개를 ${p.b}봉지에 똑같이 나눠 주세요!`;
    }
  }
  if (p.diff > 1) return '큰 주문이에요! 계산해 주세요!';
  if (p.level === 'number') return '계산해 주세요!';
  switch (p.mode) {
    case 'add': return `딸기 사탕 ${p.a}개, 포도 사탕 ${p.b}개 주세요!`;
    case 'sub': return `사탕 ${p.a}개 중에 ${p.b}개는 지금 먹을래요!`;
    case 'mul': return `${p.a}개씩 ${p.b}봉지 주세요!`;
    case 'div': return `사탕 ${p.a}개를 ${p.b}봉지에 똑같이 나눠 주세요!`;
    case 'ten': return `사탕 10개를 꽉 채워 주세요! 지금 ${p.a}개 있어요.`;
  }
}

export function questionText(p) {
  const big = p.diff > 1 && p.level !== 'picture';   // 숫자로만 푸는 큰 수
  switch (p.mode) {
    case 'add': return big ? '모두 얼마일까?' : '모두 몇 개일까?';
    case 'sub': return big ? '남은 수는 얼마일까?' : '남은 사탕은 몇 개일까?';
    case 'mul': return big ? '모두 얼마일까?' : '모두 몇 개일까?';
    case 'div': return big ? '몫은 얼마일까?' : '한 봉지에 몇 개일까?';
    case 'ten': return p.level === 'picture' ? '몇 개를 더 넣었을까?' : '10이 되려면 몇이 필요할까?';
  }
}

// 식을 정답 자리 앞/뒤로 나눔: left + [? 또는 정답] + right
function exprParts(mode, a, b) {
  if (mode === 'ten') return [`${a} + `, ` = ${b}`];
  return [`${a} ${MODES[mode].sign} ${b} = `, ''];
}

// count 개의 서로 다른 문제
export function makeProblemSet(mode, level, count = 5, diff = 1) {
  if (mode === 'ten') diff = 1;   // 10 만들기는 한 가지 난이도
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < count && guard++ < 300) {
    const pic = level === 'picture' && pictureSupported(mode, diff);
    const [a, b] = diff === 1 ? SMALL[mode][level]() : pic ? BIG_PIC[mode][diff]() : BIG[mode](...SIZES[diff]);
    const key = `${a},${b}`;
    if (seen.has(key) && guard < 200) continue;
    seen.add(key);
    const answer = solve(mode, a, b);
    const [left, right] = exprParts(mode, a, b);
    out.push({
      mode, level: pic || diff === 1 ? level : 'number', diff, a, b, answer, left, right,
      choices: makeChoices(mode, a, b, answer, diff),
    });
  }
  return out;
}
