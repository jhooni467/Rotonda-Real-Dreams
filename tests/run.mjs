#!/usr/bin/env node
/**
 * Pruebas automáticas de ROTONDA (sin dependencias, solo Node ≥ 18).
 *   - Unitarias: cámara, diálogos, guardado, colisiones, animación, registro de niveles.
 *   - Integración: arranca el juego real con un canvas simulado y recorre
 *     menú → nueva partida → mover → interactuar → diálogo → zoom → guardar → continuar.
 */
import assert from 'node:assert/strict';
import { Camera } from '../src/engine/Camera.js';
import { Dialogue } from '../src/engine/systems/Dialogue.js';
import { SaveManager } from '../src/save/SaveManager.js';
import { createMemoryStorage } from '../src/save/storage.js';
import { createEmptySave, SAVE_VERSION } from '../src/save/schema.js';
import { Animator } from '../src/animation/Animator.js';
import { TweenManager } from '../src/animation/Tween.js';
import { LevelManager } from '../src/levels/LevelManager.js';
import { registerAllLevels } from '../src/levels/index.js';
import { Level } from '../src/levels/Level.js';
import { Entity } from '../src/characters/Entity.js';
import { Game } from '../src/engine/Game.js';
import { registerScenes } from '../src/scenes/index.js';
import { CONFIG } from '../src/config/config.js';
import { createMockEnv } from './helpers/mockEnv.mjs';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ------------------------------------------------------------------ unitarias

test('Cámara: seguimiento, límites del mundo y zoom', () => {
  const cam = new Camera({ ...CONFIG.camera, viewW: 1280, viewH: 720, bounds: { x: 0, y: 0, w: 2400, h: 1350 } });
  cam.follow({ cx: 0, cy: 0 });
  cam.snap();
  assert.equal(cam.x, 640, 'no debe salirse por la izquierda');
  assert.equal(cam.y, 360, 'no debe salirse por arriba');

  cam.follow({ cx: 5000, cy: 5000 });
  cam.snap();
  assert.equal(cam.x, 2400 - 640);
  assert.equal(cam.y, 1350 - 360);

  cam.setZoom(99);
  assert.equal(cam.targetZoom, CONFIG.camera.maxZoom, 'el zoom se limita al máximo');
  cam.setZoom(0.01);
  assert.equal(cam.targetZoom, CONFIG.camera.minZoom, 'el zoom se limita al mínimo');

  cam.setZoom(2, true);
  const s = cam.worldToScreen(1234, 567);
  const w = cam.screenToWorld(s.x, s.y);
  assert.ok(Math.abs(w.x - 1234) < 1e-6 && Math.abs(w.y - 567) < 1e-6, 'worldToScreen y screenToWorld son inversas');
});

test('Cámara: si el mundo es menor que la vista, se centra', () => {
  const cam = new Camera({ ...CONFIG.camera, viewW: 1280, viewH: 720, bounds: { x: 0, y: 0, w: 600, h: 400 } });
  cam.follow({ cx: 10, cy: 10 });
  cam.snap();
  assert.equal(cam.x, 300);
  assert.equal(cam.y, 200);
});

test('Diálogo: máquina de escribir, completar y avanzar', () => {
  const d = new Dialogue({ charsPerSecond: 10 });
  let ended = false;
  assert.equal(d.start(['Hola', { speaker: 'X', text: 'Adiós' }], { onEnd: () => (ended = true) }), true);
  d.update(0.2);
  assert.equal(d.visibleChars, 2);
  assert.equal(d.advance(), 'skipped');
  assert.ok(d.complete);
  assert.equal(d.advance(), 'next');
  assert.equal(d.line.speaker, 'X');
  d.advance(); // completar
  assert.equal(d.advance(), 'ended');
  assert.ok(ended && !d.active);
  assert.equal(d.start([]), false, 'una lista vacía no inicia diálogo');
});

