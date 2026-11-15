/**
 * Cálculo PURO del layout de presentación (sin DOM): dado el espacio disponible en la
 * ventana, decide el tamaño lógico, el tamaño CSS y del búfer del canvas, y las áreas seguras
 * expresadas en unidades lógicas. Al ser una función pura se puede probar con cualquier proporción.
 *
 * Reglas:
 *  1. La altura lógica es fija (config.height). El ancho lógico sigue la proporción de la
 *     pantalla, limitada a [minAspect, maxAspect] y redondeada a múltiplos de widthStep.
 *  2. La escala es UNIFORME (mismo factor en X e Y): nada se deforma. Si la proporción de la
 *     pantalla queda fuera de los límites, sobran bandas (el canvas se centra).
 *  3. La densidad de píxeles se limita por maxPixelRatio y por un presupuesto total de píxeles.
 *  4. Las áreas seguras (notch, esquinas redondeadas, barra de gestos) llegan en píxeles CSS y
 *     se convierten a unidades lógicas, descontando lo que ya absorben las bandas.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const ZERO_INSETS = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

/**
 * @param {object} p
 * @param {number} p.availW   ancho disponible (px CSS)
 * @param {number} p.availH   alto disponible (px CSS)
 * @param {number} [p.dpr]    devicePixelRatio del dispositivo
 * @param {{top:number,right:number,bottom:number,left:number}} [p.insets] áreas seguras (px CSS)
 * @param {object} p.config   CONFIG.render
 */
export function computeLayout({ availW, availH, dpr = 1, insets = ZERO_INSETS, config }) {
  const { height, minAspect, maxAspect, widthStep, maxPixelRatio, maxPixels } = config;

  const aw = Math.max(1, Number.isFinite(availW) ? availW : config.width);
  const ah = Math.max(1, Number.isFinite(availH) ? availH : config.height);

  const aspect = clamp(aw / ah, minAspect, maxAspect);
  const width = Math.max(widthStep, Math.round((height * aspect) / widthStep) * widthStep);

  const scale = Math.min(aw / width, ah / height);
  const cssW = Math.max(1, Math.floor(width * scale));
  const cssH = Math.max(1, Math.floor(height * scale));
  const cssScale = cssH / height; // píxeles CSS por unidad lógica

  let ratio = clamp(Number.isFinite(dpr) ? dpr : 1, 1, maxPixelRatio);
  ratio = Math.max(1, Math.min(ratio, Math.sqrt(maxPixels / (cssW * cssH))));
  ratio = Math.round(ratio * 100) / 100;

  const bufW = Math.round(cssW * ratio);
  const bufH = Math.round(cssH * ratio);

  // Las bandas (espacio sobrante a cada lado) ya quedan fuera de la zona de juego:
  // solo cuenta la parte del área segura que invade realmente el canvas.
  const barX = (aw - cssW) / 2;
  const barY = (ah - cssH) / 2;
  const toLogical = (inset, bar) => Math.ceil(Math.max(0, (inset || 0) - bar) / cssScale);

  return {
    width,
    height,
    cssW,
    cssH,
    bufW,
    bufH,
    ratio,
    cssScale,
    pixelScaleX: bufW / width,
    pixelScaleY: bufH / height,
    letterboxed: Math.abs(aw / ah - aspect) / aspect > 0.01,
    safe: {
      top: toLogical(insets.top, barY),
      right: toLogical(insets.right, barX),
      bottom: toLogical(insets.bottom, barY),
      left: toLogical(insets.left, barX),
    },
  };
}

/** ¿Dos layouts producen exactamente la misma presentación? (para evitar trabajo innecesario) */
export function sameLayout(a, b) {
  return (
    !!a &&
    !!b &&
    a.width === b.width &&
    a.cssW === b.cssW &&
    a.cssH === b.cssH &&
    a.bufW === b.bufW &&
    a.bufH === b.bufH &&
    a.safe.top === b.safe.top &&
    a.safe.right === b.safe.right &&
    a.safe.bottom === b.safe.bottom &&
    a.safe.left === b.safe.left
  );
}
