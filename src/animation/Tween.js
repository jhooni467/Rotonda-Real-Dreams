import { easings } from './easing.js';

/**
 * Interpolación de un valor numérico en el tiempo.
 *
 *   tweens.add({ from: 0, to: 1, duration: 0.5, ease: 'easeOutQuad',
 *                onUpdate: (v) => (sprite.alpha = v), onComplete: () => {...} });
 */
export class Tween {
  constructor({ from = 0, to = 1, duration = 1, ease = 'linear', onUpdate = null, onComplete = null }) {
    this.from = from;
    this.to = to;
    this.duration = Math.max(0.0001, duration);
    this.ease = easings[ease] ?? easings.linear;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.t = 0;
    this.done = false;
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    const k = Math.min(1, this.t / this.duration);
    this.onUpdate?.(this.from + (this.to - this.from) * this.ease(k));
    if (k >= 1) {
      this.done = true;
      this.onComplete?.();
    }
  }
}

/** Conjunto de tweens activos; una escena crea uno y lo actualiza en su update(). */
export class TweenManager {
  constructor() {
    this.list = [];
  }

  add(options) {
    const tween = new Tween(options);
    this.list.push(tween);
    return tween;
  }

  update(dt) {
    for (const tween of this.list) tween.update(dt);
    this.list = this.list.filter((t) => !t.done);
  }

  clear() {
    this.list.length = 0;
  }
}
