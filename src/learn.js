// 배움 기록 — 정답률, 자주 틀린 문제, '다시 도전'(틀린 문제를 간격을 두고 다시 내기)
//   한 문제를 다 풀면 record(p, 처음에 바로 맞혔는지) 를 한 번 부른다.
//   틀린 문제는 다음 판에 다시 나오고, 맞히면 점점 뜸하게(1 → 2 → 3판 뒤) 나오다가 3번 맞히면 '익힘'.
import { load, save } from './save.js';

const KEY = 'nyang.learn';
const MODES = ['add', 'sub', 'mul', 'div', 'ten'];
const RECENT = 30;          // 정답률은 최근 30문제로
const MAX_ITEMS = 200;

function data() {
  const d = load(KEY, null) || {};
  d.session = d.session || 0;
  d.stats = d.stats || {};
  d.items = d.items || {};
  return d;
}

const keyOf = (p) => `${p.mode}|${p.diff || 1}|${p.level || 'number'}|${p.a}|${p.b}`;

// 판을 시작할 때마다 (어느 게임이든) 한 번
export function beginSession() {
  const d = data();
  d.session += 1;
  save(KEY, d);
  return d.session;
}

// 반환: { reviewed: 다시 도전 문제를 맞혔는지 }
export function record(p, ok) {
  if (!p || !MODES.includes(p.mode)) return { reviewed: false };
  const d = data();
  const st = (d.stats[p.mode] = d.stats[p.mode] || []);
  st.push(ok ? 1 : 0);
  if (st.length > RECENT) st.splice(0, st.length - RECENT);

  const k = keyOf(p);
  let it = d.items[k];
  let reviewed = false;
  if (!ok) {
    if (!it) {
      it = d.items[k] = { mode: p.mode, diff: p.diff || 1, level: p.level || 'number', a: p.a, b: p.b, answer: p.answer, left: p.left, right: p.right, miss: 0, hit: 0 };
    }
    it.miss += 1;
    it.box = 1;
    it.due = d.session + 1;
    it.mastered = false;
    it.last = Date.now();
  } else if (it && !it.mastered) {
    it.hit += 1;
    it.box = (it.box || 1) + 1;
    it.due = d.session + it.box;
    it.last = Date.now();
    if (it.box > 3) it.mastered = true;
    reviewed = true;
  }

  // 너무 많아지면 다 익힌 것 · 오래된 것부터 정리
  const keys = Object.keys(d.items);
  if (keys.length > MAX_ITEMS) {
    keys.sort((x, y) => {
      const a = d.items[x], b = d.items[y];
      if (a.mastered !== b.mastered) return a.mastered ? -1 : 1;
      return (a.last || 0) - (b.last || 0);
    });
    for (const kk of keys.slice(0, keys.length - MAX_ITEMS)) delete d.items[kk];
  }
  save(KEY, d);
  return { reviewed };
}

// 다시 낼 때가 된 틀린 문제 중 조건에 맞는 것
export function dueReviews({ mode, diff, level = null, maxAnswer = Infinity, exclude = [] }, max = 1) {
  const d = data();
  return Object.values(d.items)
    .filter((it) => !it.mastered && it.due <= d.session && it.mode === mode && it.diff === diff
      && (!level || it.level === level) && it.answer <= maxAnswer && !exclude.includes(it.answer))
    .sort((x, y) => x.due - y.due || y.miss - x.miss)
    .slice(0, max);
}

// 최근 정답률
export function accuracy(mode, n = RECENT) {
  const st = (data().stats[mode] || []).slice(-n);
  return { count: st.length, rate: st.length ? st.reduce((s, v) => s + v, 0) / st.length : null };
}

// 부모님 화면용 요약
export function report() {
  const d = data();
  const items = Object.values(d.items);
  return {
    modes: MODES.map((m) => ({ mode: m, ...accuracy(m) })),
    missed: items.filter((it) => it.miss > 0).sort((x, y) => y.miss - x.miss || (y.last || 0) - (x.last || 0)).slice(0, 10),
    waiting: items.filter((it) => !it.mastered).length,
    mastered: items.filter((it) => it.mastered).length,
    sessions: d.session,
  };
}

// 배움 기록만 지우기 (코인 · 아이템은 그대로)
export function resetLearning() {
  save(KEY, { session: data().session, stats: {}, items: {} });
}

// 한 판(5문제 이상) 결과로 다음 단계 권하기: 'up' | 'down' | null
export function suggestStep(oks, diff, maxDiff = 4) {
  if (oks.length < 5) return null;
  const rate = oks.filter(Boolean).length / oks.length;
  if (rate >= 0.8 && diff < maxDiff) return 'up';
  if (rate <= 0.4 && diff > 1) return 'down';
  return null;
}
