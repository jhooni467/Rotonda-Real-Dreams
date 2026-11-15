import { createMemoryStorage } from '../../src/save/storage.js';

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Entorno simulado para ejecutar el juego en Node sin navegador:
 * canvas con un contexto 2D "falso" que registra el texto dibujado, una ventana REDIMENSIONABLE
 * (con eventos, áreas seguras y matchMedia opcional) y almacenamiento en memoria.
 *
 * Como en un navegador real, el canvas se centra en la ventana y getBoundingClientRect refleja
 * su tamaño CSS, de modo que la conversión de coordenadas de toque se prueba con bandas incluidas.
 *
 * @param {object} [o]
 * @param {number} [o.width]  ancho inicial de la ventana (px CSS)
 * @param {number} [o.height] alto inicial
 * @param {number} [o.dpr]    devicePixelRatio
 * @param {object} [o.insets] áreas seguras iniciales en px CSS
 * @param {boolean} [o.coarse] el puntero principal es táctil (matchMedia '(pointer: coarse)')
 * @param {boolean} [o.matchMedia] simular matchMedia (orientation / pointer); si no, se compara el tamaño
 * @param {object} [o.document] documento simulado (pantalla completa)
 */
export function createMockEnv({
  width = 1280,
  height = 720,
  dpr = 1,
  insets = NO_INSETS,
  coarse = false,
  matchMedia = false,
  document: fakeDocument = null,
} = {}) {
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

  const stats = { styleWrites: 0, bufferWrites: 0 };
  const styleData = {};
  const style = new Proxy(styleData, {
    set(t, p, v) {
      stats.styleWrites++;
      t[p] = v;
      return true;
    },
  });

  const listeners = new Map();
  const state = { insets: { ...insets }, coarse };

  const win = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: dpr,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn({ type });
    },
    document: fakeDocument ?? { getElementById: (id) => (id === 'safe-probe' ? {} : null) },
    getComputedStyle: () => ({
      paddingTop: `${state.insets.top}px`,
      paddingRight: `${state.insets.right}px`,
      paddingBottom: `${state.insets.bottom}px`,
      paddingLeft: `${state.insets.left}px`,
    }),
  };
  if (fakeDocument && !fakeDocument.getElementById) fakeDocument.getElementById = (id) => (id === 'safe-probe' ? {} : null);

  if (matchMedia) {
    win.matchMedia = (query) => ({
      get matches() {
        if (query.includes('orientation: portrait')) return win.innerHeight >= win.innerWidth;
        if (query.includes('pointer: coarse')) return state.coarse;
        return false;
      },
      addEventListener() {},
    });
  }

  let bufW = 0;
  let bufH = 0;
  const canvas = {
    style,
    get width() {
      return bufW;
    },
    set width(v) {
      stats.bufferWrites++;
      bufW = v;
    },
    get height() {
      return bufH;
    },
    set height(v) {
      stats.bufferWrites++;
      bufH = v;
    },
    getContext: () => ctx,
    getBoundingClientRect() {
      const w = Number.parseFloat(styleData.width) || win.innerWidth;
      const h = Number.parseFloat(styleData.height) || win.innerHeight;
      return { left: (win.innerWidth - w) / 2, top: (win.innerHeight - h) / 2, width: w, height: h };
    },
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
  };

  const storage = createMemoryStorage();

  return {
    canvas,
    win,
    storage,
    ctx,
    texts,
    stats,
    clearTexts: () => (texts.length = 0),
    /** Cambia el tamaño de la ventana y lanza el evento resize, como un navegador. */
    setSize(w, h, { dpr: newDpr, insets: newInsets } = {}) {
      win.innerWidth = w;
      win.innerHeight = h;
      if (newDpr !== undefined) win.devicePixelRatio = newDpr;
      if (newInsets) state.insets = { ...NO_INSETS, ...newInsets };
      win.dispatch('resize');
    },
    setCoarse(v) {
      state.coarse = v;
    },
  };
}
