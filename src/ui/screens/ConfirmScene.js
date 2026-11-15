import { Scene } from '../../engine/Scene.js';
import { THEME } from '../../config/theme.js';
import { Menu } from '../Menu.js';
import { drawText, roundRectPath, wrapText } from '../draw.js';

// Geometría del panel (unidades lógicas, relativa al centro vertical de la pantalla).
const PANEL_H = 370;
const PANEL_TOP = -205; // desde el centro
const MENU_TOP = -10; // desde el centro

/**
 * Diálogo de confirmación (se apila sobre otra escena).
 * Parámetros: { message, yesLabel, noLabel, onYes, onNo }
 * La opción segura ("no") es la seleccionada por defecto.
 */
export class ConfirmScene extends Scene {
  get transparent() {
    return true;
  }

  enter({ message = '¿Seguro?', yesLabel = 'Sí', noLabel = 'No', onYes = null, onNo = null } = {}) {
    const { game } = this;
    this.message = message;
    this.onNo = onNo;

    const answer = (cb) => () => {
      game.scenes.pop();
      cb?.();
    };

    this.menu = new Menu({
      audio: game.audio,
      x: () => game.renderer.width / 2,
      y: game.renderer.height / 2 + MENU_TOP,
      width: 380,
      itemHeight: 64,
      gap: 14,
      fontSize: 24,
      items: [
        { label: noLabel, onSelect: answer(onNo) },
        { label: yesLabel, onSelect: answer(onYes) },
      ],
    });
  }

  update() {
    const { input, scenes } = this.game;
    this.menu.update(input);
    if (scenes.current === this && input.wasPressed('cancel')) {
      scenes.pop();
      this.onNo?.();
    }
  }

  render(ctx) {
    const { width: W, height: H, safeRect } = this.game.renderer;
    ctx.fillStyle = THEME.colors.overlay;
    ctx.fillRect(0, 0, W, H);

    const pw = Math.min(700, safeRect.w - 48);
    const top = H / 2 + PANEL_TOP;
    roundRectPath(ctx, W / 2 - pw / 2, top, pw, PANEL_H, 24);
    ctx.fillStyle = 'rgba(30, 25, 40, 0.97)';
    ctx.fill();
    ctx.strokeStyle = THEME.colors.border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = `24px ${THEME.fonts.ui}`;
    wrapText(ctx, this.message, pw - 80).forEach((line, i) => {
      drawText(ctx, line, W / 2, top + 40 + i * 34, {
        color: THEME.colors.text,
        align: 'center',
        baseline: 'top',
      });
    });
    this.menu.render(ctx);
  }
}
