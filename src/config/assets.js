/**
 * Manifiesto de recursos que se cargan al arrancar (BootScene).
 *
 * Está vacío a propósito: en la Etapa 00 no hay arte ni audio definitivos y
 * todo lo visible es dibujo provisional con código.
 *
 * Cuando haya recursos, se declaran aquí con una clave y una ruta relativa
 * a la raíz del proyecto:
 *
 *   images: { 'player.idle': 'assets/graphics/player/idle.png' },
 *   json:   { 'dialogue.intro': 'assets/data/intro.json' },
 *   audio:  { 'sfx.step': 'assets/audio/step.ogg' },
 *
 * Un recurso que falle al cargar NO detiene el juego: se avisa por consola
 * y el código usa su dibujo provisional.
 */
export const ASSET_MANIFEST = Object.freeze({
  images: Object.freeze({}),
  json: Object.freeze({}),
  audio: Object.freeze({}),
});
