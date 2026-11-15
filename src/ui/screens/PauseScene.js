import { Scene } from '../../engine/Scene.js';
import { THEME } from '../../config/theme.js';
import { Menu } from '../Menu.js';
import { drawText } from '../draw.js';

/**
 * Menú de pausa (se apila sobre LevelScene, que queda congelada pero visible).
 * Parámetros: { levelScene }
 */
export class PauseScene extends Scene {
  get transparent() {
    return true;
  }

  enter({ levelScene }) {
    const { game } = this;
    this.levelScene = levelScene;
    this.message = '';
    this.messageTime = 0;

    this.menu = new Menu({
      audio: game.audio,
      x: () => game.renderer.width / 2,
      y: 270,
      width: 440,
      itemHeight: 64,
      gap: 16,
      items: [
        { label: 'Continuar', onSelect: () => game.scenes.pop() },
        { label: 'Guardar partida', onSelect: () => this._save() },
        { label: 'Salir al menú principal', onSelect: () => this._exit() },
      ],
    });
  }

  _save() {
    const { game, levelScene } = this;
    const snapshot = levelScene.snapshot();
    const ok = game.saves.write(levelScene.slot, snapshot);
    if (ok) levelScene.data = snapshot;
    this.message = !ok
      ? 'No se pudo guardar.'
      : game.saves.persistent
        ? 'Partida guardada.'
        : 'Guardado solo en memoria: el navegador bloquea el almacenamiento.';
    this.messageTime = 3;
  }

  _exit() {
    const { game } = this;
    game.scenes.push('confirm', {
      message: 'Se perderá el progreso desde la última vez que guardaste. ¿Salir al menú principal?',
      yesLabel: 'Salir',
      noLabel: 'Volver',
      onYes: () => game.scenes.replace('mainMenu'),
    });
  }

  update(dt) {
    const { input, scenes } = this.game;
    this.messageTime = Math.max(0, this.messageTime - dt);
    this.menu.update(input);
    if (scenes.current === this && (input.wasPressed('pause') || input.wasPressed('cancel'))) scenes.pop();
  }

  render(ctx) {
    const { width: W, height: H } = this.game.renderer;
    ctx.fillStyle = THEME.colors.overlay;
    ctx.fillRect(0, 0, W, H);

    drawText(ctx, 'Pausa', W / 2, 180, {
      font: `bold 60px ${THEME.fonts.title}`,
      color: THEME.colors.text,
      align: 'center',
      baseline: 'middle',
    });
    this.menu.render(ctx);

    if (this.messageTime > 0) {
      drawText(ctx, this.message, W / 2, 530, {
        font: `22px ${THEME.fonts.ui}`,
        color: THEME.colors.accent,
        align: 'center',
        baseline: 'middle',
      });
    }
  }
}
