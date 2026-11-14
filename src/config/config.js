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
    version: '0.0.1',
    stage: 'Etapa 00 · estructura base',
  },

  // Resolución LÓGICA del juego (16:9). El canvas se escala a la ventana
  // manteniendo la proporción; el código del juego siempre usa estas medidas.
  render: {
    width: 1280,
    height: 720,
    maxPixelRatio: 2, // tope de densidad de píxeles para cuidar el rendimiento en móviles
    clearColor: '#14121a',
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
