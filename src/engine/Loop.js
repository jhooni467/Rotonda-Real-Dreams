/**
 * Bucle principal con paso fijo.
 *
 * La lógica se actualiza siempre en pasos iguales (por defecto 1/60 s), sin
 * importar la tasa de refresco del monitor. Así el movimiento y las colisiones
 * se comportan igual en un PC a 144 Hz y en un Android a 60 Hz.
 * El dibujo se hace una vez por fotograma del navegador.
 */
export class Loop {
  constructor({ update, render, step, maxFrameTime, raf }) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.maxFrameTime = maxFrameTime;
    this.raf = raf ?? ((cb) => globalThis.requestAnimationFrame(cb));
    this.running = false;
    this._last = null;
    this._acc = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = null;
    this._acc = 0;
    this.raf(this._tick);
  }

  stop() {
    this.running = false;
  }

  _tick(now) {
    if (!this.running) return;

    if (this._last === null) this._last = now;
    // Tope: si la pestaña estuvo en segundo plano no se "recupera" todo el tiempo perdido.
    const frame = Math.min((now - this._last) / 1000, this.maxFrameTime);
    this._last = now;
    this._acc += frame;

    while (this._acc >= this.step) {
      this.update(this.step);
      this._acc -= this.step;
    }

    this.render();
    this.raf(this._tick);
  }
}
