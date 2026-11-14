import { KEY_BINDINGS } from '../config/controls.js';

const BOUND_CODES = new Set(Object.values(KEY_BINDINGS).flat());

/**
 * Entrada unificada: teclado, ratón, táctil y controles virtuales.
 *
 * El juego NO pregunta por teclas sino por ACCIONES ("interact", "up"…):
 *   input.isDown('up')          → la acción está sostenida
 *   input.wasPressed('interact')→ se activó en este paso de simulación
 *   input.getAxis()             → vector de movimiento {x, y} de longitud ≤ 1
 *
 * Los controles táctiles (ui/TouchControls) inyectan acciones virtuales con
 * setVirtual / setVirtualAxis, así el resto del código no distingue el origen.
 *
 * Los métodos handle* son públicos para poder simular entrada en las pruebas.
 */
export class Input {
  constructor(renderer) {
    this.renderer = renderer;

    this._down = new Set();
    this._pressed = new Set();
    this._virtualDown = new Set();
    this._virtualPressed = new Set();
    this._virtualAxis = { x: 0, y: 0 };

    this.pointers = new Map(); // punteros actualmente pulsados: id → {id,x,y,type}
    this.taps = []; // pulsaciones nuevas de este paso: {id,x,y,type,consumed}
    this.pointerPos = { x: -1, y: -1, type: 'mouse' }; // última posición conocida
    this.usedTouch = false; // true tras el primer toque real
    this.wheel = 0; // rueda del ratón acumulada en este paso

    this.onGesture = null; // se invoca con cualquier gesto del usuario (desbloqueo de audio)
    this._listeners = [];
  }

  // ---------------------------------------------------------------- conexión

  attach(win, canvas) {
    const add = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts);
      this._listeners.push([target, type, fn, opts]);
    };

    add(win, 'keydown', (e) => this.handleKeyDown(e.code, e));
    add(win, 'keyup', (e) => this.handleKeyUp(e.code));
    add(win, 'blur', () => this.releaseAll());

    add(canvas, 'pointerdown', (e) => {
      try {
        canvas.setPointerCapture?.(e.pointerId);
      } catch {
        /* no crítico */
      }
      this.handlePointerDown(e.pointerId, e.clientX, e.clientY, e.pointerType);
    });
    add(canvas, 'pointermove', (e) => this.handlePointerMove(e.pointerId, e.clientX, e.clientY, e.pointerType));
    add(canvas, 'pointerup', (e) => this.handlePointerUp(e.pointerId));
    add(canvas, 'pointercancel', (e) => this.handlePointerUp(e.pointerId));
    add(canvas, 'wheel', (e) => {
      e.preventDefault?.();
      this.wheel += e.deltaY;
    }, { passive: false });
    add(canvas, 'contextmenu', (e) => e.preventDefault?.());
  }

  detach() {
    for (const [target, type, fn, opts] of this._listeners) target.removeEventListener(type, fn, opts);
    this._listeners = [];
  }

  // ------------------------------------------------------------------ eventos

  handleKeyDown(code, event) {
    if (BOUND_CODES.has(code)) event?.preventDefault?.(); // evita que las flechas/espacio desplacen la página
    if (!this._down.has(code)) {
      this._down.add(code);
      this._pressed.add(code);
    }
    this.onGesture?.();
  }

  handleKeyUp(code) {
    this._down.delete(code);
  }

  handlePointerDown(id, clientX, clientY, type = 'mouse') {
    const p = this.renderer.toLogical(clientX, clientY);
    this.pointers.set(id, { id, x: p.x, y: p.y, type });
    this.taps.push({ id, x: p.x, y: p.y, type, consumed: false });
    this.pointerPos = { x: p.x, y: p.y, type };
    if (type === 'touch' || type === 'pen') this.usedTouch = true;
    this.onGesture?.();
  }

  handlePointerMove(id, clientX, clientY, type = 'mouse') {
    const p = this.renderer.toLogical(clientX, clientY);
    this.pointerPos = { x: p.x, y: p.y, type };
    const ptr = this.pointers.get(id);
    if (ptr) {
      ptr.x = p.x;
      ptr.y = p.y;
    }
  }

  handlePointerUp(id) {
    this.pointers.delete(id);
  }

  /** Suelta todo (p. ej. al perder el foco de la ventana) para evitar teclas "pegadas". */
  releaseAll() {
    this._down.clear();
    this.pointers.clear();
  }

  // ------------------------------------------------------- controles virtuales

  setVirtual(action, down) {
    const was = this._virtualDown.has(action);
    if (down && !was) {
      this._virtualDown.add(action);
      this._virtualPressed.add(action);
    } else if (!down && was) {
      this._virtualDown.delete(action);
    }
  }

  setVirtualAxis(x, y) {
    this._virtualAxis.x = x;
    this._virtualAxis.y = y;
  }

  // ----------------------------------------------------------------- consulta

  isDown(action) {
    if (this._virtualDown.has(action)) return true;
    return (KEY_BINDINGS[action] ?? []).some((code) => this._down.has(code));
  }

  wasPressed(action) {
    if (this._virtualPressed.has(action)) return true;
    return (KEY_BINDINGS[action] ?? []).some((code) => this._pressed.has(code));
  }

  /** Vector de movimiento combinado (teclado + stick virtual), de longitud ≤ 1. */
  getAxis() {
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0) + this._virtualAxis.x;
    let y = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0) + this._virtualAxis.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /** Pulsaciones de este paso que nadie ha consumido todavía. */
  getTaps() {
    return this.taps.filter((t) => !t.consumed);
  }

  /** Se llama una vez por paso de simulación, al final. */
  endFrame() {
    this._pressed.clear();
    this._virtualPressed.clear();
    this.taps.length = 0;
    this.wheel = 0;
  }
}
