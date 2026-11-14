/**
 * Transición de pantalla (fundido a color).
 *
 * Fase "out": la pantalla se oscurece. Al terminar se ejecuta onMid (aquí el
 * SceneManager cambia de escena sin que se vea el salto). Fase "in": se aclara.
 *
 * Es el punto de extensión para transiciones con identidad propia por nivel
 * (manchas de tinta, papel rasgado…): basta con cambiar render().
 */
export class Transition {
  constructor() {
    this.state = 'idle'; // 'idle' | 'out' | 'in'
    this.t = 0;
    this.duration = 0.35;
    this.color = '#0b0910';
    this._onMid = null;
    this._onDone = null;
  }

  get active() {
    return this.state !== 'idle';
  }

  /** Mientras se oscurece, la escena no recibe actualizaciones. */
  get blocksInput() {
    return this.state === 'out';
  }

  get alpha() {
    const k = Math.min(1, this.t / this.duration);
    if (this.state === 'out') return k;
    if (this.state === 'in') return 1 - k;
    return 0;
  }

  start({ duration = 0.35, color = '#0b0910', onMid = null, onDone = null } = {}) {
    if (this.active) return false;
    this.state = 'out';
    this.t = 0;
    this.duration = Math.max(0.01, duration);
    this.color = color;
    this._onMid = onMid;
    this._onDone = onDone;
    return true;
  }

  update(dt) {
    if (this.state === 'idle') return;
    this.t += dt;
    if (this.t < this.duration) return;

    if (this.state === 'out') {
      // El estado cambia ANTES de llamar a onMid: si onMid falla, la transición no se queda atascada.
      this.state = 'in';
      this.t = 0;
      const cb = this._onMid;
      this._onMid = null;
      cb?.();
    } else {
      this.state = 'idle';
      const cb = this._onDone;
      this._onDone = null;
      cb?.();
    }
  }

  render(ctx, w, h) {
    if (!this.active) return;
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}
