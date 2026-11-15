import { THEME } from '../config/theme.js';
import { roundRectPath } from './draw.js';

/** `x` y `width` pueden ser un número o una función (se evalúa en cada uso → se adaptan al cambiar la pantalla). */
const val = (v) => (typeof v === 'function' ? v() : v);

/**
 * Menú vertical dibujado en canvas, con teclado, ratón y táctil.
 *
 *   const menu = new Menu({ audio, x: () => game.renderer.width / 2, y: 360, width: 420, items: [
 *     { label: 'Nueva partida', onSelect: () => ... },
 *     { label: 'Continuar', enabled: false },
 *   ]});
 *   menu.update(input);  menu.render(ctx);
 *
 * `x` es el CENTRO horizontal; `y` el borde superior de la primera opción.
 * Para que el menú siga centrado cuando cambia la proporción de la pantalla, pasa `x` (y `width`)
 * como función. La zona táctil de cada opción llena también el hueco entre opciones, para que
 * sea más cómoda de tocar sin cambiar el aspecto.
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
    const w = val(this.width);
    return {
      x: val(this.x) - w / 2,
      y: this.y + i * (this.itemHeight + this.gap),
      w,
      h: this.itemHeight,
    };
  }

  _hit(px, py) {
    const pad = this.gap / 2;
    for (let i = 0; i < this.items.length; i++) {
      const r = this.rect(i);
      if (px >= r.x && px <= r.x + r.w && py >= r.y - pad && py <= r.y + r.h + pad) return i;
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = val(this.x);

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

      // Si el texto no cabe en la opción (pantallas estrechas), se reduce la fuente en vez de cortarlo.
      let size = this.fontSize;
      ctx.font = `${size}px ${THEME.fonts.ui}`;
      const maxW = r.w - 32;
      const textW = ctx.measureText(item.label).width;
      if (textW > maxW) {
        size = Math.max(12, Math.floor((size * maxW) / textW));
        ctx.font = `${size}px ${THEME.fonts.ui}`;
      }

      ctx.fillStyle = enabled ? (selected ? THEME.colors.text : THEME.colors.textDim) : THEME.colors.disabled;
      ctx.fillText(item.label, cx, r.y + r.h / 2 + 1);
    });
  }
}
