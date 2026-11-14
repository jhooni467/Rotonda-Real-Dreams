import { THEME } from '../config/theme.js';
import { roundRectPath, wrapText } from './draw.js';

/**
 * Dibuja la caja de diálogo para un sistema Dialogue (engine/systems/Dialogue.js).
 * Solo dibujo: la lógica de líneas y avance está en Dialogue.
 */
export function drawDialogBox(ctx, dialogue, W, H) {
  const line = dialogue.line;
  if (!line) return;

  const margin = 60;
  const boxH = 176;
  const x = margin;
  const w = W - margin * 2;
  const y = H - boxH - 36;
  const pad = 28;
  const fontSize = 26;
  const font = `${fontSize}px ${THEME.fonts.ui}`;

  roundRectPath(ctx, x, y, w, boxH, 22);
  ctx.fillStyle = 'rgba(30, 25, 40, 0.94)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = THEME.colors.border;
  ctx.stroke();

  if (line.speaker) {
    ctx.font = `bold 22px ${THEME.fonts.ui}`;
    const tabW = ctx.measureText(line.speaker).width + 36;
    roundRectPath(ctx, x + 24, y - 20, tabW, 40, 14);
    ctx.fillStyle = THEME.colors.panelHi;
    ctx.fill();
    ctx.strokeStyle = THEME.colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = THEME.colors.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(line.speaker, x + 42, y + 1);
  }

  // El texto se ajusta con la línea COMPLETA (para que las palabras no "salten" mientras se escribe)
  // y luego se revela carácter a carácter.
  ctx.font = font;
  const cacheKey = `${dialogue.index}:${w}`;
  if (dialogue._wrapKey !== cacheKey) {
    dialogue._wrapLines = wrapText(ctx, line.text, w - pad * 2);
    dialogue._wrapKey = cacheKey;
  }

  ctx.fillStyle = THEME.colors.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let remaining = dialogue.visibleChars;
  dialogue._wrapLines.forEach((text, i) => {
    if (remaining <= 0) return;
    ctx.fillText(text.slice(0, remaining), x + pad, y + pad + 4 + i * (fontSize + 8));
    remaining -= text.length + 1;
  });

  if (dialogue.complete && Math.floor(dialogue.time * 2) % 2 === 0) {
    ctx.fillStyle = THEME.colors.accent;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('▼', x + w - 24, y + boxH - 14);
  }
}
