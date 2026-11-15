/**
 * Asignación de acciones a teclas.
 *
 * Se usa KeyboardEvent.code (posición física de la tecla), así que WASD funciona
 * igual en teclados QWERTY, AZERTY, etc. Varias acciones pueden compartir tecla:
 * cada escena decide qué acciones consulta.
 */
export const KEY_BINDINGS = Object.freeze({
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],

  interact: ['KeyE', 'Enter', 'Space'],
  confirm: ['Enter', 'Space', 'KeyE'],
  cancel: ['Escape', 'Backspace'],
  pause: ['Escape', 'KeyP'],

  zoomIn: ['Equal', 'NumpadAdd'],
  zoomOut: ['Minus', 'NumpadSubtract'],

  fullscreen: ['KeyF'],
  debug: ['F3'],
});