test('Guardado: escritura, lectura, espacios múltiples y último guardado', () => {
  const saves = new SaveManager(createMemoryStorage());
  assert.equal(saves.hasAnySave(), false);
  assert.equal(saves.readSlot(1).status, 'empty');

  const a = createEmptySave({ slot: 1, levelId: 'dev_test_room' });
  assert.equal(saves.write(1, a), true);
  assert.equal(saves.readSlot(1).status, 'ok');
  assert.equal(saves.readSlot(1).data.version, SAVE_VERSION);
  assert.equal(saves.latestSlot(), 1);

  const t0 = Date.now();
  while (Date.now() === t0); // garantiza una marca de tiempo distinta (los guardados se ordenan por fecha)
  const b = { ...createEmptySave({ slot: 3, levelId: 'dev_test_room' }), playtimeMs: 5000 };
  saves.write(3, b);
  assert.equal(saves.listSlots().length, CONFIG.save.slots);
  assert.equal(saves.latestSlot(), 3, 'el más reciente gana');

  saves.delete(3);
  assert.equal(saves.readSlot(3).status, 'empty');
});

test('Guardado: datos corruptos o de versión futura NO se borran ni rompen nada', () => {
  const storage = createMemoryStorage();
  const saves = new SaveManager(storage);
  storage.setItem(saves.slotKey(1), '{no es json');
  storage.setItem(saves.slotKey(2), JSON.stringify({ version: 999, levelId: 'x' }));
  storage.setItem(saves.slotKey(3), JSON.stringify({ version: 1, levelId: 5 }));

  assert.equal(saves.readSlot(1).status, 'corrupt');
  assert.equal(saves.readSlot(2).status, 'newer');
  assert.equal(saves.readSlot(3).status, 'corrupt');
  assert.equal(storage.getItem(saves.slotKey(1)), '{no es json', 'el dato original sigue intacto');
  assert.equal(saves.hasAnySave(), false);
});

test('Guardado: ajustes con valores por defecto y persistencia', () => {
  const saves = new SaveManager(createMemoryStorage());
  assert.equal(saves.loadSettings().touchControls, 'auto');
  saves.saveSettings({ ...saves.loadSettings(), masterVolume: 0.3 });
  assert.equal(saves.loadSettings().masterVolume, 0.3);
});

test('Guardado: si el almacenamiento falla, write() devuelve false sin lanzar', () => {
  const broken = { persistent: true, getItem: () => null, setItem: () => { throw new Error('cuota'); }, removeItem() {} };
  assert.equal(new SaveManager(broken).write(1, createEmptySave({ slot: 1, levelId: 'a' })), false);
});

test('Niveles: registro, validación y creación', () => {
  const lm = new LevelManager();
  registerAllLevels(lm);
  assert.ok(lm.has(CONFIG.startLevelId), 'el nivel inicial configurado existe');
  assert.throws(() => lm.register({ id: 'malo' }), /inválida/);
  assert.throws(() => registerAllLevels(lm), /duplicado/);
  assert.throws(() => lm.load('no_existe'), /no registrado/);
  const level = lm.load(CONFIG.startLevelId);
  assert.ok(level.entities.length >= 1);
  assert.deepEqual(level.spawnPoint('inexistente'), level.spawnPoint('default'));
});

test('Colisiones: límites del nivel y entidades sólidas', () => {
  const level = new Level({ id: 't', name: 't', size: { w: 500, h: 500 }, spawns: { default: { x: 0, y: 0 } } });
  const e = level.add(new Entity({ x: 100, y: 100, w: 40, h: 40 }));
  const wall = level.add(new Entity({ x: 200, y: 90, w: 40, h: 60 }));
  wall.solid = true;

  level.moveEntity(e, 1000, 0);
  assert.equal(e.x, wall.x - e.w, 'se detiene contra la pared sólida');
  level.moveEntity(e, -1000, 0);
  assert.equal(e.x, 0, 'se detiene en el borde del nivel');
  level.moveEntity(e, 0, 9999);
  assert.equal(e.y, 500 - e.h);
});

