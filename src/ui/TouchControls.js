import { CONFIG } from '../config/config.js';
import { THEME } from '../config/theme.js';

const DEADZONE = 0.15;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** ¿El círculo (cx, cy, r) toca el rectángulo? */
function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return Math.hypot(cx - nx, cy - ny) < r;
}

/**
 * Controles táctiles virtuales para Android/móvil: stick flotante a la izquierda
 * y botones a la derecha. Traducen los toques a ACCIONES de Input, así el resto
 * del juego no necesita saber si se juega con teclado o con pantalla táctil.
 *
 *   • Stick: se activa al tocar en la mitad izquierda inferior; el origen es el
 *     punto donde pones el dedo ("stick flotante", más cómodo que uno fijo).
 *   • Botón principal → "interact".   • II → "pause".   • + / − → zoom.
 *
 * Adaptación a la pantalla (ver layout()):
 *   - Los tamaños se definen en píxeles CSS reales (CONFIG.ui.touch) y se convierten a unidades
 *     lógicas: un botón mide lo mismo para el dedo en un móvil pequeño que en una tablet.
 *   - Todo se coloca dentro del ÁREA SEGURA (notch, esquinas redondeadas, barra de gestos).
 *   - Para no tapar lo importante, los controles se vuelven casi transparentes cuando coinciden
 *     con el jugador (ver render()), y se ocultan durante los diálogos.
 *
 * Se muestran solos tras el primer toque (ajuste 'auto'), o siempre/nunca
 * según settings.touchControls ('on' | 'off').
 */
export class TouchControls {
  constructor(game) {
    this.game = game;
    this.owners = new Map(); // id de puntero → { kind: 'stick' | 'button', action? }
    this.stick = { active: false, ox: 0, oy: 0, x: 0, y: 0 };
    this.layout();
  }

  /** Recalcula tamaños y posiciones. Se llama al crearse y cada vez que cambia la pantalla. */
  layout() {
    const { renderer } = this.game;
    const { width: W, height: H, safe } = renderer;
    const cfg = CONFIG.ui.touch;
    const m = CONFIG.ui.safeMargin;
    const size = (css, min, max) => clamp(renderer.cssToLogical(css), min, max);

    this.stickRadius = size(cfg.stickRadiusCss, 80, 130);
    this.knobRadius = this.stickRadius * 0.42;
    this.hitSlop = renderer.cssToLogical(cfg.hitSlopCss);
    const big = size(cfg.mainButtonRadiusCss, 46, 88);
    const small = size(cfg.smallButtonRadiusCss, 26, 48);

    const left = safe.left + m;
    const right = W - safe.right - m;
    const top = safe.top + m;
    const bottom = H - safe.bottom - m;
    const gap = Math.round(small * 0.3);

    this.stickHome = { x: left + this.stickRadius, y: bottom - this.stickRadius };
    this.stickZone = { x0: safe.left, x1: W * 0.45, y0: H * 0.35 };
    this.fontBig = clamp(big * 0.38, 18, 32);
    this.fontSmall = clamp(small * 0.9, 24, 38);

    const pauseY = top + small;
    this.buttons = [
      { action: 'interact', label: 'Acción', x: right - big, y: bottom - big, r: big, font: this.fontBig },
      { action: 'pause', label: 'II', x: right - small, y: pauseY, r: small, font: this.fontSmall },
      { action: 'zoomIn', label: '+', x: right - small, y: pauseY + 2 * small + gap, r: small, font: this.fontSmall },
      { action: 'zoomOut', label: '−', x: right - small, y: pauseY + 4 * small + 2 * gap, r: small, font: this.fontSmall },
    ];
  }

  get visible() {
    const mode = this.game.settings.touchControls;
    if (mode === 'off') return false;
    return mode === 'on' || this.game.input.usedTouch;
  }

