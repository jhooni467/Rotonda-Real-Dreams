/**
 * Gestiona el canvas: resolución lógica fija, escalado a la ventana
 * (con bandas si la proporción no coincide) y conversión de coordenadas.
 *
 * El juego dibuja siempre en coordenadas lógicas (p. ej. 1280×720).
 */
export class Renderer {
  constructor(canvas, { width, height, maxPixelRatio, clearColor }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = width;
    this.height = height;
    this.maxPixelRatio = maxPixelRatio;
    this.clearColor = clearColor;
    this.pixelScale = 1; // píxeles reales del canvas por unidad lógica
  }

  /** Ajusta el tamaño del canvas al espacio disponible conservando la proporción. */
  resize(availW = globalThis.innerWidth ?? this.width, availH = globalThis.innerHeight ?? this.height) {
    const aspect = this.width / this.height;
    let cssW = availW;
    let cssH = cssW / aspect;
    if (cssH > availH) {
      cssH = availH;
      cssW = cssH * aspect;
    }
    cssW = Math.max(1, Math.floor(cssW));
    cssH = Math.max(1, Math.floor(cssH));

    const dpr = Math.min(globalThis.devicePixelRatio || 1, this.maxPixelRatio);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.pixelScale = this.canvas.width / this.width;
  }

  /** Prepara el fotograma: transformación lógica + limpieza. */
  begin() {
    const { ctx } = this;
    ctx.setTransform(this.pixelScale, 0, 0, this.pixelScale, 0, 0);
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
