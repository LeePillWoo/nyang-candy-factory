// 오늘의 미션 — 하루에 게임마다 하나(지금 4개). 날짜로 고르기 때문에 그날은 늘 같은 미션.
//   게임은 일이 생길 때 track('kitchen.smart') 처럼 알려 주기만 하면 된다.
//   미션 하나 +10코인, 모두 하면 +20코인과 도장 하나.
import { load, save, addCoins, today } from './save.js';

const KEY = 'nyang.missions';
export const REWARD = 10;
export const BONUS = 20;

const CATALOG = {
  candy: [
    { id: 'candy.correct', icon: '🍬', text: '사탕 공장에서 정답 5번', goal: 5 },
    { id: 'candy.first', icon: '🍬', text: '사탕 공장에서 한 번에 맞히기 3번', goal: 3 },
    { id: 'candy.finish', icon: '🍬', text: '사탕 공장 한 판 끝내기', goal: 1 },
  ],
  penguin: [
    { id: 'penguin.fish', icon: '🐧', text: '펭귄으로 물고기 8마리 먹기', goal: 8 },
    { id: 'penguin.star', icon: '🐧', text: '정답 깃발 4번 지나가기', goal: 4 },
    { id: 'penguin.finish', icon: '🐧', text: '남극 기지까지 가기', goal: 1 },
  ],
  kitchen: [
    { id: 'kitchen.serve', icon: '🥟', text: '냥냥 주방에서 5접시 배달', goal: 5 },
    { id: 'kitchen.smart', icon: '🥟', text: '척척 🎯 2번 받기', goal: 2 },
    { id: 'kitchen.pic', icon: '🥟', text: '그림 주문 2번 배달', goal: 2 },
    { id: 'kitchen.change', icon: '🥟', text: '거스름돈 2번 맞히기', goal: 2 },
    { id: 'kitchen.party', icon: '🥟', text: '단체 손님 대접하기', goal: 1 },
  ],
  gugudan: [
    { id: 'gugudan.pond', icon: '🐸', text: '징검다리 연못 하나 건너기', goal: 1 },
    { id: 'gugudan.nosplash', icon: '🐸', text: '퐁당 없이 연못 건너기', goal: 1 },
    { id: 'gugudan.mole', icon: '🔨', text: '두더지 6마리 잡기', goal: 6 },
    { id: 'gugudan.first', icon: '✖️', text: '구구단 한 번에 맞히기 8번', goal: 8 },
  ],
};
const ALL = Object.values(CATALOG).flat();
const def = (id) => ALL.find((m) => m.id === id);

function hash(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

// 저장된 상태 (날짜가 바뀌었으면 새 미션)
function state() {
  const date = today();
  let st = load(KEY, null);
  const h = hash(date);
  const pick = (g, i) => { const c = CATALOG[g]; return { id: c[(h >>> (i * 5)) % c.length].id, progress: 0 }; };
  if (!st || st.date !== date) {
    st = { date, list: Object.keys(CATALOG).map(pick), bonus: false, stamps: st ? st.stamps || 0 : 0 };
    save(KEY, st);
  } else {
    // 게임이 새로 생긴 날: 이미 정해진 오늘 미션에 새 게임 몫을 보탠다
    const have = new Set(st.list.map((x) => x.id.split('.')[0]));
    const add = Object.keys(CATALOG).map((g, i) => (have.has(g) ? null : pick(g, i))).filter(Boolean);
    if (add.length) { st.list.push(...add); save(KEY, st); }
  }
  return st;
}

// 화면에 보여 줄 오늘의 미션
export function todayMissions() {
  const st = state();
  const list = st.list.map((x) => {
    const d = def(x.id) || { icon: '⭐', text: x.id, goal: 1 };
    return { ...d, progress: Math.min(x.progress, d.goal), done: x.progress >= d.goal };
  });
  return { date: st.date, list, allDone: list.every((m) => m.done), bonus: st.bonus, stamps: st.stamps || 0 };
}

// 일이 생겼을 때. 새로 끝난 미션이 있으면 코인을 주고 알림을 띄운다.
// 반환: 받은 코인 (0 이면 아무 일 없음)
export function track(event, n = 1) {
  const st = state();
  let gained = 0;
  for (const x of st.list) {
    if (x.id !== event) continue;
    const d = def(x.id);
    if (!d || x.progress >= d.goal) continue;
    x.progress = Math.min(d.goal, x.progress + n);
    if (x.progress >= d.goal) {
      gained += REWARD;
      toast(`🎯 오늘의 미션 완료! ${d.text}  +${REWARD}코인`);
    }
  }
  if (!st.bonus && st.list.every((x) => { const d = def(x.id); return d && x.progress >= d.goal; })) {
    st.bonus = true;
    st.stamps = (st.stamps || 0) + 1;
    gained += BONUS;
    setTimeout(() => toast(`🏅 오늘의 미션 모두 성공! 도장 쾅!  +${BONUS}코인`), 900);
  }
  save(KEY, st);
  if (gained) addCoins(gained);
  return gained;
}

// 화면 위쪽에 잠깐 뜨는 알림 (모든 페이지 공용)
export function toast(text) {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2800);
  setTimeout(() => el.remove(), 3400);
}
