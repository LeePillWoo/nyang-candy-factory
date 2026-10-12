// 냥냥 구구단 — 문제(구구단 한 줄), 헷갈리는 오답, 구구단 읽기("삼사 십이"), 익힘판 기록.
//   익힘판: 문제(단 × 곱하는 수)마다 '한 번에 맞힌 연속 횟수'를 기억한다. 3번 연속이면 ⭐ 익힘.
import { load, save } from '../save.js';

export const DANS = [2, 3, 4, 5, 6, 7, 8, 9];
export const STAR_STREAK = 3;   // 한 번에 3번 연속 맞히면 익힘 ⭐

const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickN = (pool, n) => shuffle([...pool]).slice(0, n);

// 고른 단들의 모든 문제 (a = 단, b = 곱하는 수 1~9)
export function factsOf(dans) {
  return dans.flatMap((a) => Array.from({ length: 9 }, (_, i) => ({ a, b: i + 1 })));
}

// 배움 기록(learn.js)용 문제 모양 — 다시 도전 · 정답률 · 부모님 보기에 쓰인다
export function problemOf(a, b) {
  return { mode: 'mul', diff: 1, level: 'gugudan', a, b, answer: a * b, left: `${a} × ${b} = `, right: '' };
}

// 아이들이 실제로 많이 하는 실수에서 오답을 고른다 (중복 · 0 이하 · 정답 제외)
//   옆 단계(6×7 → 48, 36) · 옆 단(7×7=49, 5×7=35) · 셈 실수(±1, ±2) · 자리 바꿈(42 → 24) · 십의 자리(56 → 46, 66)
export function confusions(a, b) {
  const v = a * b;
  const out = [];
  const add = (x) => { if (x > 0 && x !== v && x <= 99 && !out.includes(x)) out.push(x); };
  add(a * (b + 1)); add(a * (b - 1));
  add((a + 1) * b); add((a - 1) * b);
  add(v + 1); add(v - 1); add(v + 2); add(v - 2);
  if (v >= 10) {
    const r = Number(String(v).split('').reverse().join(''));
    if (r !== v && r >= 1) add(r);
    add(v + 10); add(v - 10);
  }
  return out;
}

// 징검다리 오답 2개.
//   level 1: 앞 돌과 뒷돌 사이의 수(배수가 아닌 수) — 수직선에서 '덜 뛰거나 더 뛴' 자리라 눈으로도 보인다
//   level 2·3: 헷갈리는 수(±1, ±2, 한 칸 더 뛰기, 옆 단)
export function stoneChoices(n, value, prev, level) {
  const out = [];
  const add = (x) => { if (x >= 0 && x !== value && x !== prev && !out.includes(x)) out.push(x); };
  if (level === 1) {
    const lo = Math.min(prev, value), hi = Math.max(prev, value) + n;
    const pool = [];
    for (let x = lo + 1; x < hi; x++) if (x % n !== 0) pool.push(x);
    pickN(pool, 2).forEach(add);
  } else {
    const k = Math.round(value / n);
    const step = value > prev ? n : -n;
    const pool = [value + 1, value - 1, value + 2, value - 2, value + step, (n + 1) * k, (n - 1) * k];
    pickN(pool.filter((x) => x > 0), 6).forEach(add);
  }
  for (let d = 1; out.length < 2; d++) { add(value + d); add(value - d); }   // 모자라면 가까운 수로
  return out.slice(0, 2);
}

