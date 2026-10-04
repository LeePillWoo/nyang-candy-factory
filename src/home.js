// 첫 화면 — 게임 고르기 · 오늘의 미션 · 냥냥 상점 · 부모님 보기
import { sfx, unlockAudio } from './audio.js';
import { SPRITES, loadSprites, drawSpriteFrame, headOf } from './sprites.js';
import { getCoins } from './save.js';
import { todayMissions, REWARD, BONUS } from './missions.js';
import { ITEMS, itemOf, shopState, buy, setEquipped, isEquipped, drawHat, drawItemIcon, drawWall, drawDeco } from './shop.js';
import { report, resetLearning } from './learn.js';

const $ = (s) => document.querySelector(s);
const MODE_NAME = { add: '덧셈', sub: '뺄셈', mul: '곱셈', div: '나눗셈', ten: '10 만들기' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });

// ── 코인 ────────────────────────────────────────────────
function renderCoins(bump = false) {
  $('#coin-count').textContent = getCoins();
  if (bump) { const c = $('#coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
}

// ── 오늘의 미션 ──────────────────────────────────────────
function renderMissions() {
  const m = todayMissions();
  $('#mission-list').innerHTML = m.list.map((x) => `
    <li class="${x.done ? 'done' : ''}">
      <span class="ic">${x.icon}</span><span>${esc(x.text)}</span>
      <span class="num">${x.done ? '✅' : `${x.progress}/${x.goal}`}</span>
      <span class="bar"><i style="width:${Math.round(x.progress / x.goal * 100)}%"></i></span>
    </li>`).join('');
  $('#stamps').textContent = `🏅 도장 ${m.stamps}개`;
  $('#mission-foot').innerHTML = m.allDone
    ? '오늘의 미션 모두 성공! 🎉 <b>내일 또 새 미션이 와요</b>'
    : `하나에 <b>+${REWARD}</b>코인 · 셋 다 하면 <b>+${BONUS}</b>코인과 도장 하나!`;
}

// ── 카드 속 캐릭터 머리 위에 상점 모자 ─────────────────────────
function drawCardHats() {
  const hat = shopState().hat;
  document.querySelectorAll('.char').forEach((el) => {
    const cv = el.querySelector('.hat-layer');
    const sprite = el.firstElementChild;
    const w = cv.clientWidth, h = cv.clientHeight;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!hat) return;
    // 캔버스는 캐릭터 칸보다 왼쪽 40px, 위 70px 크다 (.hat-layer)
    const footX = 40 + sprite.offsetWidth / 2, footY = 70 + sprite.offsetHeight;
    const head = headOf(el.dataset.sheet, el.dataset.anim, Number(el.dataset.frame), Number(el.dataset.scale));
    if (head) drawHat(ctx, hat, footX + head.x, footY + head.y, head.size);
  });
}

// ── 창 열고 닫기 ──────────────────────────────────────────
function openModal(id) {
  $(id).hidden = false;
  document.body.classList.add('modal-open');
}
function closeModals() {
  document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; });
  document.body.classList.remove('modal-open');
  renderCoins();
  renderMissions();
  drawCardHats();
}
document.querySelectorAll('.modal').forEach((m) => {
  m.addEventListener('click', (e) => { if (e.target === m) closeModals(); });
  m.querySelector('.close').addEventListener('click', () => { sfx.tap(); closeModals(); });
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

// ── 냥냥 상점 ──────────────────────────────────────────────
let tab = 'hat';
let sel = null;
let note = null;   // 산 직후 보여 줄 말 (뺄셈)

function renderShop() {
  const st = shopState();
  const coins = getCoins();
  $('#shop-coins').textContent = coins;
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  const box = $('#shop-items');
  box.innerHTML = '';
  for (const it of ITEMS.filter((x) => (tab === 'hat' ? x.kind === 'hat' : x.kind !== 'hat'))) {
    const owned = st.owned.includes(it.id), on = isEquipped(it.id);
    const card = document.createElement('button');
    card.className = `item${sel === it.id ? ' sel' : ''}${on ? ' on' : ''}`;
    const cv = document.createElement('canvas');
    cv.width = 192; cv.height = 144;
    const ctx = cv.getContext('2d');
    ctx.scale(2, 2);
    drawItemIcon(ctx, it.id, 96, 72);
    const name = document.createElement('span');
    name.textContent = it.name;
    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = on ? '쓰는 중 ✨' : owned ? '가지고 있어요' : `🪙 ${it.price}`;
    card.append(cv, name, price);
    card.addEventListener('click', () => { sfx.tap(); sel = it.id; note = null; renderShop(); });
    box.appendChild(card);
  }

  const msg = $('#shop-msg'), act = $('#shop-action');
  const it = sel && itemOf(sel);
  if (!it) {
    msg.textContent = '갖고 싶은 걸 눌러 봐요!';
    act.hidden = true;
  } else if (st.owned.includes(it.id)) {
    const on = isEquipped(it.id);
    msg.innerHTML = note || `${esc(it.name)} — 가지고 있어요`;
    act.hidden = false;
    act.disabled = false;
    act.textContent = on ? (it.kind === 'deco' ? '치우기' : '벗기') : (it.kind === 'deco' ? '놓기' : it.kind === 'wall' ? '바르기' : '쓰기');
  } else if (coins >= it.price) {
    msg.innerHTML = `${esc(it.name)} — 🪙 <b>${it.price}</b>`;
    act.hidden = false;
    act.disabled = false;
    act.textContent = `🪙 ${it.price}으로 사기`;
  } else {
    // 모자란 만큼 (뺄셈으로)
    msg.innerHTML = `${it.price} − ${coins} = <b>${it.price - coins}</b> · 코인 ${it.price - coins}개 더 모으면 살 수 있어요!`;
    act.hidden = false;
    act.disabled = true;
    act.textContent = '코인이 조금 모자라요';
  }
  drawPreview();
}

function drawPreview() {
  const cv = $('#preview');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const st = shopState();
  const it = sel && itemOf(sel);
  if (tab === 'hat') {
    // 고른 모자를 냥이와 펭귄에게 미리 씌워 보기
    const hat = it && it.kind === 'hat' ? it.id : st.hat;
    ctx.fillStyle = '#fff8ef'; ctx.fillRect(0, 0, W, H);
    for (const [sheet, anim, frame, x, scale] of [['cat', 'groom', 0, W * 0.3, 1.25], ['penguin', 'row2', 2, W * 0.72, 1.3]]) {
      const sp = SPRITES[sheet];
      if (!sp.image) continue;
      ctx.save();
      ctx.translate(x, H - 12);
      drawSpriteFrame(ctx, sp, anim, frame, scale);
      const head = headOf(sheet, anim, frame, scale);
      if (hat && head) drawHat(ctx, hat, head.x, head.y, head.size);
      ctx.restore();
    }
  } else {
    // 주방 벽 미리보기: 고른 벽지/장식을 지금 꾸민 것 위에 얹어서
    const wall = it && it.kind === 'wall' ? it.id : st.wall;
    const deco = new Set(st.deco);
    if (it && it.kind === 'deco') deco.add(it.id);
    drawWall(ctx, wall, 0, 0, W, H - 60, 0);
    ctx.fillStyle = '#d99a62'; ctx.fillRect(0, H - 60, W, 60);
    ctx.lineWidth = 5; ctx.strokeStyle = '#4a3434';
    ctx.beginPath(); ctx.moveTo(0, H - 60); ctx.lineTo(W, H - 60); ctx.stroke();
    if (deco.has('deco.lights')) drawDeco(ctx, 'deco.lights', 30, 26, (W - 60) / 360, 0);
    if (deco.has('deco.frame')) drawDeco(ctx, 'deco.frame', W * 0.5, H * 0.45, 1, 0);
    if (deco.has('deco.plant')) drawDeco(ctx, 'deco.plant', W - 70, H - 60, 1.1, 0);
  }
}

$('#open-shop').addEventListener('click', () => { sfx.tap(); sel = null; note = null; openModal('#shop'); renderShop(); });
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  sfx.tap(); tab = b.dataset.tab; sel = null; note = null; renderShop();
}));
$('#shop-action').addEventListener('click', () => {
  const it = sel && itemOf(sel);
  if (!it) return;
  if (!shopState().owned.includes(it.id)) {
    const r = buy(it.id);
    if (!r.ok) { sfx.oops(); renderShop(); return; }
    sfx.coin();
    setTimeout(() => sfx.correct(), 150);
    note = `🪙 ${r.before} − ${it.price} = <b>${r.after}</b> · ${esc(it.name)} 샀어요! 🎉`;
    renderCoins(true);
  } else {
    sfx.tap();
    note = null;
    setEquipped(it.id, !isEquipped(it.id));
  }
  renderShop();
  drawCardHats();
});

