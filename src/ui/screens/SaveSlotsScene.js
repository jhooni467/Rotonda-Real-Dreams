import { Scene } from '../../engine/Scene.js';
import { CONFIG } from '../../config/config.js';
import { THEME } from '../../config/theme.js';
import { createEmptySave } from '../../save/schema.js';
import { Menu } from '../Menu.js';
import { drawText } from '../draw.js';
import { formatDate, formatPlaytime } from '../format.js';

/**
 * Selección de espacio de guardado.
 *   mode 'new'  → elegir dónde empezar una partida nueva (pide confirmar si hay datos)
 *   mode 'load' → elegir una partida existente para continuarla
 */
export class SaveSlotsScene extends Scene {
  enter({ mode = 'new' } = {}) {
    const { game } = this;
    this.mode = mode;
    const { width: W } = game.renderer;

    const items = game.saves.listSlots().map((s) => {
      const n = `Espacio ${s.slot}`;
      switch (s.status) {
        case 'empty':
          return { label: `${n} · Vacío`, enabled: mode === 'new', onSelect: () => this._choose(s) };
        case 'ok':
          return {
            label: `${n} · ${game.levels.getName(s.data.levelId)} · ${formatPlaytime(s.data.playtimeMs)} · ${formatDate(s.data.updatedAt)}`,
            onSelect: () => this._choose(s),
          };
        case 'newer':
          return { label: `${n} · Guardado de una versión más nueva`, enabled: mode === 'new', onSelect: () => this._choose(s) };
        default:
          return { label: `${n} · Datos ilegibles`, enabled: mode === 'new', onSelect: () => this._choose(s) };
      }
    });
    items.push({ label: 'Volver', onSelect: () => this._back() });

    this.menu = new Menu({ audio: game.audio, x: W / 2, y: 190, width: 900, itemHeight: 74, gap: 16, fontSize: 24, items });
  }

  _back() {
    this.game.scenes.replace('mainMenu');
  }

  _choose(slotInfo) {
    const { game } = this;
    if (this.mode === 'load') {
      game.scenes.replace('level', { slot: slotInfo.slot, data: slotInfo.data });
      return;
    }
    if (slotInfo.status === 'empty') {
      this._startNew(slotInfo.slot);
      return;
    }
    game.scenes.push('confirm', {
      message: `El espacio ${slotInfo.slot} ya contiene datos. ¿Quieres sobrescribirlo con una partida nueva?`,
      yesLabel: 'Sobrescribir',
      noLabel: 'Cancelar',
      onYes: () => this._startNew(slotInfo.slot),
    });
  }

  _startNew(slot) {
    const { game } = this;
    const data = createEmptySave({ slot, levelId: CONFIG.startLevelId });
    if (!game.saves.write(slot, data)) console.warn('[SaveSlots] No se pudo reservar el espacio; se jugará sin guardado hasta poder guardar.');
    game.scenes.replace('level', { slot, data });
  }

  update() {
    const { input } = this.game;
    this.menu.update(input);
    if (input.wasPressed('cancel')) this._back();
  }

  render(ctx) {
    const { width: W, height: H } = this.game.renderer;
    ctx.fillStyle = '#16121f';
    ctx.fillRect(0, 0, W, H);
    drawText(ctx, this.mode === 'new' ? 'Nueva partida' : 'Cargar partida', W / 2, 100, {
      font: `bold 52px ${THEME.fonts.title}`,
      color: THEME.colors.text,
      align: 'center',
      baseline: 'middle',
    });
    if (!this.game.saves.persistent) {
      drawText(ctx, 'Aviso: el navegador bloquea el almacenamiento; el progreso no se conservará al cerrar.', W / 2, H - 30, {
        font: `16px ${THEME.fonts.ui}`,
        color: THEME.colors.accent,
        align: 'center',
        baseline: 'bottom',
      });
    }
    this.menu.render(ctx);
  }
}
