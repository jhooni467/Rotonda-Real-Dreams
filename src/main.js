import { Game } from './engine/Game.js';
import { registerScenes } from './scenes/index.js';
import { registerAllLevels } from './levels/index.js';

/**
 * Punto de entrada: crea el juego, registra escenas y niveles y arranca.
 */
function showFatal(message) {
  const box = document.getElementById('fatal');
  if (!box) return;
  box.hidden = false;
  box.textContent = `ROTONDA no pudo iniciar.\n\n${message}\n\nConsulta la consola del navegador (F12) para más detalles.`;
}

window.addEventListener('error', (e) => showFatal(e.message));
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason?.message ?? e.reason)));

const canvas = document.getElementById('game');
const game = new Game({ canvas });
registerScenes(game.scenes);
registerAllLevels(game.levels);
game.start();

// Acceso desde la consola del navegador para depurar: window.rotonda
window.rotonda = game;