// ── 부모님 보기 ───────────────────────────────────────────
function renderParent() {
  const r = report();
  $('#acc').innerHTML = r.modes.map((m) => {
    const pct = m.rate == null ? 0 : Math.round(m.rate * 100);
    return `<div class="row"><span>${MODE_NAME[m.mode]}</span><span class="bar"><i style="width:${pct}%"></i></span><span>${m.rate == null ? '아직 없어요' : `${pct}% · ${m.count}문제`}</span></div>`;
  }).join('');
  $('#missed').innerHTML = r.missed.length
    ? r.missed.map((it) => `<li>${esc(it.left || `${it.a} ? ${it.b} = `)}<b>${it.answer}</b>${esc(it.right || '')} <small>${it.miss}번 틀림 · ${it.mastered ? '다시 맞혀서 익힘 ✅' : '다시 도전 중'}</small></li>`).join('')
    : '<li>아직 틀린 문제가 없어요 👍</li>';
  $('#review-note').textContent = `다시 도전을 기다리는 문제 ${r.waiting}개 · 다시 맞혀서 익힌 문제 ${r.mastered}개 · 지금까지 ${r.sessions}판 했어요. 틀린 문제는 다음 판부터 가끔 다시 나와요.`;
  const m = todayMissions();
  $('#mission-note').textContent = `오늘 ${m.list.filter((x) => x.done).length}/3 완료 · 지금까지 모은 도장 ${m.stamps}개`;
}
$('#open-parent').addEventListener('click', () => { sfx.tap(); openModal('#parent'); renderParent(); });
$('#reset-learn').addEventListener('click', () => {
  if (!window.confirm('정답률과 틀린 문제 기록을 지울까요? (코인과 산 물건은 그대로예요)')) return;
  resetLearning();
  renderParent();
});

// ── 시작 ────────────────────────────────────────────────
function refresh() { renderCoins(); renderMissions(); drawCardHats(); }
refresh();
window.addEventListener('resize', drawCardHats);
window.addEventListener('pageshow', refresh);   // 게임에서 '뒤로'로 돌아왔을 때 (코인 · 미션이 바뀜)
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
loadSprites(['cat', 'penguin']).then(() => { if (!$('#shop').hidden) drawPreview(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCardHats);
