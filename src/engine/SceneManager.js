import { Transition } from './Transition.js';
import { CONFIG } from '../config/config.js';

/**
 * Pila de escenas con transiciones.
 *
 *   replace(nombre, params)  sustituye TODA la pila por una escena nueva (con fundido)
 *   push(nombre, params)     apila una escena encima (pausa, confirmaciones)
 *   pop()                    retira la escena superior y reanuda la de debajo
 *
 * Solo la escena superior recibe update(); se dibujan desde la última escena
 * opaca hacia arriba (así una pausa transparente deja ver el juego detrás).
 */
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.registry = new Map();
    this.stack = [];
    this.transition = new Transition();
  }

  register(name, SceneClass) {
    this.registry.set(name, SceneClass);
  }

  get current() {
    return this.stack[this.stack.length - 1] ?? null;
  }

  get busy() {
    return this.transition.active;
  }

  _create(name) {
    const SceneClass = this.registry.get(name);
    if (!SceneClass) throw new Error(`Escena no registrada: "${name}"`);
    const scene = new SceneClass(this.game);
    scene.name = name;
    return scene;
  }

  replace(name, params = {}, { transition = true, duration = CONFIG.transitions.duration } = {}) {
    if (this.busy) return false;
    this._create(name); // falla pronto (antes del fundido) si el nombre no existe

    const swap = () => {
      while (this.stack.length) this.stack.pop().exit();
      const scene = this._create(name);
      this.stack.push(scene);
      scene.enter(params);
      this.game.events.emit('scene:changed', { name });
    };

    if (!transition || !this.current) {
      swap();
      return true;
    }
    return this.transition.start({ duration, onMid: swap });
  }

  push(name, params = {}) {
    this.current?.pause();
    const scene = this._create(name);
    this.stack.push(scene);
    scene.enter(params);
    return scene;
  }

  pop() {
    const scene = this.stack.pop();
    scene?.exit();
    this.current?.resume();
  }

  /** Avisa a TODAS las escenas de la pila (también a las tapadas por una pausa). */
  resize(width, height) {
    for (const scene of this.stack) scene.onResize(width, height);
  }

  update(dt) {
    this.transition.update(dt);
    if (this.transition.blocksInput) return;
    this.current?.update(dt);
  }

  render(ctx) {
    const { width, height } = this.game.renderer;
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].transparent) start--;
    for (let i = Math.max(0, start); i < this.stack.length; i++) this.stack[i].render(ctx);
    this.transition.render(ctx, width, height);
  }
}
