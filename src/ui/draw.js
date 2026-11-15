import { CONFIG } from '../config/config.js';

/** Utilidades de dibujo 2D compartidas por la interfaz. */

/** Traza (sin rellenar) un rectángulo redondeado; compatible con navegadores sin ctx.roundRect. */
export function roundRectPath(ctx, x, y, w, h, r = 12) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Tamaño de fuente (unidades lógicas) que garantiza legibilidad: en pantallas pequeñas el juego se
 * muestra reducido y un texto de 14 px lógicos serían ~8 px reales. Devuelve el mayor entre el
 * tamaño pedido y el mínimo legible (CONFIG.ui.minTextCss píxeles CSS) en este dispositivo.
 */
export function legibleSize(renderer, px, minCss = CONFIG.ui.minTextCss) {
  return Math.max(px, Math.ceil(minCss / renderer.cssScale));
}

/** Divide un texto en líneas que caben en maxWidth con la fuente actual del contexto. */
export function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Texto con una sombra suave para mantener legibilidad sobre cualquier fondo. */
export function drawText(ctx, text, x, y, { font, color, align = 'left', baseline = 'alphabetic', shadow = null } = {}) {
  if (font) ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(text, x + 2, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