  _inStickZone(x, y) {
    const z = this.stickZone;
    return x >= z.x0 && x < z.x1 && y > z.y0;
  }

  _buttonAt(x, y) {
    return this.buttons.find((b) => Math.hypot(x - b.x, y - b.y) <= b.r + this.hitSlop) ?? null;
  }

  /** @param enabled false suspende los controles (p. ej. durante un diálogo). */
  update(input, enabled = true) {
    if (!enabled || !this.visible) {
      this._releaseAll(input);
      return;
    }

    for (const tap of input.getTaps()) {
      if (tap.type === 'mouse') continue; // el ratón no usa controles virtuales
      const button = this._buttonAt(tap.x, tap.y);
      if (button) {
        this.owners.set(tap.id, { kind: 'button', action: button.action });
        input.setVirtual(button.action, true);
        tap.consumed = true;
      } else if (!this.stick.active && this._inStickZone(tap.x, tap.y)) {
        this.owners.set(tap.id, { kind: 'stick' });
        this.stick = { active: true, ox: tap.x, oy: tap.y, x: tap.x, y: tap.y };
        tap.consumed = true;
      }
    }

    for (const [id, owner] of [...this.owners]) {
      const ptr = input.pointers.get(id);
      if (owner.kind === 'button') {
        if (!ptr) {
          input.setVirtual(owner.action, false);
          this.owners.delete(id);
        }
      } else if (!ptr) {
        this.stick.active = false;
        input.setVirtualAxis(0, 0);
        this.owners.delete(id);
      } else {
        this.stick.x = ptr.x;
        this.stick.y = ptr.y;
        let dx = (ptr.x - this.stick.ox) / this.stickRadius;
        let dy = (ptr.y - this.stick.oy) / this.stickRadius;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        input.setVirtualAxis(len < DEADZONE ? 0 : dx, len < DEADZONE ? 0 : dy);
      }
    }
  }

  _releaseAll(input) {
    if (!this.owners.size && !this.stick.active) return;
    for (const owner of this.owners.values()) if (owner.kind === 'button') input.setVirtual(owner.action, false);
    this.owners.clear();
    this.stick.active = false;
    input.setVirtualAxis(0, 0);
  }

  /**
   * @param enabled false oculta los controles.
   * @param avoid   rectángulos de pantalla (lógicos) que no deben quedar tapados, p. ej. el jugador.
   *                Un control que se solapa con alguno se vuelve casi transparente.
   */
  render(ctx, enabled = true, avoid = []) {
    if (!enabled || !this.visible) return;
    const alphaFor = (cx, cy, r) => (avoid.some((rect) => circleHitsRect(cx, cy, r, rect)) ? 0.16 : 0.55);

    ctx.save();

    // Stick: base y pomo
    const active = this.stick.active;
    const bx = active ? this.stick.ox : this.stickHome.x;
    const by = active ? this.stick.oy : this.stickHome.y;
    ctx.globalAlpha = active ? 0.55 : alphaFor(bx, by, this.stickRadius);
    ctx.strokeStyle = THEME.colors.border;
    ctx.fillStyle = THEME.colors.panel;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bx, by, this.stickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (active) {
      const dx = this.stick.x - bx;
      const dy = this.stick.y - by;
      const len = Math.min(this.stickRadius, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);
      ctx.fillStyle = THEME.colors.accent;
      ctx.beginPath();
      ctx.arc(bx + Math.cos(ang) * len, by + Math.sin(ang) * len, this.knobRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Botones
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of this.buttons) {
      ctx.globalAlpha = alphaFor(b.x, b.y, b.r);
      ctx.fillStyle = THEME.colors.panel;
      ctx.strokeStyle = THEME.colors.accent;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = THEME.colors.text;
      ctx.font = `bold ${Math.round(b.font)}px ${THEME.fonts.ui}`;
      ctx.fillText(b.label, b.x, b.y + 1);
    }
    ctx.restore();
  }
}
