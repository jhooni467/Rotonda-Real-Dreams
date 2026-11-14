import { Entity } from './Entity.js';
import { THEME } from '../config/theme.js';

/**
 * Personaje/objeto con el que se puede interactuar y que lanza un diálogo.
 *
 * Es la plantilla base para los personajes futuros (se amplía o se hereda).
 * Su dibujo actual es un MARCADOR PROVISIONAL claramente rotulado.
 *
 * Datos (vienen de la definición del nivel, ver levels/dev/devTestRoom.js):
 *   { type: 'npc', x, y, label, dialogue: 'idDelDialogo' }
 */
export class NPC extends Entity {
  constructor({ label = 'Marcador', dialogue = null, prompt = 'Hablar', ...opts } = {}) {
    super({ w: 56, h: 56, ...opts });
    this.label = label;
    this.dialogueId = dialogue;
    this.solid = true;
    this.interactable = { radius: 110, prompt, enabled: true };
  }

  onInteract(scene) {
    if (this.dialogueId) scene.startDialogue(this.dialogueId);
  }

  // --- DIBUJO PROVISIONAL ---
  render(ctx) {
    ctx.fillStyle = THEME.colors.panelHi;
    ctx.strokeStyle = THEME.colors.accent;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    ctx.setLineDash([]);

    ctx.fillStyle = THEME.colors.text;
    ctx.font = `bold 14px ${THEME.fonts.ui}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(this.label, this.cx, this.y - 8);
  }
}
