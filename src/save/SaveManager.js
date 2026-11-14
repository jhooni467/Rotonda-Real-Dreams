import { CONFIG } from '../config/config.js';
import { DEFAULT_SETTINGS, migrate } from './schema.js';

/**
 * Guardado y carga de partidas en varios espacios (slots 1…N) y de los ajustes.
 *
 * Principios:
 *  - Nunca se borra ni sobrescribe un guardado ilegible sin que el jugador lo decida:
 *    readSlot() informa el estado ('empty' | 'ok' | 'corrupt' | 'newer') y no toca los datos.
 *  - write() verifica leyendo de vuelta, para detectar almacenamiento lleno o bloqueado.
 */
export class SaveManager {
  constructor(storage, { slots = CONFIG.save.slots, keyPrefix = CONFIG.save.keyPrefix, settingsKey = CONFIG.save.settingsKey } = {}) {
    this.storage = storage;
    this.slots = slots;
    this.keyPrefix = keyPrefix;
    this.settingsKey = settingsKey;
  }

  get persistent() {
    return this.storage.persistent !== false;
  }

  slotKey(slot) {
    return `${this.keyPrefix}${slot}`;
  }

  /** @returns {{status:'empty'}|{status:'ok',data:object}|{status:'corrupt'}|{status:'newer'}} */
  readSlot(slot) {
    let text;
    try {
      text = this.storage.getItem(this.slotKey(slot));
    } catch {
      return { status: 'corrupt' };
    }
    if (text === null || text === undefined) return { status: 'empty' };
    try {
      return migrate(JSON.parse(text));
    } catch {
      return { status: 'corrupt' };
    }
  }

  /** Resumen de todos los espacios, pensado para dibujar la pantalla de partidas. */
  listSlots() {
    return Array.from({ length: this.slots }, (_, i) => {
      const slot = i + 1;
      return { slot, ...this.readSlot(slot) };
    });
  }

  /** Guarda y verifica. Devuelve true si el dato quedó realmente escrito. */
  write(slot, data) {
    try {
      const payload = JSON.stringify({ ...data, slot, updatedAt: Date.now() });
      const key = this.slotKey(slot);
      this.storage.setItem(key, payload);
      return this.storage.getItem(key) === payload;
    } catch (err) {
      console.warn('[SaveManager] No se pudo guardar:', err.message);
      return false;
    }
  }

  delete(slot) {
    try {
      this.storage.removeItem(this.slotKey(slot));
      return true;
    } catch {
      return false;
    }
  }

  hasAnySave() {
    return this.listSlots().some((s) => s.status === 'ok');
  }

  /** Número del espacio válido guardado más recientemente, o null. */
  latestSlot() {
    let best = null;
    for (const s of this.listSlots()) {
      if (s.status === 'ok' && (!best || s.data.updatedAt > best.data.updatedAt)) best = s;
    }
    return best ? best.slot : null;
  }

  loadSettings() {
    try {
      const text = this.storage.getItem(this.settingsKey);
      if (text) return { ...DEFAULT_SETTINGS, ...JSON.parse(text) };
    } catch {
      /* ajustes ilegibles: se usan los de fábrica */
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(settings) {
    try {
      this.storage.setItem(this.settingsKey, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }
}
