import { CONFIG } from '../config/config.js';
import { THEME } from '../config/theme.js';
import { EventBus } from './EventBus.js';
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { Loop } from './Loop.js';
import { SceneManager } from './SceneManager.js';
import { AssetLoader } from './AssetLoader.js';
import { AudioManager } from '../audio/AudioManager.js';
import { SaveManager } from '../save/SaveManager.js';
import { createStorage } from '../save/storage.js';
import { LevelManager } from '../levels/LevelManager.js';

/**
 * Núcleo del juego: crea y conecta los sistemas. Las escenas acceden a todo a
 * través de `this.game` (renderer, input, audio, saves, levels, scenes, events…).
 *
 * `boot()` prepara todo SIN arrancar el bucle (lo usan las pruebas automáticas);
 * `start()` = boot() + bucle en marcha.
 */
export class Game {
  constructor({ canvas, win = globalThis, storage = null }) {
    this.win = win;
    this.canvas = canvas;
    this.config = CONFIG;

    this.events = new EventBus();
    this.renderer = new Renderer(canvas, CONFIG.render);
    this.input = new Input(this.renderer);
    this.audio = new AudioManager();
    this.assets = new AssetLoader({ audio: this.audio });
    this.saves = new SaveManager(storage ?? createStorage(win));
    this.settings = this.saves.loadSettings();
    this.levels = new LevelManager();
    this.scenes = new SceneManager(this);

    this.audio.setVolumes(this.settings);
    this.input.onGesture = () => this.audio.unlock();

    this.debug = { enabled: CONFIG.debug.startEnabled, fps: 0, frames: 0, since: 0 };
    this.loop = new Loop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
      step: CONFIG.loop.step,
      maxFrameTime: CONFIG.loop.maxFrameTime,
    });

    this._onResize = () => this.renderer.resize(this.win.innerWidth, this.win.innerHeight);
  }

  boot(firstScene = 'boot') {
    this.renderer.resize(this.win.innerWidth, this.win.innerHeight);
    this.input.attach(this.win, this.canvas);
    this.win.addEventListener?.('resize', this._onResize);
    this.win.addEventListener?.('orientationchange', this._onResize);
    this.scenes.replace(firstScene, {}, { transition: false });
  }

  start() {
    this.boot();
    this.loop.start();
  }

  update(dt) {
    if (this.input.wasPressed('debug')) this.debug.enabled = !this.debug.enabled;
    this.scenes.update(dt);
    this.input.endFrame();
  }

  render() {
    this.renderer.begin();
    const ctx = this.renderer.ctx;
    this.scenes.render(ctx);
    if (this.debug.enabled) this._renderDebug(ctx);
  }

  _renderDebug(ctx) {
    const now = globalThis.performance?.now?.() ?? 0;
    this.debug.frames++;
    if (now - this.debug.since >= 500) {
      this.debug.fps = Math.round((this.debug.frames * 1000) / Math.max(1, now - this.debug.since));
      this.debug.frames = 0;
      this.debug.since = now;
    }
    const stack = this.scenes.stack.map((s) => s.name).join(' > ');
    const lines = [`FPS ${this.debug.fps}`, `Escenas: ${stack}`, `Guardado persistente: ${this.saves.persistent ? 'sí' : 'no'}`];
    ctx.font = `14px ${THEME.fonts.ui}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, this.renderer.height - 72, 330, 64);
    ctx.fillStyle = '#9fe6a0';
    lines.forEach((l, i) => ctx.fillText(l, 16, this.renderer.height - 66 + i * 18));
  }
}
