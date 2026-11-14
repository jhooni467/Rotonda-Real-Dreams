import { Scene } from '../engine/Scene.js';
import { ASSET_MANIFEST } from '../config/assets.js';
import { THEME } from '../config/theme.js';
import { drawText } from '../ui/draw.js';

/** Escena de arranque: carga el manifiesto de recursos y pasa al menú principal. */
export class BootScene extends Scene {
  enter() {
    this.ready = false;
    this.leaving = false;
    this.elapsed = 0;
    this.progress = 0;
    this.game.assets
      .loadManifest(ASSET_MANIFEST, (done, total) => {
        this.progress = total ? done / total : 1;
      })
      .catch((err) => console.error('[BootScene]', err))
      .finally(() => {
        this.ready = true;
      });
  }

  update(dt) {
    this.elapsed += dt;
    // Pequeña pausa mínima para evitar un parpadeo cuando no hay nada que cargar.
    if (this.ready && !this.leaving && this.elapsed > 0.15) {
      this.leaving = true;
      this.game.scenes.replace('mainMenu');
    }
  }

  render(ctx) {
    const { width: W, height: H } = this.game.renderer;
    drawText(ctx, 'ROTONDA', W / 2, H / 2 - 10, {
      font: `bold 72px ${THEME.fonts.title}`,
      color: THEME.colors.text,
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, 'Cargando…', W / 2, H / 2 + 50, {
      font: `22px ${THEME.fonts.ui}`,
      color: THEME.colors.textDim,
      align: 'center',
      baseline: 'middle',
    });
  }
}
