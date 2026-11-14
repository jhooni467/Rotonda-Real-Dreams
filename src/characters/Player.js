import { Entity } from './Entity.js';
import { CONFIG } from '../config/config.js';

/**
 * Personaje jugable: el niño con apariencia de peluche.
 *
 * En la Etapa 00 su aspecto es un DIBUJO PROVISIONAL hecho con formas simples,
 * solo para ver movimiento, colisiones y cámara. NO es el diseño del personaje.
 * Cuando exista el arte real, se sustituye render() por sprites + Animator.
 */
export class Player extends Entity {
  constructor(opts = {}) {
    super({ w: 44, h: 56, ...opts });
    this.speed = CONFIG.player.speed;
    this.facing = 1; // 1 derecha, -1 izquierda
    this.moving = false;
    this.clock = 0;
  }

  /** @param ctx {{ input, level, canMove }} */
  update(dt, { input, level, canMove = true }) {
    this.clock += dt;
    const axis = canMove ? input.getAxis() : { x: 0, y: 0 };
    this.moving = Math.hypot(axis.x, axis.y) > 0.05;
    if (!this.moving) return;
    if (axis.x > 0.05) this.facing = 1;
    else if (axis.x < -0.05) this.facing = -1;
    level.moveEntity(this, axis.x * this.speed * dt, axis.y * this.speed * dt);
  }

  // --- DIBUJO PROVISIONAL (sustituir por arte definitivo) ---
  render(ctx) {
    const bob = this.moving ? Math.sin(this.clock * 14) * 2.5 : Math.sin(this.clock * 2) * 1;
    const cx = this.cx;
    const top = this.y + bob;

    ctx.fillStyle = 'rgba(0,0,0,0.25)'; // sombra
    ctx.beginPath();
    ctx.ellipse(cx, this.y + this.h - 2, this.w * 0.6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d7b79a'; // orejas
    ctx.beginPath();
    ctx.arc(cx - 15, top + 6, 8, 0, Math.PI * 2);
    ctx.arc(cx + 15, top + 6, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e6c8ac'; // cuerpo
    ctx.beginPath();
    ctx.ellipse(cx, top + this.h / 2 + 4, this.w / 2, this.h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2b2233'; // ojos
    const eyeShift = this.facing * 3;
    ctx.beginPath();
    ctx.arc(cx - 8 + eyeShift, top + 22, 3, 0, Math.PI * 2);
    ctx.arc(cx + 8 + eyeShift, top + 22, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