test('Animación: Animator y Tween', () => {
  const a = new Animator({ walk: { frames: ['a', 'b', 'c'], fps: 10 }, once: { frames: [1, 2], fps: 10, loop: false } }, 'walk');
  a.update(0.15);
  assert.equal(a.frame, 'b');
  a.update(0.2);
  assert.equal(a.frame, 'a', 'el bucle da la vuelta');
  a.play('once');
  a.update(5);
  assert.equal(a.frame, 2);
  assert.ok(a.finished);
  assert.throws(() => a.play('nada'), /inexistente/);

  const tm = new TweenManager();
  let v = -1;
  let done = false;
  tm.add({ from: 0, to: 10, duration: 1, onUpdate: (x) => (v = x), onComplete: () => (done = true) });
  tm.update(0.5);
  assert.equal(v, 5);
  tm.update(0.6);
  assert.ok(done && v === 10 && tm.list.length === 0);
});

// ----------------------------------------------------------------- integración

test('Integración: recorrido completo del juego (menú → partida → guardado → continuar)', async () => {
  const env = createMockEnv();
  const game = new Game({ canvas: env.canvas, win: env.win, storage: env.storage });
  registerScenes(game.scenes);
  registerAllLevels(game.levels);
  game.boot();

  const step = (seconds = 1 / 60) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      game.update(1 / 60);
      game.render();
    }
  };
  const press = (code, seconds = 1 / 60) => {
    game.input.handleKeyDown(code);
    step(1 / 60);
    game.input.handleKeyUp(code);
    if (seconds > 1 / 60) step(seconds);
  };
  const scene = () => game.scenes.current;
  const drew = (text) => env.texts.includes(text);

  // Arranque
  assert.equal(scene().name, 'boot');
  await new Promise((r) => setImmediate(r));
  step(1);
  assert.equal(scene().name, 'mainMenu', 'tras cargar pasa al menú principal');

  env.clearTexts();
  step();
  assert.ok(drew('Nueva partida') && drew('Continuar') && drew('Cargar partida'), 'el menú dibuja sus opciones');
  assert.equal(scene().menu.items[0].enabled, false, 'Continuar está desactivado sin partidas');

  // Nueva partida → pantalla de espacios
  press('Enter', 1);
  assert.equal(scene().name, 'slots');
  assert.equal(scene().mode, 'new');

  // Elegir el espacio 1 → nivel
  press('Enter', 1);
  assert.equal(scene().name, 'level', 'empieza la partida');
  assert.equal(game.saves.readSlot(1).status, 'ok', 'el espacio 1 se reserva al empezar');
  const lvl = scene();
  assert.equal(lvl.level.id, CONFIG.startLevelId);

  // Movimiento + cámara de seguimiento
  const x0 = lvl.player.x;
  const camX0 = lvl.camera.x;
  game.input.handleKeyDown('ArrowRight');
  step(1);
  game.input.handleKeyUp('ArrowRight');
  assert.ok(lvl.player.x - x0 > CONFIG.player.speed * 0.9, `el jugador avanza a ~${CONFIG.player.speed}px/s (avanzó ${lvl.player.x - x0})`);
  assert.ok(lvl.camera.x > camX0, 'la cámara sigue al jugador');

  // Movimiento en diagonal no es más rápido
  const px = lvl.player.x;
  const py = lvl.player.y;
  game.input.handleKeyDown('KeyD');
  game.input.handleKeyDown('KeyS');
  step(1);
  game.input.handleKeyUp('KeyD');
  game.input.handleKeyUp('KeyS');
  const diag = Math.hypot(lvl.player.x - px, lvl.player.y - py);
  assert.ok(Math.abs(diag - CONFIG.player.speed) < 8, `la diagonal se normaliza (recorrió ${diag.toFixed(1)})`);

  // Interacción + diálogo
  const npc = lvl.level.entities.find((e) => e.dialogueId === 'marcador_a');
  lvl.player.x = npc.x;
  lvl.player.y = npc.y + npc.h + 10;
  step(0.2);
  assert.equal(lvl.interaction.focus, npc, 'el marcador cercano es el foco de interacción');
  press('KeyE');
  assert.ok(lvl.dialogue.active, 'interactuar abre el diálogo');
  const frozen = { x: lvl.player.x, y: lvl.player.y };
  game.input.handleKeyDown('ArrowRight');
  step(0.3);
  game.input.handleKeyUp('ArrowRight');
  assert.deepEqual({ x: lvl.player.x, y: lvl.player.y }, frozen, 'el jugador no se mueve durante el diálogo');
  env.clearTexts();
  step();
  assert.ok(env.texts.some((t) => t.includes('Marcador A')), 'la caja de diálogo muestra al hablante');
  for (let i = 0; i < 12 && lvl.dialogue.active; i++) press('KeyE', 2);
  assert.equal(lvl.dialogue.active, false, 'el diálogo termina tras avanzar todas las líneas');

  // Zoom
  press('Equal', 2);
  assert.ok(Math.abs(lvl.camera.zoom - CONFIG.camera.zoomStep) < 0.01, 'el zoom se acerca');
  press('Minus', 1);
  press('Minus', 2);
  assert.ok(lvl.camera.zoom < 1, 'el zoom se aleja');
  press('Equal', 1);
  press('Equal', 2); // queda en zoomStep (1.25), que es lo que se guardará
  assert.ok(Math.abs(lvl.camera.targetZoom - CONFIG.camera.zoomStep) < 0.001);

  // Pausa y guardado
  lvl.player.x = 900;
  lvl.player.y = 700;
  step(0.1);
  press('Escape');
  assert.equal(scene().name, 'pause');
  const frozenT = lvl.playtimeMs;
  step(0.5);
  assert.equal(lvl.playtimeMs, frozenT, 'la partida está congelada en pausa');
  press('ArrowDown');
  press('Enter');
  const saved = game.saves.readSlot(1);
  assert.equal(saved.status, 'ok');
  assert.deepEqual(saved.data.player, { x: 900, y: 700 }, 'se guarda la posición del jugador');
  assert.ok(saved.data.playtimeMs > 0, 'se guarda el tiempo de juego');
  press('Escape');
  assert.equal(scene().name, 'level', 'Esc cierra la pausa');

  // Salir al menú (con confirmación) y Continuar
  press('Escape'); // abre la pausa (la selección empieza en "Continuar")
  press('ArrowDown'); // Guardar
  press('ArrowDown'); // Salir al menú principal
  press('Enter');
  assert.equal(scene().name, 'confirm', 'salir pide confirmación');
  press('Enter'); // opción segura por defecto: Volver
  assert.equal(scene().name, 'pause', 'la opción por defecto cancela y vuelve a la pausa');
  press('Enter'); // la selección sigue en "Salir": vuelve a pedir confirmación
  assert.equal(scene().name, 'confirm');
  press('ArrowDown'); // Salir
  press('Enter', 1.2);
  assert.equal(scene().name, 'mainMenu');
  assert.equal(scene().menu.items[0].enabled, true, 'Continuar se activa al existir un guardado');

  press('Enter', 1.2); // Continuar
  assert.equal(scene().name, 'level');
  assert.equal(scene().player.x, 900, 'se restaura la posición guardada');
  assert.equal(scene().player.y, 700);
  assert.ok(scene().camera.targetZoom > 1, 'se restaura el zoom guardado');

  // Depuración
  press('F3');
  assert.equal(game.debug.enabled, true);
  step();
});

