// Actor: 화면 위의 캐릭터 하나. 스프라이트/코드드로잉 캐릭터를 같은 방식으로 다룬다.
// 게임 로직은 idle() / walk() / moveTo() / hop() / carry() 만 알면 된다.
import { CHARACTERS, OUTLINE } from './characters.js';
import { SPRITES, drawSpriteFrame } from './sprites.js';

export class Actor {
  constructor(charKey, x, y, opts = {}) {
    this.setCharacter(charKey);
    this.x = x;
    this.y = y;            // 발 위치(바닥선)
    this.facing = opts.facing || 'right';
    this.hopY = 0;
    this.squash = 1;
    this.speed = opts.speed || 260;
    this.visible = true;
    this.carried = null;   // (ctx) => void, 원점 = 들고 있는 위치
    this.bubble = null;    // { text, until }
    this.time = 0;
    this._move = null;
    this.idle();
  }

  setCharacter(key) {
    this.key = key;
    this.char = CHARACTERS[key];
    if (!this.char) throw new Error(`알 수 없는 캐릭터: ${key}`);
  }

  // ── 상태 ────────────────────────────────────────────
  setAnim(name) {
    const has = this.char.kind === 'shape' || this.char.anims[name];
    const next = has ? name : 'idle';
    if (next !== this.anim) { this.anim = next; this.animTime = 0; }
    return this;
  }
  idle() { return this.setAnim('idle'); }
  walk() { return this.setAnim('walk'); }

  // 잠깐 다른 애니를 보여주고 idle로 돌아간다
  play(name, seconds = 1.2) {
    this.setAnim(name);
    return wait(seconds).then(() => { if (this.anim === name) this.idle(); });
  }

  moveTo(x, speed = this.speed) {
    if (this._move) this._move.resolve();
    if (Math.abs(x - this.x) < 1) return Promise.resolve();
    this.facing = x < this.x ? 'left' : 'right';
    this.walk();
    return new Promise((resolve) => { this._move = { x, speed, resolve }; });
  }

  hop(height = 46, dur = 0.42) {
    return new Promise((resolve) => { this._hop = { t: 0, dur, height, resolve }; });
  }

  carry(drawFn) { this.carried = drawFn || null; return this; }

  say(text, seconds = 2) { this.bubble = { text, until: this.time + seconds }; return this; }

  // ── 루프 ────────────────────────────────────────────
  update(dt) {
    this.time += dt;
    this.animTime += dt;

    if (this._move) {
      const m = this._move;
      const d = m.x - this.x;
      const s = m.speed * dt;
      if (Math.abs(d) <= s) {
        this.x = m.x;
        this._move = null;
        this.idle();
        m.resolve();
      } else {
        this.x += Math.sign(d) * s;
      }
    }

    if (this._hop) {
      const h = this._hop;
      h.t += dt;
      const p = Math.min(1, h.t / h.dur);
      this.hopY = -Math.sin(p * Math.PI) * h.height;
      this.squash = p < 0.15 ? 1 - p * 0.8 : p > 0.9 ? 0.92 : 1.04;
      if (p >= 1) { this.hopY = 0; this.squash = 1; this._hop = null; h.resolve(); }
    }

    if (this.bubble && this.time > this.bubble.until) this.bubble = null;
  }

  draw(ctx) {
    if (!this.visible) return;
    const c = this.char;
    ctx.save();
    ctx.translate(this.x, this.y + this.hopY);
    ctx.scale(1 / Math.sqrt(this.squash), this.squash);

    if (c.kind === 'sprite') {
      const sheet = SPRITES[c.sprite];
      const a = c.anims[this.anim] || c.anims.idle;
      const meta = sheet.anims[a.anim];
      const fps = a.fps || meta.fps || 8;
      const seq = a.seq || null;
      const n = seq ? seq.length : meta.frames;
      const i = Math.floor(this.animTime * fps) % n;
      const frame = seq ? seq[i] : i;
      // 그림자
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(0, 0, 48, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();
      const flip = c.faces !== 'front' && this.facing !== c.faces;
      drawSpriteFrame(ctx, sheet, a.anim, frame, c.scale * (a.scale || 1), flip);
    } else {
      ctx.save();
      if (this.facing === 'right') ctx.scale(-1, 1); // 꼬리가 진행 방향 뒤로
      c.draw(ctx, { anim: this.anim, t: this.animTime });
      ctx.restore();
    }

    if (this.carried) {
      const dir = this.facing === 'left' ? -1 : 1;
      ctx.save();
      if (c.kind === 'sprite') ctx.translate(dir * 52, -c.height * 0.42);
      else ctx.translate(dir * 8, -26);
      this.carried(ctx);
      ctx.restore();
    }
    ctx.restore();

    if (this.bubble) drawBubble(ctx, this.x, this.y + this.hopY - c.height - 24, this.bubble.text);
  }
}

export function wait(seconds) {
  return new Promise((r) => setTimeout(r, seconds * 1000));
}

function drawBubble(ctx, x, y, text) {
  ctx.save();
  ctx.font = '700 30px Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const w = Math.max(64, ctx.measureText(text).width + 36);
  const h = 54;
  const bx = Math.max(10, Math.min((Actor.stageW || 1280) - 10 - w, x - w / 2));
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(bx, y - h, w, h, 22);
  ctx.moveTo(x - 10, y - 2);
  ctx.lineTo(x, y + 14);
  ctx.lineTo(x + 10, y - 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 8, y - 6, 16, 6);
  ctx.fillStyle = OUTLINE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, y - h / 2 + 2);
  ctx.restore();
}
