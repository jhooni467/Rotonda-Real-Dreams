import { computeLayout, sameLayout } from './layout.js';

/**
 * Gestiona el canvas: resolución lógica adaptable, escalado uniforme a la ventana
 * (con bandas si la proporción queda fuera de los límites), áreas seguras y
 * conversión de coordenadas.
 *
 * El juego dibuja siempre en coordenadas LÓGICAS. La altura lógica es fija (720); el ancho
 * (`renderer.width`) varía con la proporción de la pantalla: léelo siempre de aquí.
 * El cálculo del layout vive en layout.js (función pura, con pruebas).
 */
export class Renderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.config = config;
    this.clearColor = config.clearColor;

    this.baseWidth = config.width; // resolución de referencia (16:9)
    this.width = config.width; // ancho lógico ACTUAL
    this.height = config.height; // alto lógico (fijo)
    this.cssScale = 1; // píxeles CSS por unidad lógica
    this.pixelScaleX = 1; // píxeles reales del canvas por unidad lógica
    this.pixelScaleY = 1;
    this.safe = { top: 0, right: 0, bottom: 0, left: 0 }; // áreas seguras en unidades lógicas
    this.safeRect = { x: 0, y: 0, w: this.width, h: this.height };
    this.layout = null;
  }

  /** Compatibilidad: factor horizontal de píxeles reales por unidad lógica. */
  get pixelScale() {
    return this.pixelScaleX;
  }

  /** Convierte píxeles CSS (lo que el usuario percibe y toca) a unidades lógicas. */
  cssToLogical(px) {
    return px / this.cssScale;
  }

  /**
   * Ajusta el canvas al espacio disponible. Si el resultado es idéntico al actual NO toca
   * el DOM (cambiar el tamaño de un canvas lo borra y es costoso).
   * @returns {boolean} true si la presentación cambió
   */
  resize(
    availW = globalThis.innerWidth ?? this.config.width,
    availH = globalThis.innerHeight ?? this.config.height,
    { dpr = globalThis.devicePixelRatio || 1, insets } = {},
  ) {
    const next = computeLayout({ availW, availH, dpr, insets, config: this.config });
    const prev = this.layout;
    if (sameLayout(prev, next)) return false;
    this.layout = next;

    const { canvas } = this;
    if (!prev || prev.cssW !== next.cssW || prev.cssH !== next.cssH) {
      canvas.style.width = `${next.cssW}px`;
      canvas.style.height = `${next.cssH}px`;
    }
    if (!prev || prev.bufW !== next.bufW || prev.bufH !== next.bufH) {
      canvas.width = next.bufW;
      canvas.height = next.bufH;
    }

    this.width = next.width;
    this.height = next.height;
    this.cssScale = next.cssScale;
    this.pixelScaleX = next.pixelScaleX;
    this.pixelScaleY = next.pixelScaleY;
    this.safe = next.safe;
    this.safeRect = {
      x: next.safe.left,
      y: next.safe.top,
      w: Math.max(1, next.width - next.safe.left - next.safe.right),
      h: Math.max(1, next.height - next.safe.top - next.safe.bottom),
    };
    return true;
  }

  /** Prepara el fotograma: transformación lógica + limpieza. */
  begin() {
    const { ctx } = this;
    ctx.setTransform(this.pixelScaleX, 0, 0, this.pixelScaleY, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.clearColor;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /** Convierte coordenadas de pantalla (clientX/Y) a coordenadas lógicas. */
  toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.width;
    const h = rect.height || this.height;
    return {
      x: ((clientX - rect.left) / w) * this.width,
      y: ((clientY - rect.top) / h) * this.height,
    };
  }
}
