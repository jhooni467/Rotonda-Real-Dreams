/**
 * Configuración general de ROTONDA.
 *
 * Todo valor "mágico" del motor vive aquí para poder ajustarlo sin buscar
 * por el código. El objeto queda congelado: no se modifica en tiempo de ejecución.
 */

function deepFreeze(obj) {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(obj);
}

export const CONFIG = deepFreeze({
  game: {
    name: 'ROTONDA',
    version: '0.1.0',
    stage: 'Etapa 01 · adaptabilidad multidispositivo',
  },

  // Resolución LÓGICA del juego. La referencia es 1280×720 (16:9).
  //  - La ALTURA lógica es siempre `height` (720): física, cámara y arte se miden contra ella.
  //  - El ANCHO lógico se adapta a la proporción de la pantalla, entre minAspect y maxAspect
  //    (por defecto 4:3 → 960 y 2,4:1 → 1728). Las pantallas panorámicas ven más escenario
  //    a los lados; las menos panorámicas, un poco menos. Fuera de ese rango se añaden bandas.
  //  - El ancho lógico se redondea a múltiplos de `widthStep` para no recalcular por cambios mínimos.
  // Las escenas siempre usan renderer.width / renderer.height, nunca estos valores directamente.
  render: {
    width: 1280, // ancho de referencia (16:9); también el valor inicial antes de medir la pantalla
    height: 720,
    minAspect: 4 / 3,
    maxAspect: 2.4,
    widthStep: 16,
    maxPixelRatio: 2, // tope de densidad de píxeles para cuidar el rendimiento en móviles
    maxPixels: 3000000, // presupuesto de píxeles del canvas; en pantallas enormes baja la densidad
    clearColor: '#14121a',
  },

  // Interfaz adaptable. Las medidas "Css" son píxeles CSS reales de la pantalla (≈ dp en Android):
  // el motor las convierte a unidades lógicas según el tamaño en que se esté mostrando el juego.
  ui: {
    safeMargin: 24, // margen (unidades lógicas) entre los controles y el borde del área segura
    minTextCss: 11, // tamaño mínimo legible de texto secundario
    touch: {
      stickRadiusCss: 62,
      mainButtonRadiusCss: 46, // botón de acción (≈ 92 px de diámetro)
      smallButtonRadiusCss: 24, // pausa, zoom (≈ 48 px de diámetro: mínimo cómodo para el dedo)
      hitSlopCss: 6, // zona táctil extra alrededor de cada botón
    },
  },

  // Paso fijo de simulación (60 Hz) y tope de tiempo por fotograma.
  loop: {
    step: 1 / 60,
    maxFrameTime: 0.25,
  },

  camera: {
    followSpeed: 5, // mayor = sigue más rápido (suavizado exponencial)
    zoomSpeed: 7,
    defaultZoom: 1,
    minZoom: 0.5,
    maxZoom: 2.5,
    zoomStep: 1.25,
  },

  player: {
    speed: 280, // píxeles lógicos por segundo
  },

  save: {
    slots: 3,
    keyPrefix: 'rotonda.save.',
    settingsKey: 'rotonda.settings',
  },

  transitions: {
    duration: 0.35, // segundos por mitad (salida + entrada)
  },

  dialogue: {
    charsPerSecond: 48,
  },

  // Nivel con el que comienza una partida nueva.
  // En esta etapa es una sala técnica de pruebas, no un nivel del juego.
  startLevelId: 'dev_test_room',

  debug: {
    startEnabled: false,
  },
});
