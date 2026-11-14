/**
 * Bus de eventos mínimo para comunicar sistemas sin acoplarlos.
 * Ejemplo: game.events.emit('level:loaded', { id }).
 */
export class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(type, handler) {
    if (!this._handlers.has(type)) this._handlers.set(type, new Set());
    this._handlers.get(type).add(handler);
    return () => this.off(type, handler); // devuelve la función para desuscribirse
  }

  off(type, handler) {
    this._handlers.get(type)?.delete(handler);
  }

  emit(type, payload) {
    const set = this._handlers.get(type);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error en el manejador de "${type}":`, err);
      }
    }
  }
}
