const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Cámara 2D con seguimiento suave, zoom suave y límites del mundo.
 *
 * (x, y) es el punto del MUNDO que queda en el centro de la pantalla.
 *
 * Uso típico en una escena:
 *   ctx.save(); camera.apply(ctx); ...dibujo en coordenadas de mundo...; ctx.restore();
 */
export class Camera {
  constructor({ viewW, viewH, followSpeed, zoomSpeed, minZoom, maxZoom, zoom = 1, bounds = null }) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.followSpeed = followSpeed;
    this.zoomSpeed = zoomSpeed;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.bounds = bounds; // {x, y, w, h} del mundo, o null
    this.x = 0;
    this.y = 0;
    this.zoom = clamp(zoom, minZoom, maxZoom);
    this.targetZoom = this.zoom;
    this.target = null; // cualquier objeto con cx y cy
  }

  follow(target) {
    this.target = target;
  }

  setBounds(bounds) {
    this.bounds = bounds;
    this._clamp();
  }

  /**
   * Adapta la cámara a un nuevo tamaño de vista (cambio de proporción o de orientación).
   * No altera la posición ni el zoom: solo cambia cuánto escenario cabe en pantalla.
   */
  resize(viewW, viewH) {
    if (viewW === this.viewW && viewH === this.viewH) return;
    this.viewW = viewW;
    this.viewH = viewH;
    this._clamp();
  }

  setZoom(z, immediate = false) {
    this.targetZoom = clamp(z, this.minZoom, this.maxZoom);
    if (immediate) this.zoom = this.targetZoom;
  }

  zoomBy(factor) {
    this.setZoom(this.targetZoom * factor);
  }

  /** Coloca la cámara sobre el objetivo sin animación (al cargar un nivel). */
  snap() {
    if (this.target) {
      this.x = this.target.cx;
      this.y = this.target.cy;
    }
    this._clamp();
  }

  update(dt) {
    // Suavizado exponencial: independiente de la tasa de fotogramas.
    const kz = 1 - Math.exp(-this.zoomSpeed * dt);
    this.zoom += (this.targetZoom - this.zoom) * kz;
    if (Math.abs(this.targetZoom - this.zoom) < 0.0005) this.zoom = this.targetZoom;

    if (this.target) {
      const k = 1 - Math.exp(-this.followSpeed * dt);
      this.x += (this.target.cx - this.x) * k;
      this.y += (this.target.cy - this.y) * k;
    }
    this._clamp();
  }

  _clamp() {
    if (!this.bounds) return;
    const halfW = this.viewW / (2 * this.zoom);
    const halfH = this.viewH / (2 * this.zoom);
    const b = this.bounds;
    // Si el mundo es más pequeño que la vista, se centra.
    this.x = b.w <= halfW * 2 ? b.x + b.w / 2 : clamp(this.x, b.x + halfW, b.x + b.w - halfW);
    this.y = b.h <= halfH * 2 ? b.y + b.h / 2 : clamp(this.y, b.y + halfH, b.y + b.h - halfH);
  }

  /** Aplica la transformación de cámara al contexto. */
  apply(ctx) {
    ctx.translate(this.viewW / 2, this.viewH / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  /** Rectángulo del mundo que se ve ahora (útil para no dibujar lo que está fuera). */
  viewRect() {
    const w = this.viewW / this.zoom;
    const h = this.viewH / this.zoom;
    return { x: this.x - w / 2, y: this.y - h / 2, w, h };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.viewW / 2,
      y: (wy - this.y) * this.zoom + this.viewH / 2,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.viewW / 2) / this.zoom + this.x,
      y: (sy - this.viewH / 2) / this.zoom + this.y,
    };
  }
}
