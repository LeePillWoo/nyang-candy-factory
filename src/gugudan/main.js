// 냥냥 구구단 — 단(2~9단)을 고르고 🐸 징검다리 점프 · 🔨 두더지 잡기로 구구단을 익힌다.
//   로비: 단 고르기(한 단 또는 모두), 단계(쉬움 · 보통 · 어려움), 게임 고르기, 📒 익힘판
//   징검다리 = 뛰어 세기(순서대로), 두더지 = 바로 떠올리기(무작위, 한 판 10문제)
//   문제마다 배움 기록(다시 도전 · 정답률)과 익힘판(한 번에 3번 연속이면 ⭐)에 남긴다.
import { sfx, speak, unlockAudio, isMuted, setMuted } from '../audio.js';
import { load, save, getCoins, addCoins as addToWallet } from '../save.js';
import { beginSession, record, dueReviews } from '../learn.js';
import { track } from '../missions.js';
import { equippedHat } from '../shop.js';
import { visibleArea, safeInsets, onViewportChange } from '../viewport.js';
import { loadSprites } from '../sprites.js';
import { DANS, masteryTable, markFact, problemOf, chant, pickFacts, getBest, setBest } from './facts.js';
import { StonesGame } from './stones.js';
import { MolesGame, QUESTIONS } from './moles.js';
import * as D from './draw.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LV_TEXT = {
  stones: { 1: '쉬움: 수직선 도움 · 식이 보여요', 2: '보통: 혼자 뛰어 세기', 3: '어려움: 거꾸로 뛰어 세기' },
  moles: { 1: '쉬움: 두더지가 천천히', 2: '보통: 조금 빨리', 3: '어려움: 빨리! 구멍 9개' },
};
const fmtTime = (s) => (s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`);

class App {
  constructor() {
    this.stage = $('#stage');
    this.canvas = $('#scene');
    this.ctx = this.canvas.getContext('2d');
    this.W = 1280; this.H = 800; this.portrait = false;
    this.time = 0;
    this.lastSpeak = -9;
    this.coins = getCoins();
    this.hat = equippedHat();
    // 고른 단: 한 단만, 또는 '모두'(2~9단 전부)
    const saved = load('gugudan.dans', [2]);
    const ok = Array.isArray(saved) ? saved.filter((d) => DANS.includes(d)) : [];
    this.oneDan = ok.length && ok.length < DANS.length ? ok[0] : 2;   // 한 단 고르기에서 마지막으로 고른 단
    this.dans = ok.length === DANS.length ? [...DANS] : [this.oneDan];
    this.level = [1, 2, 3].includes(load('gugudan.level', 1)) ? load('gugudan.level', 1) : 1;
    this.state = 'lobby';
    this.game = null;
    this.runId = 0;
    this.fit();
    onViewportChange(() => this.fit());
    this.bindUI();
    this.renderCoins();
    this.showLobby();

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      this.time += dt;
      if (this.game) this.game.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ── 화면 크기 (가로 1280×800 · 세로 720×H) ─────────────
  fit() {
    const { l, r, t, b } = safeInsets();
    const area = visibleArea();
    const vw = Math.max(1, area.w - l - r), vh = Math.max(1, area.h - t - b);
    const portrait = vh > vw;
    const height = portrait ? clamp(Math.round(720 * vh / vw), 1100, 1640) : 800;
    if (portrait !== this.portrait || height !== this.H || !this.laidOut) {
      this.laidOut = true;
      this.portrait = portrait;
      this.W = portrait ? 720 : 1280;
      this.H = height;
      this.stage.classList.toggle('portrait', portrait);
      this.stage.style.width = `${this.W}px`;
      this.stage.style.height = `${this.H}px`;
      if (this.game) this.game.relayout();
    }
    const s = Math.min(vw / this.W, vh / this.H);
    this.scale = s;
    this.stage.style.transform = `translate(${area.x + l + (vw - this.W * s) / 2}px, ${area.y + t + (vh - this.H * s) / 2}px) scale(${s})`;
    const k = Math.min(2.5, Math.max(1, s * (window.devicePixelRatio || 1)));
    const cw = Math.round(this.W * k), ch = Math.round(this.H * k);
    if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
    this.stage.classList.add('ready');
  }

  // ── 입력 ────────────────────────────────────────────
  bindUI() {
    document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.state !== 'play' || !this.game) return;
      const r = this.canvas.getBoundingClientRect();
      this.game.tap((e.clientX - r.left) / r.width * this.W, (e.clientY - r.top) / r.height * this.H);
    });
    // 단 고르기: 한 단만 (다른 단을 누르면 그 단으로 바뀜) · '모두'는 2~9단 전부, 한 번 더 누르면 하던 한 단으로
    const box = $('#lobby .dans');
    box.innerHTML = DANS.map((d) => `<button class="dan" data-dan="${d}" aria-pressed="false"><span>${d}단</span><span class="ds"></span></button>`).join('')
      + '<button class="dan all" data-dan="all" aria-pressed="false">모두 (2~9단)</button>';
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.dan');
      if (!b) return;
      sfx.tap();
      if (b.dataset.dan === 'all') {
        this.dans = this.dans.length === DANS.length ? [this.oneDan] : [...DANS];
      } else {
        this.oneDan = Number(b.dataset.dan);
        this.dans = [this.oneDan];
        speak(`${this.oneDan}단!`);
      }
      save('gugudan.dans', this.dans);
      this.renderLobby();
    });
    document.querySelectorAll('.lv').forEach((b) => b.addEventListener('click', () => {
      sfx.tap();
      this.level = Number(b.dataset.level);
      save('gugudan.level', this.level);
      this.renderLobby();
    }));
    document.querySelectorAll('.game').forEach((b) => b.addEventListener('click', () => {
      sfx.tap();
      if (!this.dans.length) { speak('먼저 몇 단을 할지 골라요!'); return; }
      this.start(b.dataset.game);
    }));
    // 익힘판
    $('#open-book').addEventListener('click', () => { sfx.tap(); this.renderBook(); $('#book').hidden = false; });
    $('#book .close').addEventListener('click', () => { sfx.tap(); $('#book').hidden = true; });
    $('#book .table').addEventListener('click', (e) => {
      const c = e.target.closest('.c');
      if (!c) return;
      sfx.tap();
      speak(chant(Number(c.dataset.a), Number(c.dataset.b)));
    });
    // HUD
    $('#btn-home').addEventListener('click', () => { sfx.tap(); this.showLobby(); });
    const snd = $('#btn-sound');
    const renderSnd = () => { snd.textContent = isMuted() ? '🔇' : '🔊'; };
    snd.addEventListener('click', () => { setMuted(!isMuted()); renderSnd(); sfx.tap(); });
    renderSnd();
    // 결과
    $('#result .again').addEventListener('click', () => { sfx.tap(); this.start(this.kind, { danIndex: this.danIndex || 0 }); });
    $('#result .other').addEventListener('click', () => { sfx.tap(); this.start(this.kind === 'stones' ? 'moles' : 'stones'); });
    $('#result .home').addEventListener('click', () => { sfx.tap(); this.showLobby(); });
    $('#result .next-pond').addEventListener('click', () => { sfx.tap(); if (this.nextAction) this.nextAction(); });
    // 상점에서 돌아오면 코인 · 모자 새로
    window.addEventListener('pageshow', () => { this.coins = getCoins(); this.hat = equippedHat(); this.renderCoins(); if (this.state === 'lobby') this.renderLobby(); });
  }

  // ── 로비 ────────────────────────────────────────────
  showLobby() {
    this.state = 'lobby';
    this.game = null;
    this.runId += 1;
    if (window.speechSynthesis) speechSynthesis.cancel();
    $('#lobby').hidden = false;
    $('#result').hidden = true;
    $('#book').hidden = true;
    $('#banner').hidden = true;
    $('#btn-home').hidden = true;
    this.renderLobby();
  }

  renderLobby() {
    const table = masteryTable();
    document.querySelectorAll('#lobby .dan').forEach((b) => {
      if (b.dataset.dan === 'all') { b.setAttribute('aria-pressed', String(this.dans.length === DANS.length)); return; }
      const d = Number(b.dataset.dan);
      b.setAttribute('aria-pressed', String(this.dans.includes(d)));
      const row = table.find((r) => r.a === d);
      const ds = b.querySelector('.ds');
      ds.innerHTML = row.stars >= 9 ? '<span class="medal">🏅</span>' : row.row.map((c) => `<i class="${c.state === 'star' ? 'on' : ''}"></i>`).join('');
    });
    document.querySelectorAll('.lv').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.level) === this.level)));
    $('.game.stones .g-lv').textContent = LV_TEXT.stones[this.level];
    $('.game.moles .g-lv').textContent = LV_TEXT.moles[this.level];
    const many = this.dans.length > 1;
    $('.game.stones .g-desc').textContent = many ? `${this.dans[0]}단부터 ${this.dans[this.dans.length - 1]}단까지 연못을 차례로` : `${this.dans[0] || 3}, ${(this.dans[0] || 3) * 2}, ${(this.dans[0] || 3) * 3}… 뛰어 세기`;
    $('.game.moles .g-desc').textContent = `${QUESTIONS}문제 · 정답 두더지를 뿅!`;
    document.querySelectorAll('.game').forEach((b) => { b.disabled = !this.dans.length; });
  }

  renderBook() {
    const rows = masteryTable();
    $('#book .table').innerHTML = rows.map((r) => `<div class="rh">${r.a}단<small>${r.stars >= 9 ? '🏅' : `⭐ ${r.stars}`}</small></div>`
      + r.row.map((c) => `<button class="c s-${c.state}" data-a="${r.a}" data-b="${c.b}" aria-label="${r.a} 곱하기 ${c.b}"><small>${r.a}×${c.b}</small>${r.a * c.b}</button>`).join('')).join('');
  }

  // ── 게임 시작 · 끝 ───────────────────────────────────
  start(kind, { danIndex = 0 } = {}) {
    if (!this.dans.length) return;
    this.kind = kind;
    this.state = 'play';
    this.runId += 1;
    this.earned = 0;
    this.newStars = 0;
    this.hat = equippedHat();
    beginSession();
    $('#lobby').hidden = true;
    $('#result').hidden = true;
    $('#book').hidden = true;
    $('#banner').hidden = true;
    $('#btn-home').hidden = false;
    if (kind === 'stones') {
      this.danIndex = clamp(danIndex, 0, this.dans.length - 1);
      this.game = new StonesGame(this, { n: this.dans[this.danIndex], level: this.level });
    } else {
      this.danIndex = 0;
      const dans = [...this.dans];
      // 다시 도전: 고른 단에서 틀렸던 문제를 먼저 (최대 2개)
      const due = dueReviews({ mode: 'mul', diff: 1, level: 'gugudan' }, 12)
        .filter((it) => dans.includes(it.a) && it.b >= 1 && it.b <= 9)
        .slice(0, 2)
        .map((it) => ({ a: it.a, b: it.b, review: true }));
      const qs = pickFacts(dans, QUESTIONS, due);
      this.game = new MolesGame(this, { dans, level: this.level, questions: qs });
    }
  }

  finishStones(r) {
    if (this.state !== 'play') return;
    this.state = 'over';
    this.addCoins(3 + (r.splashes === 0 ? 3 : 0));
    this.mission('gugudan.pond');
    if (r.splashes === 0) this.mission('gugudan.nosplash');
    const key = `stones.${r.n}.${r.level}`;
    const best = getBest(key);
    if (best == null || r.stars > best) setBest(key, r.stars);
    const next = this.dans[this.danIndex + 1];
    this.nextAction = next ? () => this.start('stones', { danIndex: this.danIndex + 1 }) : null;
    this.showResult({
      title: r.back ? `${r.n}단 거꾸로 건넜다!` : `${r.n}단 연못 건넜다!`,
      stars: r.stars,
      main: r.splashes ? `퐁당 ${r.splashes}번 · 한 번에 ${r.firstOk}/${r.total}` : '퐁당 없이 건넜어요! 🌟',
      seq: r.seq.join(' → '),
      missed: [],
      next: next ? `다음 연못: ${next}단 →` : null,
    });
  }

  finishMoles(r) {
    if (this.state !== 'play') return;
    this.state = 'over';
    if (r.firstOk === r.total) this.addCoins(3);
    const key = `moles.${r.level}`;
    const best = getBest(key);
    const isBest = r.firstOk === r.total && (best == null || r.secs < best);
    if (isBest) setBest(key, r.secs);
    this.nextAction = null;
    this.showResult({
      title: '두더지 다 잡았다!',
      stars: r.stars,
      main: `한 번에 맞힌 문제 ${r.firstOk}/${r.total}`,
      seq: `걸린 시간 ${fmtTime(r.secs)}${isBest ? ' · 🏆 최고 기록!' : best != null && r.firstOk === r.total ? ` · 최고 ${fmtTime(best)}` : ''}`,
      missed: r.missed,
    });
  }

  showResult(o) {
    const box = $('#result');
    box.querySelector('.r-title').textContent = o.title;
    box.querySelector('.stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < o.stars ? '' : 'off'}" style="animation-delay:${0.15 + i * 0.15}s">⭐</span>`).join('');
    box.querySelector('.r-main').textContent = o.main;
    box.querySelector('.r-seq').textContent = o.seq || '';
    box.querySelector('.missed').innerHTML = o.missed.length
      ? `<b>다시 볼 구구단</b> ${o.missed.map((m) => `<span>${m.a} × ${m.b} = ${m.a * m.b}</span>`).join('')}`
      : '';
    box.querySelector('.r-book').textContent = this.newStars ? `📒 익힘판에 ⭐ ${this.newStars}개 늘었어요!` : '';
    box.querySelector('.earned').innerHTML = `<span class="coin"></span> 코인 +${this.earned}`;
    const nb = box.querySelector('.next-pond');
    nb.hidden = !o.next;
    nb.textContent = o.next || '';
    box.querySelector('.other').textContent = this.kind === 'stones' ? '🔨 두더지로' : '🐸 징검다리로';
    box.hidden = false;
    $('#banner').hidden = true;
  }

  // ── 게임이 부르는 도우미 ─────────────────────────────
  recordFact(a, b, firstTry) {
    record(problemOf(a, b), firstTry);
    const star = markFact(a, b, firstTry);
    if (star) this.newStars += 1;
    return star;
  }

  mission(event, n = 1) {
    if (track(event, n)) { this.coins = getCoins(); this.renderCoins(); }
  }

  addCoins(n) {
    if (!n) return;
    this.coins = addToWallet(n);
    this.earned += n;
    this.renderCoins();
    const c = $('#coins');
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    sfx.coin();
  }

  renderCoins() { $('#coin-count').textContent = this.coins; }

  banner(text, sec) {
    const b = $('#banner');
    b.textContent = text;
    b.hidden = false;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    const run = this.runId;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { if (run === this.runId) b.hidden = true; }, sec * 1000);
  }

  // 다른 말과 겹치지 않게 (force 면 바로)
  say(text, force = false) {
    if (!force && this.time - this.lastSpeak < 2) return;
    this.lastSpeak = this.time;
    speak(text);
  }

  // ── 그리기 ──────────────────────────────────────────
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    if (this.game) { this.game.draw(ctx); return; }
    // 로비 뒤: 잔잔한 연못
    const t = this.time;
    D.drawWater(ctx, this.W, this.H, 0, t, t * 20, this.portrait);
    for (let i = 0; i < 14; i++) {
      const x = ((i * 211 + 90) % (this.W + 100)) - 50, y = 120 + ((i * 157) % (this.H - 160));
      D.drawLilyPad(ctx, x, y, 30 + (i % 3) * 8, i, i % 4 === 0);
    }
  }
}

const app = new App();
if (new URLSearchParams(location.search).has('debug')) window.__app = app;   // 테스트용

const fontReady = document.fonts && document.fonts.load ? document.fonts.load('40px Jua').catch(() => {}) : Promise.resolve();
Promise.all([fontReady, loadSprites(['cat', 'turtle'])]).finally(() => app.renderLobby());
