/**
 * Base de todo lo que existe dentro de un nivel (jugador, personajes, objetos).
 *
 * Coordenadas de MUNDO. (x, y) es la esquina superior izquierda de su caja.
 * Para hacer una entidad interactuable:
 *   this.interactable = { radius: 90, prompt: 'Hablar', enabled: true };
 *   onInteract(scene) { ... }
 */
export class Entity {
  constructor({ x = 0, y = 0, w = 32, h = 32 } = {}) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.solid = false; // bloquea el paso (colisiones en Level.moveEntity)
    this.interactable = null;
    this.removed = false;
  }

  get cx() {
    return this.x + this.w / 2;
  }

  get cy() {
    return this.y + this.h / 2;
  }

  /** Orden de dibujo: lo que está más abajo en pantalla se pinta encima. */
  get sortY() {
    return this.y + this.h;
  }

  update(_dt, _ctx) {}
  render(_ctx) {}
  onInteract(_scene) {}
}
