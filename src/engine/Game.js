import { CONFIG } from '../config/config.js';
import { THEME } from '../config/theme.js';
import { EventBus } from './EventBus.js';
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { Loop } from './Loop.js';
import { SceneManager } from './SceneManager.js';
import { AssetLoader } from './AssetLoader.js';
import { Orientation } from './Orientation.js';
import { readSafeInsets } from './SafeArea.js';
import { AudioManager } from '../audio/AudioManager.js';
import { SaveManager } from '../save/SaveManager.js';
import { createStorage } from '../save/storage.js';
import { LevelManager } from '../levels/LevelManager.js';
import { FullscreenButton } from '../ui/FullscreenButton.js';
import { legibleSize } from '../ui/draw.js';

/**
 * Núcleo del juego: crea y conecta los sistemas. Las escenas acceden a todo a
 * través de `this.game` (renderer, input, audio, saves, levels, scenes, events…).
 *
 * `boot()` prepara todo SIN arrancar el bucle (lo usan las pruebas automáticas);
 * `start()` = boot() + bucle en marcha.
 *
 * Adaptación a la pantalla: los eventos del navegador (resize, giro, pantalla completa) solo
 * marcan el layout como "sucio". Se recalcula UNA vez, al inicio del siguiente fotograma, y solo
 * si el resultado cambia de verdad; entonces se avisa a las escenas. Con la ventana en vertical
 * el juego queda congelado y no se recalcula nada hasta volver a horizontal.
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
    this.orientation = new Orientation(win, { onChange: (blocked) => this._onOrientationChange(blocked) });
    this.fullscreenButton = new FullscreenButton(this);

    this.audio.setVolumes(this.settings);
    this.input.onGesture = () => {
      if (!this.orientation.blocked) this.audio.unlock();
      this.orientation.onFirstGesture();
    };

    this.debug = { enabled: CONFIG.debug.startEnabled, fps: 0, frames: 0, since: 0 };
    this.loop = new Loop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
      step: CONFIG.loop.step,
      maxFrameTime: CONFIG.loop.maxFrameTime,
    });

    this._layoutDirty = true;
    this._onViewportChange = () => {
      this.orientation.refresh();
      this._layoutDirty = true;
    };
  }

  boot(firstScene = 'boot') {
    this.orientation.refresh();
    this._applyLayout();
    this.input.attach(this.win, this.canvas);
    this.orientation.attach();

    const { win } = this;
    win.addEventListener?.('resize', this._onViewportChange);
    win.addEventListener?.('orientationchange', () => {
      this._onViewportChange();
      // Algunos navegadores móviles informan el tamaño nuevo con retraso tras girar.
      win.setTimeout?.(this._onViewportChange, 250);
    });
    win.visualViewport?.addEventListener?.('resize', this._onViewportChange);
    win.document?.addEventListener?.('fullscreenchange', this._onViewportChange);

    this.scenes.replace(firstScene, {}, { transition: false });
  }

  start() {
    this.boot();
    this.loop.start();
  }

  // ------------------------------------------------------------------ layout

  /** Recalcula la presentación si hace falta. Sin cambios reales no toca el DOM ni las escenas. */
  _applyLayout() {
    if (!this._layoutDirty) return;
    if (this.orientation.blocked) return; // vertical: se conserva el layout horizontal anterior
    this._layoutDirty = false;

    const { win } = this;
    const changed = this.renderer.resize(win.innerWidth, win.innerHeight, {
      dpr: win.devicePixelRatio,
      insets: readSafeInsets(win),
    });
    if (!changed) return;

    this.input.releasePointers(); // las coordenadas de los dedos apoyados ya no valen
    this.scenes.resize(this.renderer.width, this.renderer.height);
    this.events.emit('display:resized', { width: this.renderer.width, height: this.renderer.height });
  }

  _onOrientationChange(blocked) {
    if (blocked) {
      this.input.releaseAll();
      this.audio.suspend();
    } else {
      this.audio.resume();
      this._layoutDirty = true;
    }
    this.events.emit('orientation:changed', { blocked });
  }

  // ------------------------------------------------------------------- bucle

  update(dt) {
    if (this.orientation.blocked) {
      this.input.endFrame(); // en vertical el juego está congelado
      return;
    }
    if (this.input.wasPressed('debug')) this.debug.enabled = !this.debug.enabled;
    if (this.input.wasPressed('fullscreen')) this.orientation.toggleFullscreen();
    this.fullscreenButton.update(this.input);
    this.scenes.update(dt);
    this.input.endFrame();
  }

  render() {
    this._applyLayout();
    if (this.orientation.blocked) return; // la pantalla de giro es HTML; no se dibuja el canvas
    this.renderer.begin();
    const ctx = this.renderer.ctx;
    this.scenes.render(ctx);
    this.fullscreenButton.render(ctx);
    if (this.debug.enabled) this._renderDebug(ctx);
  }

  _renderDebug(ctx) {
    const { renderer, orientation } = this;
    const now = globalThis.performance?.now?.() ?? 0;
    this.debug.frames++;
    if (now - this.debug.since >= 500) {
      this.debug.fps = Math.round((this.debug.frames * 1000) / Math.max(1, now - this.debug.since));
      this.debug.frames = 0;
      this.debug.since = now;
    }
    const l = renderer.layout;
    const s = renderer.safe;
    const stack = this.scenes.stack.map((sc) => sc.name).join(' > ');
    const lines = [
      `FPS ${this.debug.fps}`,
      `Escenas: ${stack}`,
      `Guardado persistente: ${this.saves.persistent ? 'sí' : 'no'}`,
      l ? `Vista lógica ${l.width}×${l.height} · css ${l.cssW}×${l.cssH} · búfer ${l.bufW}×${l.bufH} (×${l.ratio})` : 'Vista: sin medir',
      `Área segura (lógica) I${s.left} D${s.right} A${s.top} B${s.bottom}${l?.letterboxed ? ' · con bandas' : ''}`,
      `Bloqueo de orientación: ${orientation.lockState} · pantalla completa: ${orientation.isFullscreen ? 'sí' : 'no'}`,
    ];
    const size = legibleSize(renderer, 14);
    const lineH = size + 5;
    const boxH = lines.length * lineH + 10;
    const x = renderer.safeRect.x + 8;
    const y = renderer.height - renderer.safe.bottom - boxH - 8;
    ctx.font = `${size}px ${THEME.fonts.ui}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const w = Math.max(...lines.map((t) => ctx.measureText(t).width)) + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, boxH);
    ctx.fillStyle = '#9fe6a0';
    lines.forEach((t, i) => ctx.fillText(t, x + 8, y + 6 + i * lineH));
  }
}