// ── 구구단 읽기 ──────────────────────────────────────
const DIGIT = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
// 한자어 수 (1~99): 12 → 십이, 40 → 사십
export function readNum(n) {
  if (n === 0) return '영';
  const t = Math.floor(n / 10), u = n % 10;
  return (t ? (t === 1 ? '' : DIGIT[t]) + '십' : '') + DIGIT[u];
}
// 받침이 있으면 '은', 없으면 '는' (일 · 삼 · 육 · 칠 · 팔 · 십 → 은)
export function topic(n) {
  const w = readNum(n);
  const last = w.charCodeAt(w.length - 1) - 0xac00;
  return last >= 0 && last % 28 ? '은' : '는';
}
// 구구단 노래처럼: "삼사 십이", 한 자리 답은 "이삼은 육"
export function chant(a, b) {
  const p = a * b;
  const head = DIGIT[a] + DIGIT[b];
  return p < 10 ? `${head}${topic(b)} ${readNum(p)}` : `${head} ${readNum(p)}`;
}
// 문제 읽기: "6 곱하기 7은?"
export function askWords(a, b) {
  return `${a} 곱하기 ${b}${topic(b)}?`;
}

// ── 익힘판 ──────────────────────────────────────────
const KEY = 'nyang.gugudan';
function data() {
  const d = load(KEY, null) || {};
  d.f = d.f || {};          // "7x8": [연속, 맞힌 수, 틀린 수, 마지막 시각]
  d.best = d.best || {};    // 게임별 최고 기록
  return d;
}
const fk = (a, b) => `${a}x${b}`;

// 한 문제를 끝냈을 때 (처음에 바로 맞혔는지). 반환: 이번에 새로 ⭐ 이 되었는지
export function markFact(a, b, firstTry) {
  const d = data();
  const f = d.f[fk(a, b)] || [0, 0, 0, 0];
  const wasStar = f[0] >= STAR_STREAK;
  if (firstTry) { f[0] += 1; f[1] += 1; } else { f[0] = 0; f[2] += 1; }
  f[3] = Date.now();
  d.f[fk(a, b)] = f;
  save(KEY, d);
  return !wasStar && f[0] >= STAR_STREAK;
}

// 'new'(안 해 봄) · 'try'(익히는 중) · 'oops'(최근에 틀림) · 'star'(익힘)
export function factState(a, b, d = data()) {
  const f = d.f[fk(a, b)];
  if (!f) return 'new';
  if (f[0] >= STAR_STREAK) return 'star';
  if (f[0] === 0 && f[2] > 0) return 'oops';
  return 'try';
}

// 단마다 익힌 문제 수 (0~9)
export function danStars(a, d = data()) {
  let n = 0;
  for (let b = 1; b <= 9; b++) if (factState(a, b, d) === 'star') n++;
  return n;
}

// 익힘판 전체 (부모님 보기 · 로비)
export function masteryTable() {
  const d = data();
  return DANS.map((a) => ({ a, stars: danStars(a, d), row: Array.from({ length: 9 }, (_, i) => ({ b: i + 1, state: factState(a, i + 1, d) })) }));
}

// 자주 틀린 구구단 (틀린 수가 많은 순)
export function trickyFacts(max = 6) {
  const d = data();
  return Object.entries(d.f)
    .filter(([, f]) => f[2] > 0 && f[0] < STAR_STREAK)
    .sort((x, y) => y[1][2] - x[1][2] || y[1][3] - x[1][3])
    .slice(0, max)
    .map(([k, f]) => { const [a, b] = k.split('x').map(Number); return { a, b, miss: f[2] }; });
}

export function getBest(key) { return data().best[key] ?? null; }
export function setBest(key, value) { const d = data(); d.best[key] = value; save(KEY, d); }

// 문제 순서 섞기 도우미 (두더지): 고른 단에서 n 문제, 바로 앞과 같은 문제는 피한다
export function pickFacts(dans, n, first = []) {
  const all = shuffle(factsOf(dans));
  const out = [...first];
  for (const f of all) {
    if (out.length >= n) break;
    if (!out.some((q) => q.a === f.a && q.b === f.b)) out.push(f);
  }
  while (out.length < n) out.push({ a: dans[rnd(0, dans.length - 1)], b: rnd(1, 9) });   // 단이 하나면 9문제뿐이라 넉넉
  return out;
}
