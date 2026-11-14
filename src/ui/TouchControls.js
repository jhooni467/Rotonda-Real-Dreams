import { THEME } from '../config/theme.js';

const STICK_RADIUS = 90;
const DEADZONE = 0.15;

/**
 * Controles táctiles virtuales para Android/móvil: stick flotante a la izquierda
 * y botones a la derecha. Traducen los toques a ACCIONES de Input, así el resto
 * del juego no necesita saber si se juega con teclado o con pantalla táctil.
 *
 *   • Stick: se activa al tocar en la mitad izquierda inferior; el origen es el
 *     punto donde pones el dedo ("stick flotante", más cómodo que uno fijo).
 *   • Botón principal → acción "interact".   • II → "pause".   • + / − → zoom.
 *
 * Se muestran solos tras el primer toque (ajuste 'auto'), o siempre/nunca
 * según settings.touchControls ('on' | 'off').
 */
export class TouchControls {
  constructor(game) {
    this.game = game;
    this.owners = new Map(); // id de puntero → { kind: 'stick' | 'button', action?, origin? }
    this.stick = { active: false, ox: 0, oy: 0, x: 0, y: 0 };
    const { width: W, height: H } = game.renderer;
    this.W = W;
    this.H = H;
    this.buttons = [
      { action: 'interact', label: 'Acción', x: W - 130, y: H - 140, r: 62 },
      { action: 'pause', label: 'II', x: W - 56, y: 56, r: 30 },
      { action: 'zoomIn', label: '+', x: W - 56, y: 126, r: 26 },
      { action: 'zoomOut', label: '−', x: W - 56, y: 190, r: 26 },
    ];
  }

  get visible() {
    const mode = this.game.settings.touchControls;
    if (mode === 'off') return false;
    return mode === 'on' || this.game.input.usedTouch;
  }

  _inStickZone(x, y) {
    return x < this.W * 0.45 && y > this.H * 0.35;
  }

  _buttonAt(x, y) {
    return this.buttons.find((b) => Math.hypot(x - b.x, y - b.y) <= b.r + 12) ?? null;
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
        let dx = (ptr.x - this.stick.ox) / STICK_RADIUS;
        let dy = (ptr.y - this.stick.oy) / STICK_RADIUS;
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

  render(ctx, enabled = true) {
    if (!enabled || !this.visible) return;
    ctx.save();
    ctx.globalAlpha = 0.55;

    // Stick: base y pomo
    const bx = this.stick.active ? this.stick.ox : 170;
    const by = this.stick.active ? this.stick.oy : this.H - 160;
    ctx.strokeStyle = THEME.colors.border;
    ctx.fillStyle = THEME.colors.panel;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bx, by, STICK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (this.stick.active) {
      const dx = this.stick.x - bx;
      const dy = this.stick.y - by;
      const len = Math.min(STICK_RADIUS, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);
      ctx.fillStyle = THEME.colors.accent;
      ctx.beginPath();
      ctx.arc(bx + Math.cos(ang) * len, by + Math.sin(ang) * len, 38, 0, Math.PI * 2);
      ctx.fill();
    }

    // Botones
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of this.buttons) {
      ctx.fillStyle = THEME.colors.panel;
      ctx.strokeStyle = THEME.colors.accent;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = THEME.colors.text;
      ctx.font = `bold ${b.r > 40 ? 24 : 26}px ${THEME.fonts.ui}`;
      ctx.fillText(b.label, b.x, b.y + 1);
    }
    ctx.restore();
  }
}
