import { Scene } from '../../engine/Scene.js';
import { THEME } from '../../config/theme.js';
import { Menu } from '../Menu.js';
import { drawText, roundRectPath, wrapText } from '../draw.js';

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
    const { width: W, height: H } = game.renderer;
    this.message = message;
    this.onNo = onNo;

    const answer = (cb) => () => {
      game.scenes.pop();
      cb?.();
    };

    this.menu = new Menu({
      audio: game.audio,
      x: W / 2,
      y: H / 2 + 20,
      width: 380,
      itemHeight: 54,
      gap: 12,
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
    const { width: W, height: H } = this.game.renderer;
    ctx.fillStyle = THEME.colors.overlay;
    ctx.fillRect(0, 0, W, H);

    const pw = 700;
    const ph = 330;
    roundRectPath(ctx, W / 2 - pw / 2, H / 2 - ph / 2 - 40, pw, ph, 24);
    ctx.fillStyle = 'rgba(30, 25, 40, 0.97)';
    ctx.fill();
    ctx.strokeStyle = THEME.colors.border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = `24px ${THEME.fonts.ui}`;
    wrapText(ctx, this.message, pw - 80).forEach((line, i) => {
      drawText(ctx, line, W / 2, H / 2 - ph / 2 + 10 + i * 34, {
        color: THEME.colors.text,
        align: 'center',
        baseline: 'top',
      });
    });
    this.menu.render(ctx);
  }
}
