/**
 * Clase base de toda escena (menú, nivel, pausa, cargando…).
 *
 * Ciclo de vida:
 *   enter(params)  al entrar (o al crearse con push)
 *   update(dt)     cada paso de simulación, solo si es la escena superior
 *   render(ctx)    cada fotograma
 *   pause()/resume() cuando otra escena se apila encima / se retira
 *   exit()         al salir definitivamente
 *
 * Una escena con `transparent = true` (diálogos de confirmación, pausa)
 * deja que se siga dibujando la escena que tiene debajo.
 */
export class Scene {
  constructor(game) {
    this.game = game;
    this.name = '';
  }

  get transparent() {
    return false;
  }

  enter(_params) {}
  exit() {}
  pause() {}
  resume() {}
  update(_dt) {}
  render(_ctx) {}
}
