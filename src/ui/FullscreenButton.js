import { CONFIG } from '../config/config.js';
import { THEME } from '../config/theme.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Botón discreto de pantalla completa (esquina superior izquierda, dentro del área segura).
 *
 * Existe porque en Android el bloqueo de orientación solo suele permitirse en pantalla completa:
 * sin una forma de entrar en ella, el bloqueo sería inalcanzable desde una pestaña normal.
 * En PC no se muestra (basta con la tecla F). Tampoco aparece si el navegador no ofrece pantalla
 * completa (p. ej. iPhone). Lo dibuja y lo atiende Game, por encima de cualquier escena.
 */
export class FullscreenButton {
  constructor(game) {
    this.game = game;
  }

  get visible() {
    const { orientation, input } = this.game;
    return orientation.fullscreenSupported && (input.usedTouch || orientation.coarsePointer);
  }

  _geometry() {
    const { renderer } = this.game;
    const r = clamp(renderer.cssToLogical(22), 22, 44);
    const m = CONFIG.ui.safeMargin;
    return { r, x: renderer.safe.left + m + r, y: renderer.safe.top + m + r };
  }

  update(input) {
    if (!this.visible) return;
    const { x, y, r } = this._geometry();
    const slop = this.game.renderer.cssToLogical(8);
    for (const tap of input.getTaps()) {
      if (Math.hypot(tap.x - x, tap.y - y) <= r + slop) {
        tap.consumed = true; // el toque no llega al menú ni al juego
        this.game.orientation.toggleFullscreen();
        return;
      }
    }
  }

  render(ctx) {
    if (!this.visible) return;
    const { x, y, r } = this._geometry();
    const inFs = this.game.orientation.isFullscreen;

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = THEME.colors.panel;
    ctx.strokeStyle = THEME.colors.border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Icono: cuatro esquinas que apuntan hacia fuera (entrar) o hacia dentro (salir).
    ctx.strokeStyle = THEME.colors.text;
    ctx.lineWidth = Math.max(3, r * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const reach = r * 0.46;
    const arm = r * 0.3;
    const c = inFs ? reach * 0.45 : reach;
    const a = inFs ? -arm : arm;
    ctx.beginPath();
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        ctx.moveTo(x + sx * (c - a), y + sy * c);
        ctx.lineTo(x + sx * c, y + sy * c);
        ctx.lineTo(x + sx * c, y + sy * (c - a));
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}
