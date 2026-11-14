/**
 * Lógica del sistema de diálogos (sin dibujo; ver ui/DialogBox.js).
 *
 * Una conversación es una lista de líneas. Cada línea puede ser un texto
 * simple o un objeto { speaker, text }. Texto con efecto de máquina de escribir:
 * advance() primero completa la línea y, si ya está completa, pasa a la siguiente.
 *
 * Extensión prevista: opciones de respuesta y condiciones por línea.
 */
export class Dialogue {
  constructor({ charsPerSecond = 48 } = {}) {
    this.charsPerSecond = charsPerSecond;
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.chars = 0;
    this.time = 0;
    this._onEnd = null;
  }

  start(lines, { onEnd = null } = {}) {
    const list = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'string' ? { text: l } : l));
    if (!list.length) return false;
    this.lines = list;
    this.index = 0;
    this.chars = 0;
    this.time = 0;
    this.active = true;
    this._onEnd = onEnd;
    return true;
  }

  get line() {
    return this.active ? this.lines[this.index] : null;
  }

  get visibleChars() {
    return Math.floor(this.chars);
  }

  get complete() {
    return !this.active || this.chars >= this.line.text.length;
  }

  update(dt) {
    if (!this.active) return;
    this.time += dt;
    if (!this.complete) this.chars += this.charsPerSecond * dt;
  }

  /** @returns {'skipped'|'next'|'ended'|null} */
  advance() {
    if (!this.active) return null;
    if (!this.complete) {
      this.chars = this.line.text.length;
      return 'skipped';
    }
    this.index++;
    this.chars = 0;
    if (this.index >= this.lines.length) {
      this.end();
      return 'ended';
    }
    return 'next';
  }

  end() {
    this.active = false;
    this.lines = [];
    const cb = this._onEnd;
    this._onEnd = null;
    cb?.();
  }
}
