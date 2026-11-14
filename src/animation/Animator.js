/**
 * Controlador de animaciones por fotogramas.
 *
 * Un "clip" es { frames: [...], fps: 8, loop: true }. Cada frame es un valor
 * libre (índice, rectángulo de una hoja de sprites, clave de imagen…): el
 * Animator solo decide CUÁL toca en cada momento; el dibujo lo hace quien lo use.
 *
 *   const anim = new Animator({
 *     idle: { frames: [0, 1], fps: 2 },
 *     walk: { frames: [2, 3, 4, 5], fps: 10 },
 *     wave: { frames: [6, 7, 8], fps: 8, loop: false },
 *   }, 'idle');
 *   anim.play('walk'); anim.update(dt); anim.frame;
 */
export class Animator {
  constructor(clips = {}, initial = null) {
    this.clips = clips;
    this.current = null;
    this.time = 0;
    if (initial) this.play(initial);
  }

  play(name, { restart = false } = {}) {
    if (!this.clips[name]) throw new Error(`Animación inexistente: "${name}"`);
    if (this.current === name && !restart) return;
    this.current = name;
    this.time = 0;
  }

  update(dt) {
    if (this.current) this.time += dt;
  }

  get clip() {
    return this.current ? this.clips[this.current] : null;
  }

  get frameIndex() {
    const clip = this.clip;
    if (!clip) return 0;
    const idx = Math.floor(this.time * clip.fps);
    return clip.loop === false ? Math.min(idx, clip.frames.length - 1) : idx % clip.frames.length;
  }

  get frame() {
    return this.clip ? this.clip.frames[this.frameIndex] : null;
  }

  /** true cuando un clip sin bucle llegó a su último fotograma. */
  get finished() {
    const clip = this.clip;
    return !!clip && clip.loop === false && this.time * clip.fps >= clip.frames.length;
  }
}
