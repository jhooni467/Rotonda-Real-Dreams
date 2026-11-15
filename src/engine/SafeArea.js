import { ZERO_INSETS } from './layout.js';

/**
 * Lee las áreas seguras del dispositivo (notch/cámara, esquinas redondeadas, barra de gestos).
 *
 * CSS las expone con env(safe-area-inset-*). Desde JavaScript no se pueden leer directamente,
 * así que index.html incluye un elemento invisible (#safe-probe) cuyo padding vale esos
 * valores; aquí se mide su estilo calculado. Requiere `viewport-fit=cover` en el <meta viewport>.
 *
 * Si el navegador no las soporta (o no hay DOM, como en las pruebas) devuelve ceros.
 * @returns {{top:number,right:number,bottom:number,left:number}} píxeles CSS
 */
export function readSafeInsets(win = globalThis) {
  try {
    const probe = win.document?.getElementById?.('safe-probe');
    if (!probe || typeof win.getComputedStyle !== 'function') return ZERO_INSETS;
    const cs = win.getComputedStyle(probe);
    const px = (v) => Number.parseFloat(v) || 0;
    return {
      top: px(cs.paddingTop),
      right: px(cs.paddingRight),
      bottom: px(cs.paddingBottom),
      left: px(cs.paddingLeft),
    };
  } catch {
    return ZERO_INSETS;
  }
}
