/**
 * Adaptador de almacenamiento.
 *
 * Usa localStorage cuando está disponible y funciona. En algunos navegadores
 * (modo privado estricto, cookies bloqueadas) localStorage lanza errores: en ese
 * caso se usa memoria y `persistent` queda en false. El juego sigue funcionando,
 * pero el progreso se perdería al cerrar la pestaña.
 */
export function createStorage(win = globalThis) {
  try {
    const ls = win.localStorage;
    const probe = '__rotonda_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      persistent: true,
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
    };
  } catch {
    return createMemoryStorage();
  }
}

export function createMemoryStorage() {
  const map = new Map();
  return {
    persistent: false,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}
