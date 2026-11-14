import devTestRoom from './dev/devTestRoom.js';

/**
 * Lista de niveles del juego. Para añadir uno: importarlo y ponerlo en el arreglo.
 */
export const LEVELS = [devTestRoom];

export function registerAllLevels(levelManager) {
  for (const def of LEVELS) levelManager.register(def);
}
