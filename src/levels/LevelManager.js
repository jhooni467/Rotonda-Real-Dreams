import { Level } from './Level.js';

/**
 * Registro de niveles. Cada nivel se describe con un objeto de datos:
 *
 *   {
 *     id: 'identificador_unico',
 *     name: 'Nombre visible',
 *     size: { w, h },                       // tamaño del mundo en px lógicos
 *     spawns: { default: { x, y } },         // puntos de aparición (obligatorio "default")
 *     zoom: 1,                               // zoom inicial (opcional)
 *     dialogues: { idDialogo: [ {speaker, text}, ... ] },
 *     entities: [ { type: 'npc', x, y, ... } ],
 *     drawBackground(ctx, camera, level) {}  // cada nivel puede tener identidad visual propia
 *   }
 *
 * Añadir un nivel = crear su archivo en src/levels/ y registrarlo en levels/index.js.
 */
export class LevelManager {
  constructor() {
    this.defs = new Map();
  }

  register(def) {
    const problems = [];
    if (!def || typeof def.id !== 'string' || !def.id) problems.push('falta "id"');
    if (!def?.name) problems.push('falta "name"');
    if (!(def?.size?.w > 0 && def?.size?.h > 0)) problems.push('"size" debe tener w y h positivos');
    if (!def?.spawns?.default) problems.push('falta el spawn "default"');
    if (problems.length) throw new Error(`Definición de nivel inválida (${def?.id ?? '?'}): ${problems.join(', ')}`);
    if (this.defs.has(def.id)) throw new Error(`Nivel duplicado: "${def.id}"`);
    this.defs.set(def.id, def);
  }

  has(id) {
    return this.defs.has(id);
  }

  ids() {
    return [...this.defs.keys()];
  }

  getName(id) {
    return this.defs.get(id)?.name ?? id;
  }

  /** Crea una instancia jugable del nivel. */
  load(id) {
    const def = this.defs.get(id);
    if (!def) throw new Error(`Nivel no registrado: "${id}"`);
    return new Level(def);
  }
}
