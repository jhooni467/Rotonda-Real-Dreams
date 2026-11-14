/**
 * Audio con Web Audio API (sin librerías).
 *
 * Los navegadores no permiten sonido hasta que el usuario interactúa, así que el
 * contexto se crea en unlock(), que Game llama con el primer gesto (tecla/toque).
 * Si no hay AudioContext o no hay recursos, todo es silencioso y nada falla.
 *
 * Canales: master → music / sfx.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.volumes = { master: 0.8, music: 0.7, sfx: 0.9 };
    this.sources = new Map(); // clave → url (registrados por AssetLoader)
    this.buffers = new Map(); // clave → AudioBuffer (decodificados bajo demanda)
    this._music = null; // { key, source, gain }
  }

  unlock() {
    if (this.unlocked) return;
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.unlocked = true;
      this._applyVolumes();
    } catch (err) {
      console.warn('[Audio] No se pudo iniciar el audio:', err.message);
    }
  }

  setVolumes({ masterVolume, musicVolume, sfxVolume }) {
    if (masterVolume !== undefined) this.volumes.master = masterVolume;
    if (musicVolume !== undefined) this.volumes.music = musicVolume;
    if (sfxVolume !== undefined) this.volumes.sfx = sfxVolume;
    this._applyVolumes();
  }

  _applyVolumes() {
    if (!this.unlocked) return;
    this.master.gain.value = this.volumes.master;
    this.musicGain.gain.value = this.volumes.music;
    this.sfxGain.gain.value = this.volumes.sfx;
  }

  /** Registra un archivo de audio; se descarga y decodifica la primera vez que se usa. */
  async registerSource(key, url) {
    this.sources.set(key, url);
  }

  async _buffer(key) {
    if (this.buffers.has(key)) return this.buffers.get(key);
    const url = this.sources.get(key);
    if (!url || !this.unlocked) return null;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`audio "${key}" (${url}) → HTTP ${res.status}`);
    const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
    this.buffers.set(key, buf);
    return buf;
  }

  async playSfx(key, { volume = 1 } = {}) {
    try {
      const buf = await this._buffer(key);
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.buffer = buf;
      src.connect(gain).connect(this.sfxGain);
      src.start();
    } catch (err) {
      console.warn('[Audio]', err.message);
    }
  }

  async playMusic(key, { loop = true, fade = 1 } = {}) {
    if (this._music?.key === key) return;
    this.stopMusic(fade);
    try {
      const buf = await this._buffer(key);
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + fade);
      src.buffer = buf;
      src.loop = loop;
      src.connect(gain).connect(this.musicGain);
      src.start();
      this._music = { key, src, gain };
    } catch (err) {
      console.warn('[Audio]', err.message);
    }
  }

  stopMusic(fade = 1) {
    const m = this._music;
    if (!m) return;
    this._music = null;
    const now = this.ctx.currentTime;
    m.gain.gain.cancelScheduledValues(now);
    m.gain.gain.setValueAtTime(m.gain.gain.value, now);
    m.gain.gain.linearRampToValueAtTime(0, now + fade);
    m.src.stop(now + fade + 0.05);
  }

  /** Pitido breve PROVISIONAL para dar respuesta a los menús mientras no hay efectos reales. */
  blip(freq = 520, duration = 0.05, volume = 0.12) {
    if (!this.unlocked) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      /* el audio nunca debe romper el juego */
    }
  }
}
