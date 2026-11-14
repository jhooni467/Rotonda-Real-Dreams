/**
 * Formato de los datos guardados y su versionado.
 *
 * Cada partida guarda `version`. Si en el futuro cambia el formato:
 *   1. Sube SAVE_VERSION.
 *   2. Añade en MIGRATIONS la función que convierte de la versión N a N+1.
 * Así las partidas antiguas se siguen leyendo sin perder progreso.
 */
export const SAVE_VERSION = 1;

// MIGRATIONS[n] convierte datos de la versión n a la n+1. Ejemplo futuro:
//   1: (d) => ({ ...d, version: 2, inventory: [] }),
const MIGRATIONS = {};

export function createEmptySave({ slot, levelId }) {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    slot,
    createdAt: now,
    updatedAt: now,
    playtimeMs: 0,
    levelId,
    player: null, // {x, y}; null = usar el punto de aparición del nivel
    zoom: null, // null = zoom por defecto del nivel
    flags: {}, // banderas de progreso; las usarán historia y acertijos
  };
}

export const DEFAULT_SETTINGS = Object.freeze({
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  touchControls: 'auto', // 'auto' | 'on' | 'off'
});

function isValid(d) {
  return (
    d &&
    typeof d === 'object' &&
    typeof d.levelId === 'string' &&
    d.levelId.length > 0 &&
    Number.isFinite(d.playtimeMs) &&
    d.playtimeMs >= 0 &&
    d.flags &&
    typeof d.flags === 'object' &&
    (d.player === null || (Number.isFinite(d.player?.x) && Number.isFinite(d.player?.y)))
  );
}

/**
 * Valida y migra datos leídos del almacenamiento.
 * @returns {{status:'ok', data:object} | {status:'corrupt'} | {status:'newer'}}
 */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.version) || raw.version < 1) {
    return { status: 'corrupt' };
  }
  if (raw.version > SAVE_VERSION) return { status: 'newer' }; // guardado por una versión más nueva del juego

  let data = { ...raw };
  while (data.version < SAVE_VERSION) {
    const step = MIGRATIONS[data.version];
    if (!step) return { status: 'corrupt' };
    data = step(data);
  }
  return isValid(data) ? { status: 'ok', data } : { status: 'corrupt' };
}