test('Integración: táctil (toque en menú, stick virtual y botón de acción)', async () => {
  const env = createMockEnv();
  const game = new Game({ canvas: env.canvas, win: env.win, storage: env.storage });
  registerScenes(game.scenes);
  registerAllLevels(game.levels);
  game.boot();
  const step = (s = 1 / 60) => {
    for (let i = 0; i < Math.round(s * 60); i++) {
      game.update(1 / 60);
      game.render();
    }
  };
  await new Promise((r) => setImmediate(r));
  step(1);
  assert.equal(game.scenes.current.name, 'mainMenu');
  assert.equal(game.input.usedTouch, false);

  // Tocar "Nueva partida"
  const r = game.scenes.current.menu.rect(1);
  game.input.handlePointerDown(1, r.x + r.w / 2, r.y + r.h / 2, 'touch');
  game.input.handlePointerUp(1);
  step(1);
  assert.equal(game.scenes.current.name, 'slots');
  assert.ok(game.input.usedTouch, 'se detecta el uso táctil');

  // Tocar el espacio 1
  const s1 = game.scenes.current.menu.rect(0);
  game.input.handlePointerDown(2, s1.x + 10, s1.y + 10, 'touch');
  game.input.handlePointerUp(2);
  step(1);
  const lvl = game.scenes.current;
  assert.equal(lvl.name, 'level');

  // Stick virtual: apoyar a la izquierda-abajo y arrastrar a la derecha
  const x0 = lvl.player.x;
  game.input.handlePointerDown(3, 200, 500, 'touch');
  step(1 / 60);
  assert.ok(lvl.touch.stick.active, 'el stick flotante se activa');
  game.input.handlePointerMove(3, 290, 500, 'touch');
  step(0.5);
  assert.ok(lvl.player.x > x0 + 50, 'el stick mueve al jugador');
  game.input.handlePointerUp(3);
  step(0.2);
  assert.equal(lvl.touch.stick.active, false);
  const xStop = lvl.player.x;
  step(0.3);
  assert.equal(lvl.player.x, xStop, 'al soltar el stick el jugador se detiene');

  // Botón de acción abre diálogo junto a un marcador
  const npc = lvl.level.entities.find((e) => e.dialogueId === 'marcador_b');
  lvl.player.x = npc.x;
  lvl.player.y = npc.y + npc.h + 10;
  step(0.2);
  const btn = lvl.touch.buttons.find((b) => b.action === 'interact');
  game.input.handlePointerDown(4, btn.x, btn.y, 'touch');
  step(1 / 60);
  game.input.handlePointerUp(4);
  step(1 / 60);
  assert.ok(lvl.dialogue.active, 'el botón de acción interactúa');
  // Tocar la pantalla avanza el diálogo
  game.input.handlePointerDown(5, 640, 300, 'touch');
  step(1 / 60);
  game.input.handlePointerUp(5);
  assert.ok(lvl.dialogue.complete, 'tocar la pantalla completa el texto que se está escribiendo');
});

