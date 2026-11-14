import { createMemoryStorage } from '../../src/save/storage.js';

/**
 * Entorno simulado para ejecutar el juego en Node sin navegador:
 * canvas con un contexto 2D "falso" que registra el texto dibujado, ventana y almacenamiento en memoria.
 */
export function createMockEnv({ width = 1280, height = 720 } = {}) {
  const texts = [];
  const target = {
    measureText: (t) => ({ width: String(t).length * 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    fillText: (t) => void texts.push(String(t)),
  };
  const ctx = new Proxy(target, {
    get: (t, p) => (p in t ? t[p] : () => undefined),
    set: (t, p, v) => ((t[p] = v), true),
  });

  const canvas = {
    style: {},
    width: 0,
    height: 0,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
  };
  const win = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
  };
  const storage = createMemoryStorage();

  return { canvas, win, storage, ctx, texts, clearTexts: () => (texts.length = 0) };
}
