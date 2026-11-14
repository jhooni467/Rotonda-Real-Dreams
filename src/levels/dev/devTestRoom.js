import { THEME } from '../../config/theme.js';

/**
 * SALA DE PRUEBAS TÉCNICA — provisional, NO es un nivel del juego.
 *
 * Existe solo para comprobar que funcionan movimiento, cámara, zoom, colisiones,
 * interacción, diálogos y guardado. Los textos son de prueba, no de la historia.
 * Cuando haya niveles reales, esta sala se puede eliminar quitándola de levels/index.js
 * (y cambiando CONFIG.startLevelId).
 */
export default {
  id: 'dev_test_room',
  name: 'Sala de pruebas (provisional)',
  size: { w: 2400, h: 1350 }, // más grande que la pantalla para probar el seguimiento de cámara
  spawns: { default: { x: 1160, y: 640 } },
  zoom: 1,
  hint: 'PROVISIONAL · Mover: WASD / flechas / stick · Interactuar: E · Zoom: + / − o rueda · Pausa: Esc',

  dialogues: {
    marcador_a: [
      { speaker: 'Marcador A', text: 'Texto de prueba. Este marcador solo sirve para comprobar el sistema de diálogos.' },
      { speaker: 'Marcador A', text: 'Pulsa interactuar para avanzar. Si el texto aún se está escribiendo, la primera pulsación lo completa.' },
    ],
    marcador_b: [
      { speaker: 'Marcador B', text: 'Otra línea de prueba, esta vez más larga, para comprobar que el texto se ajusta al ancho de la caja de diálogo sin salirse de ella.' },
      'Esta línea no tiene hablante: sirve para probar diálogos sin nombre.',
      { speaker: 'Marcador B', text: 'Fin de la prueba.' },
    ],
  },

  entities: [
    { type: 'npc', x: 700, y: 480, label: 'Marcador A', dialogue: 'marcador_a' },
    { type: 'npc', x: 1700, y: 880, label: 'Marcador B', dialogue: 'marcador_b' },
  ],

  // Fondo neutro: cuadrícula para percibir el movimiento y la escala. Sin diseño artístico.
  drawBackground(ctx, camera, level) {
    const { x: bx, y: by, w: bw, h: bh } = level.bounds;
    ctx.fillStyle = '#2a2438';
    ctx.fillRect(bx, by, bw, bh);

    const view = camera.viewRect();
    const step = 120;
    const x0 = Math.max(bx, Math.floor(view.x / step) * step);
    const y0 = Math.max(by, Math.floor(view.y / step) * step);
    const x1 = Math.min(bx + bw, view.x + view.w + step);
    const y1 = Math.min(by + bh, view.y + view.h + step);

    ctx.strokeStyle = 'rgba(244, 236, 216, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) {
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    for (let y = y0; y <= y1; y += step) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();

    ctx.strokeStyle = THEME.colors.accent;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(244, 236, 216, 0.35)';
    ctx.font = `bold 40px ${THEME.fonts.ui}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SALA DE PRUEBAS · PROVISIONAL', bx + bw / 2, by + 120);
  },
};
