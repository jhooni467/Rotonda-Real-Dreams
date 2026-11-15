/**
 * Orientación y pantalla completa.
 *
 * ROTONDA se juega SOLO en horizontal. Hay dos mecanismos, y el segundo es el que manda:
 *
 *  1. Bloqueo (screen.orientation.lock): "cuando el navegador y el entorno lo permitan".
 *     En la práctica solo funciona en móviles y normalmente solo en pantalla completa; Safari/iOS
 *     no lo soporta. Se intenta en el primer gesto, y de nuevo al entrar en pantalla completa.
 *     Si falla, no pasa nada: es un extra, no una dependencia.
 *  2. Detección de la forma de la ventana (la fuente de verdad). Si la ventana es más alta que
 *     ancha se muestra la pantalla de giro (HTML/CSS en index.html, con el mismo criterio
 *     `(orientation: portrait)`) y el juego se congela: sin actualizar, sin dibujar, sin audio.
 *
 * Se detecta la forma de la VENTANA y no la orientación física del aparato: así también cubre
 * el modo multiventana de Android y una ventana de escritorio demasiado estrecha.
 */
export class Orientation {
  constructor(win = globalThis, { onChange = null } = {}) {
    this.win = win;
    this.onChange = onChange;
    this.lockState = 'idle'; // 'idle' | 'unsupported' | 'locked' | 'denied'
    this._gestureTried = false;
    this._mql = null;
    this.blocked = this._computePortrait();
  }

  _computePortrait() {
    const w = this.win;
    try {
      if (typeof w.matchMedia === 'function') {
        this._mql ??= w.matchMedia('(orientation: portrait)');
        if (this._mql) return !!this._mql.matches;
      }
    } catch {
      /* sin matchMedia: se compara el tamaño */
    }
    return (w.innerHeight ?? 0) > (w.innerWidth ?? 1);
  }

  /** true mientras la ventana está en vertical y el juego debe quedar en pausa. */
  get portrait() {
    return this.blocked;
  }

  /** Pantalla táctil como puntero principal (teléfonos/tablets). */
  get coarsePointer() {
    try {
      return !!this.win.matchMedia?.('(pointer: coarse)')?.matches;
    } catch {
      return false;
    }
  }

  /** Reevalúa la orientación; avisa si cambió. */
  refresh() {
    const portrait = this._computePortrait();
    if (portrait !== this.blocked) {
      this.blocked = portrait;
      this.onChange?.(portrait);
    }
    return portrait;
  }

  /** Conecta los eventos del navegador que pueden cambiar la orientación. */
  attach() {
    const w = this.win;
    const refresh = () => this.refresh();
    w.addEventListener?.('orientationchange', refresh);
    try {
      this._mql?.addEventListener?.('change', refresh);
    } catch {
      /* navegadores antiguos: basta con resize/orientationchange */
    }
    w.screen?.orientation?.addEventListener?.('change', refresh);

    const onFs = () => this._onFullscreenChange();
    w.document?.addEventListener?.('fullscreenchange', onFs);
    w.document?.addEventListener?.('webkitfullscreenchange', onFs);
  }

  // ------------------------------------------------------------------- bloqueo

  /** Primer gesto del usuario: único intento "gratuito" de bloqueo, solo en táctiles. */
  onFirstGesture() {
    if (this._gestureTried) return;
    this._gestureTried = true;
    if (this.coarsePointer) this.tryLock();
  }

  /** @returns {Promise<'unsupported'|'locked'|'denied'>} */
  async tryLock() {
    const so = this.win.screen?.orientation;
    if (!so || typeof so.lock !== 'function') return (this.lockState = 'unsupported');
    try {
      await so.lock('landscape');
      this.lockState = 'locked';
    } catch {
      // NotSupportedError / SecurityError son lo normal fuera de pantalla completa.
      this.lockState = 'denied';
    }
    return this.lockState;
  }

  unlock() {
    if (this.lockState !== 'locked') return;
    try {
      this.win.screen?.orientation?.unlock?.();
    } catch {
      /* nada que hacer */
    }
    this.lockState = 'idle';
  }

  // ------------------------------------------------------------ pantalla completa

  get _doc() {
    return this.win.document;
  }

  get fullscreenSupported() {
    const d = this._doc;
    const root = d?.documentElement;
    if (!d || !root) return false;
    const enabled = d.fullscreenEnabled ?? d.webkitFullscreenEnabled;
    return !!enabled && typeof (root.requestFullscreen ?? root.webkitRequestFullscreen) === 'function';
  }

  get isFullscreen() {
    const d = this._doc;
    return !!(d?.fullscreenElement ?? d?.webkitFullscreenElement);
  }

  /** Entra o sale de pantalla completa. Debe llamarse a raíz de un gesto del usuario. */
  async toggleFullscreen() {
    const d = this._doc;
    if (!this.fullscreenSupported) return false;
    try {
      if (this.isFullscreen) {
        await (d.exitFullscreen ?? d.webkitExitFullscreen).call(d);
      } else {
        const root = d.documentElement;
        await (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root);
      }
      return true;
    } catch {
      return false; // el navegador la denegó: se ignora
    }
  }

  _onFullscreenChange() {
    if (this.isFullscreen) this.tryLock(); // aquí es cuando el bloqueo suele estar permitido
    else this.unlock();
  }
}
