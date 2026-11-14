import { Scene } from '../../engine/Scene.js';
import { CONFIG } from '../../config/config.js';
import { THEME } from '../../config/theme.js';
import { Menu } from '../Menu.js';
import { drawText } from '../draw.js';

/**
 * Menú principal: Continuar · Nueva partida · Cargar partida.
 * El título es texto PROVISIONAL, no un logotipo definitivo.
 */
export class MainMenuScene extends Scene {
  enter() {
    const { game } = this;
    const latest = game.saves.latestSlot();
    const { width: W } = game.renderer;

    this.menu = new Menu({
      audio: game.audio,
      x: W / 2,
      y: 360,
      width: 440,
      items: [
        {
          label: 'Continuar',
          enabled: latest !== null,
          onSelect: () => {
            const { data } = game.saves.readSlot(latest);
            game.scenes.replace('level', { slot: latest, data });
          },
        },
        { label: 'Nueva partida', onSelect: () => game.scenes.replace('slots', { mode: 'new' }) },
        {
          label: 'Cargar partida',
          enabled: game.saves.hasAnySave(),
          onSelect: () => game.scenes.replace('slots', { mode: 'load' }),
        },
      ],
    });
  }

  update() {
    this.menu.update(this.game.input);
  }

  render(ctx) {
    const { width: W, height: H } = this.game.renderer;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b1626');
    g.addColorStop(1, '#0f0d16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawText(ctx, 'ROTONDA', W / 2, 190, {
      font: `bold 110px ${THEME.fonts.title}`,
      color: THEME.colors.text,
      align: 'center',
      baseline: 'middle',
      shadow: THEME.colors.shadow,
    });
    drawText(ctx, 'aventura · exploración · acertijos', W / 2, 270, {
      font: `22px ${THEME.fonts.ui}`,
      color: THEME.colors.textDim,
      align: 'center',
      baseline: 'middle',
    });

    this.menu.render(ctx);

    drawText(ctx, `v${CONFIG.game.version} · ${CONFIG.game.stage}`, 20, H - 20, {
      font: `14px ${THEME.fonts.ui}`,
      color: THEME.colors.disabled,
      baseline: 'bottom',
    });
    drawText(ctx, 'Este juego aborda temas emocionales sensibles. Consulta el README.', W - 20, H - 20, {
      font: `14px ${THEME.fonts.ui}`,
      color: THEME.colors.disabled,
      align: 'right',
      baseline: 'bottom',
    });
  }
}