test('Integración: espacio ocupado pide confirmación antes de sobrescribir', async () => {
  const env = createMockEnv();
  const game = new Game({ canvas: env.canvas, win: env.win, storage: env.storage });
  registerScenes(game.scenes);
  registerAllLevels(game.levels);
  const old = { ...createEmptySave({ slot: 1, levelId: CONFIG.startLevelId }), playtimeMs: 123000 };
  game.saves.write(1, old);
  game.boot();
  const step = (s) => {
    for (let i = 0; i < Math.round(s * 60); i++) {
      game.update(1 / 60);
      game.render();
    }
  };
  const press = (code, s = 1 / 60) => {
    game.input.handleKeyDown(code);
    step(1 / 60);
    game.input.handleKeyUp(code);
    if (s > 1 / 60) step(s);
  };
  await new Promise((r) => setImmediate(r));
  step(1);
  assert.equal(game.scenes.current.menu.items[0].enabled, true, 'Continuar activo con un guardado previo');

  press('ArrowDown');
  press('Enter', 1); // Nueva partida
  assert.equal(game.scenes.current.name, 'slots');
  press('Enter'); // espacio 1 (ocupado)
  assert.equal(game.scenes.current.name, 'confirm');
  press('Enter', 1); // por defecto: Cancelar
  assert.equal(game.scenes.current.name, 'slots');
  assert.equal(game.saves.readSlot(1).data.playtimeMs, 123000, 'cancelar no toca el guardado');

  press('Enter'); // otra vez a confirmar
  press('ArrowDown');
  press('Enter', 1.2); // Sobrescribir
  assert.equal(game.scenes.current.name, 'level');
  assert.equal(game.saves.readSlot(1).data.playtimeMs, 0, 'sobrescribir crea una partida nueva');
});

// --------------------------------------------------------------------- ejecutor

let failed = 0;
for (const t of tests) {
  try {
    await t.fn();
    console.log(`  ✔ ${t.name}`);
  } catch (err) {
    failed++;
    console.log(`  ✘ ${t.name}\n      ${String(err.stack ?? err).split('\n').slice(0, 6).join('\n      ')}`);
  }
}
console.log(failed ? `\n✘ ${failed} de ${tests.length} pruebas fallaron` : `\n✔ ${tests.length} pruebas correctas`);
process.exit(failed ? 1 : 0);
