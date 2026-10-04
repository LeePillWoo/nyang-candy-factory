// 저장 — 세 게임과 첫 화면이 같이 쓰는 기기(브라우저) 저장소.
// 지금은 이 기기에만 저장된다. 나중에 클라우드 저장을 붙일 때는 이 파일만 바꾸면 된다.

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 불가 (비밀 모드 등) */ }
}

// ── 코인 지갑 (게임 · 미션 · 상점 공용) ───────────────────────
// 늘 저장소에서 다시 읽어서 더한다 — 미션 보상처럼 여러 곳에서 바꿔도 값이 어긋나지 않게
export function getCoins() {
  return Math.max(0, Math.floor(Number(load('nyang.coins', 0)) || 0));
}

export function addCoins(n) {
  const c = getCoins() + n;
  save('nyang.coins', c);
  return c;
}

export function spendCoins(n) {
  const c = getCoins();
  if (c < n) return false;
  save('nyang.coins', c - n);
  return true;
}

// 오늘 날짜 (기기 시계 기준, 오늘의 미션용)
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
