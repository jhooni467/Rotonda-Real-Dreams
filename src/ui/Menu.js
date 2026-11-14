import { THEME } from '../config/theme.js';
import { roundRectPath } from './draw.js';

/**
 * Menú vertical dibujado en canvas, con teclado, ratón y táctil.
 *
 *   const menu = new Menu({ audio, x: 640, y: 360, width: 420, items: [
 *     { label: 'Nueva partida', onSelect: () => ... },
 *     { label: 'Continuar', enabled: false },
 *   ]});
 *   menu.update(input);  menu.render(ctx);
 *
 * `x` es el CENTRO horizontal; `y` el borde superior de la primera opción.
 * Estilo PROVISIONAL (ver config/theme.js).
 */
export class Menu {
  constructor({ items, x, y, width = 420, itemHeight = 58, gap = 14, fontSize = 26, audio = null }) {
    this.items = items;
    this.x = x;
    this.y = y;
    this.width = width;
    this.itemHeight = itemHeight;
    this.gap = gap;
    this.fontSize = fontSize;
    this.audio = audio;
    this.index = Math.max(0, items.findIndex((it) => it.enabled !== false));
  }

  rect(i) {
    return {
      x: this.x - this.width / 2,
      y: this.y + i * (this.itemHeight + this.gap),
      w: this.width,
      h: this.itemHeight,
    };
  }

  _hit(px, py) {
    for (let i = 0; i < this.items.length; i++) {
      const r = this.rect(i);
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  _move(dir) {
    const n = this.items.length;
    for (let step = 1; step <= n; step++) {
      const i = (this.index + dir * step + n * step) % n;
      if (this.items[i].enabled !== false) {
        this.index = i;
        this.audio?.blip(440, 0.03, 0.08);
        return;
      }
    }
  }

  _select(i) {
    const item = this.items[i];
    if (!item || item.enabled === false) return;
    this.audio?.blip(660, 0.06, 0.12);
    item.onSelect?.();
  }

  update(input) {
    if (input.wasPressed('up')) this._move(-1);
    if (input.wasPressed('down')) this._move(1);

    const p = input.pointerPos;
    if (p.type === 'mouse') {
      const i = this._hit(p.x, p.y);
      if (i >= 0 && i !== this.index && this.items[i].enabled !== false) this.index = i;
    }

    for (const tap of input.getTaps()) {
      const i = this._hit(tap.x, tap.y);
      if (i < 0) continue;
      tap.consumed = true;
      if (this.items[i].enabled !== false) {
        this.index = i;
        this._select(i);
        return;
      }
    }

    if (input.wasPressed('confirm')) this._select(this.index);
  }

  render(ctx) {
    ctx.font = `${this.fontSize}px ${THEME.fonts.ui}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    this.items.forEach((item, i) => {
      const r = this.rect(i);
      const enabled = item.enabled !== false;
      const selected = i === this.index && enabled;

      roundRectPath(ctx, r.x, r.y, r.w, r.h, 16);
      ctx.fillStyle = selected ? THEME.colors.panelHi : THEME.colors.panel;
      ctx.fill();
      ctx.lineWidth = selected ? 3 : 2;
      ctx.strokeStyle = selected ? THEME.colors.accent : THEME.colors.border;
      ctx.stroke();

      ctx.fillStyle = enabled ? (selected ? THEME.colors.text : THEME.colors.textDim) : THEME.colors.disabled;
      ctx.fillText(item.label, this.x, r.y + r.h / 2 + 1);
    });
  }
}
