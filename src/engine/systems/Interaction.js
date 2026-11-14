/**
 * Sistema de interacción.
 *
 * Una entidad es interactuable si define:
 *   entity.interactable = { radius, prompt, enabled }
 *   entity.onInteract(scene)
 *
 * Cada paso se elige la entidad interactuable más cercana dentro de su radio;
 * esa es el "foco" (la escena dibuja el aviso sobre ella).
 */
export class InteractionSystem {
  constructor() {
    this.focus = null;
  }

  update(actor, entities) {
    let best = null;
    let bestDist = Infinity;
    for (const e of entities) {
      const info = e.interactable;
      if (e === actor || !info || info.enabled === false) continue;
      const d = Math.hypot(e.cx - actor.cx, e.cy - actor.cy);
      if (d <= info.radius && d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    this.focus = best;
    return best;
  }

  /** Ejecuta la interacción con el foco actual. Devuelve true si había algo. */
  interact(scene) {
    if (!this.focus) return false;
    this.focus.onInteract?.(scene);
    return true;
  }
}
