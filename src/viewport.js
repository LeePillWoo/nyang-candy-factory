// 화면(뷰포트) 크기 도우미 — 두 게임이 함께 쓴다.

// 노치·홈 바 영역 (style.css 의 --sat/--sar/--sab/--sal)
export function safeInsets() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
  return { l: v('--sal'), r: v('--sar'), t: v('--sat'), b: v('--sab') };
}

// 실제로 눈에 보이는 영역 (CSS px, 페이지 기준 좌표).
// 삼성 인터넷 등은 레이아웃 뷰포트를 보이는 화면보다 크게 알려 줄 때가 있어서
// 고정 요소(body)의 실제 크기·visualViewport·innerWidth 중 가장 작은 값을 쓴다.
export function visibleArea() {
  const de = document.documentElement;
  const br = document.body.getBoundingClientRect();
  const ws = [br.width, de.clientWidth, window.innerWidth].filter((v) => v > 0);
  const hs = [br.height, de.clientHeight, window.innerHeight].filter((v) => v > 0);
  let w = Math.min(...ws), h = Math.min(...hs), x = 0, y = 0;
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    w = Math.min(w, vv.width);
    h = Math.min(h, vv.height);
    x = vv.offsetLeft || 0;
    y = vv.offsetTop || 0;
  }
  return { w, h, x, y };
}

// 화면 크기가 바뀔 수 있는 모든 경우에 cb 를 부른다
export function onViewportChange(cb) {
  window.addEventListener('resize', cb);
  window.addEventListener('orientationchange', () => setTimeout(cb, 250));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', cb);
    window.visualViewport.addEventListener('scroll', cb);
  }
  // 일부 모바일 브라우저는 처음 크기를 늦게 알려 준다
  window.addEventListener('load', cb);
  window.addEventListener('pageshow', cb);
  setTimeout(cb, 300);
  setTimeout(cb, 1200);
}
