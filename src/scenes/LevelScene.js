import { Scene } from '../engine/Scene.js';
import { Camera } from '../engine/Camera.js';
import { Dialogue } from '../engine/systems/Dialogue.js';
import { InteractionSystem } from '../engine/systems/Interaction.js';
import { Player } from '../characters/Player.js';
import { CONFIG } from '../config/config.js';
import { THEME } from '../config/theme.js';
import { TouchControls } from '../ui/TouchControls.js';
import { drawDialogBox } from '../ui/DialogBox.js';
import { drawText, roundRectPath } from '../ui/draw.js';

/**
 * Escena de juego: un nivel con jugador, cámara, interacción y diálogos.
 *
 * Parámetros de enter(): { slot, data } donde `data` es el guardado (nuevo o cargado).
 * Esta escena es genérica: sirve para cualquier nivel registrado en LevelManager.
 */
export class LevelScene extends Scene {
  enter({ slot, data }) {
    const { game } = this;
    const { width: W, height: H } = game.renderer;

    this.slot = slot;
    this.data = data;
    this.level = game.levels.load(data.levelId);

    const spawn = data.player ?? this.level.spawnPoint();
    this.player = this.level.add(new Player({ x: spawn.x, y: spawn.y }));

    this.camera = new Camera({
      ...CONFIG.camera,
      viewW: W,
      viewH: H,
      zoom: data.zoom ?? this.level.def.zoom ?? CONFIG.camera.defaultZoom,
      bounds: this.level.bounds,
    });
    this.camera.follow(this.player);
    this.camera.snap();

    this.interaction = new InteractionSystem();
    this.dialogue = new Dialogue({ charsPerSecond: CONFIG.dialogue.charsPerSecond });
    this.touch = new TouchControls(game);
    this.playtimeMs = data.playtimeMs;

    game.events.emit('level:loaded', { id: this.level.id });
  }

  /** Lanza un diálogo definido en el nivel actual (lo usan las entidades al interactuar). */
  startDialogue(id) {
    const lines = this.level.dialogues[id];
    if (!lines) {
      console.warn(`[LevelScene] Diálogo inexistente en "${this.level.id}": "${id}"`);
      return false;
    }
    return this.dialogue.start(lines);
  }

  /** Estado actual en el formato de guardado (lo usa la pausa para guardar). */
  snapshot() {
    return {
      ...this.data,
      levelId: this.level.id,
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      zoom: Number(this.camera.targetZoom.toFixed(3)),
      playtimeMs: Math.round(this.playtimeMs),
    };
  }

  update(dt) {
    const { input, audio } = this.game;
    this.playtimeMs += dt * 1000;
    const talking = this.dialogue.active;
    this.touch.update(input, !talking);

    if (talking) {
      this.dialogue.update(dt);
      const advance = input.wasPressed('interact') || input.wasPressed('confirm') || input.getTaps().length > 0;
      if (advance && this.dialogue.advance()) audio.blip(560, 0.04, 0.08);
    } else {
      if (input.wasPressed('pause')) {
        this.game.scenes.push('pause', { levelScene: this });
        return;
      }
      this._handleZoom(input);
      this.interaction.update(this.player, this.level.entities);
      if (input.wasPressed('interact')) this.interaction.interact(this);
    }

    this.level.update(dt, { input, canMove: !this.dialogue.active });
    this.camera.update(dt);
  }

  _handleZoom(input) {
    const step = CONFIG.camera.zoomStep;
    if (input.wasPressed('zoomIn') || input.wheel < 0) this.camera.zoomBy(step);
    if (input.wasPressed('zoomOut') || input.wheel > 0) this.camera.zoomBy(1 / step);
  }

  render(ctx) {
    const { width: W, height: H } = this.game.renderer;
    const { input } = this.game;

    ctx.save();
    this.camera.apply(ctx);
    this.level.renderBackground(ctx, this.camera);
    this.level.renderEntities(ctx);
    ctx.restore();

    const focus = this.interaction.focus;
    if (focus && !this.dialogue.active) this._renderPrompt(ctx, focus, input.usedTouch);

    if (this.level.def.hint && !input.usedTouch) {
      drawText(ctx, this.level.def.hint, 20, 18, {
        font: `15px ${THEME.fonts.ui}`,
        color: THEME.colors.textDim,
        baseline: 'top',
        shadow: THEME.colors.shadow,
      });
    }

    drawDialogBox(ctx, this.dialogue, W, H);
    this.touch.render(ctx, !this.dialogue.active);
  }

  _renderPrompt(ctx, entity, touch) {
    const pos = this.camera.worldToScreen(entity.cx, entity.y - 36);
    const text = touch ? entity.interactable.prompt : `E · ${entity.interactable.prompt}`;
    ctx.font = `bold 20px ${THEME.fonts.ui}`;
    const w = ctx.measureText(text).width + 30;
    roundRectPath(ctx, pos.x - w / 2, pos.y - 20, w, 40, 14);
    ctx.fillStyle = 'rgba(30, 25, 40, 0.92)';
    ctx.fill();
    ctx.strokeStyle = THEME.colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawText(ctx, text, pos.x, pos.y + 1, {
      color: THEME.colors.text,
      align: 'center',
      baseline: 'middle',
    });
  }
}
