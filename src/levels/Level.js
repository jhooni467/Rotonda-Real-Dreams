import { createEntity } from './entityFactory.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Instancia en ejecución de un nivel, creada a partir de su definición.
 * La definición es DATOS (ver levels/dev/devTestRoom.js); el Level la vuelve jugable.
 */
export class Level {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.bounds = { x: 0, y: 0, w: def.size.w, h: def.size.h };
    this.dialogues = def.dialogues ?? {};
    this.entities = [];
    for (const spec of def.entities ?? []) this.add(createEntity(spec));
  }

  add(entity) {
    this.entities.push(entity);
    return entity;
  }

  spawnPoint(name = 'default') {
    return this.def.spawns[name] ?? this.def.spawns.default;
  }

  update(dt, ctx) {
    for (const e of this.entities) e.update(dt, { ...ctx, level: this });
    if (this.entities.some((e) => e.removed)) this.entities = this.entities.filter((e) => !e.removed);
  }

  /**
   * Mueve una entidad respetando los límites del nivel y las entidades sólidas.
   *
   * - Se resuelve eje por eje para poder "deslizarse" contra las paredes.
   * - El desplazamiento se divide en tramos pequeños (MAX_STEP) para que una
   *   entidad rápida nunca "atraviese" un obstáculo fino entre dos pasos.
   */
  moveEntity(entity, dx, dy) {
    const MAX_STEP = 8;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_STEP));
    const sx = dx / steps;
    const sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (sx !== 0) this._moveAxis(entity, 'x', sx);
      if (sy !== 0) this._moveAxis(entity, 'y', sy);
    }
  }

  _moveAxis(entity, axis, delta) {
    const b = this.bounds;
    const horizontal = axis === 'x';
    const size = horizontal ? entity.w : entity.h;
    const min = horizontal ? b.x : b.y;
    const max = horizontal ? b.x + b.w : b.y + b.h;

    entity[axis] = clamp(entity[axis] + delta, min, max - size);
    for (const o of this.entities) {
      if (o === entity || !o.solid || !overlaps(entity, o)) continue;
      if (horizontal) entity.x = delta > 0 ? o.x - entity.w : o.x + o.w;
      else entity.y = delta > 0 ? o.y - entity.h : o.y + o.h;
    }
  }

  renderBackground(ctx, camera) {
    this.def.drawBackground?.(ctx, camera, this);
  }

  renderEntities(ctx) {
    const sorted = [...this.entities].sort((a, b) => a.sortY - b.sortY);
    for (const e of sorted) e.render(ctx);
  }
}
