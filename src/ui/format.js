/** Formatos de texto para la interfaz. */

export function formatPlaytime(ms) {
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}
