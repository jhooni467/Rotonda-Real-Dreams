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
import { computeLayout, sameLayout } from '../src/engine/layout.js';
import { Renderer } from '../src/engine/Renderer.js';
import { Orientation } from '../src/engine/Orientation.js';
import { readSafeInsets } from '../src/engine/SafeArea.js';
import { Menu } from '../src/ui/Menu.js';
import { TouchControls } from '../src/ui/TouchControls.js';
import { legibleSize } from '../src/ui/draw.js';
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

// ------------------------------------------------- Etapa 01: multidispositivo

const R = CONFIG.render;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} (${a} vs ${b}, tolerancia ${tol})`);

/** Proporciones representativas de teléfonos y tablets Android (px CSS, en horizontal). */
const VIEWPORTS = [
  { name: 'teléfono 20:9 (915×412)', w: 915, h: 412, logicalW: 1600 },
  { name: 'teléfono 19,5:9 (844×390)', w: 844, h: 390, logicalW: 1552 },
  { name: 'teléfono 16:9 (1280×720)', w: 1280, h: 720, logicalW: 1280 },
  { name: 'teléfono 21:9 (1008×432)', w: 1008, h: 432, logicalW: 1680 },
  { name: 'tablet 16:10 (1280×800)', w: 1280, h: 800, logicalW: 1152 },
  { name: 'tablet 3:2 (960×640)', w: 960, h: 640, logicalW: 1088 },
  { name: 'tablet 4:3 (1024×768)', w: 1024, h: 768, logicalW: 960 },
  { name: 'pequeño 16:9 (640×360)', w: 640, h: 360, logicalW: 1280 },
  { name: 'ultrapanorámico 32:9 (3840×1080)', w: 3840, h: 1080, logicalW: 1728, bars: true },
  { name: 'casi cuadrado 5:4 (1280×1024)', w: 1280, h: 1024, logicalW: 960, bars: true },
];

test('Layout: cada proporción da el ancho lógico esperado, sin deformar y dentro de la ventana', () => {
  for (const v of VIEWPORTS) {
    const l = computeLayout({ availW: v.w, availH: v.h, dpr: 2, config: R });
    const tag = v.name;
    assert.equal(l.height, R.height, `${tag}: la altura lógica es fija`);
    assert.equal(l.width, v.logicalW, `${tag}: ancho lógico`);
    assert.equal(l.width % R.widthStep, 0, `${tag}: ancho múltiplo de ${R.widthStep}`);
    assert.ok(l.width >= 960 && l.width <= 1728, `${tag}: ancho dentro de los límites`);
    assert.ok(l.cssW <= v.w && l.cssH <= v.h, `${tag}: cabe en la ventana (${l.cssW}×${l.cssH})`);
    near(l.cssW / l.cssH, l.width / l.height, 0.012 * (l.width / l.height), `${tag}: no se deforma`);
    near(l.pixelScaleX, l.pixelScaleY, 0.006 * l.pixelScaleX, `${tag}: escala uniforme`);
    assert.equal(l.letterboxed, !!v.bars, `${tag}: bandas solo fuera de los límites de proporción`);
    // Aprovecha la pantalla: un eje se llena del todo y el otro casi (≥ 97 %) cuando no hay bandas
    assert.ok(l.cssW === v.w || l.cssH === v.h || l.cssW >= v.w - 1 || l.cssH >= v.h - 1, `${tag}: llena un eje`);
    if (!v.bars) assert.ok(l.cssW >= v.w * 0.97 && l.cssH >= v.h * 0.97, `${tag}: aprovecha la pantalla`);
  }
});

test('Layout: tope de densidad de píxeles y presupuesto total', () => {
  const phone = computeLayout({ availW: 915, availH: 412, dpr: 3, config: R });
  assert.equal(phone.ratio, R.maxPixelRatio, 'el dpr 3 se limita al máximo configurado');
  const tablet = computeLayout({ availW: 1280, availH: 800, dpr: 2, config: R });
  assert.ok(tablet.ratio < 2 && tablet.ratio >= 1, `la tablet baja la densidad (${tablet.ratio})`);
  assert.ok(tablet.bufW * tablet.bufH <= R.maxPixels * 1.005, 'respeta el presupuesto de píxeles');
  const huge = computeLayout({ availW: 3840, availH: 2160, dpr: 2, config: R });
  assert.ok(huge.ratio >= 1, 'nunca baja de 1×');
  assert.equal(computeLayout({ availW: 800, availH: 450, dpr: 0.5, config: R }).ratio, 1, 'dpr < 1 se trata como 1');
  assert.ok(computeLayout({ availW: NaN, availH: undefined, config: R }).width >= 960, 'valores inválidos no rompen el cálculo');
});

test('Layout: áreas seguras (notch) en unidades lógicas y absorbidas por las bandas', () => {
  const insets = { top: 0, right: 48, bottom: 21, left: 48 };
  const l = computeLayout({ availW: 915, availH: 412, dpr: 2, insets, config: R });
  near(l.safe.left, 48 / l.cssScale, 1.5, 'inset izquierdo convertido a lógico');
  near(l.safe.bottom, 21 / l.cssScale, 1.5, 'inset inferior convertido a lógico');
  assert.equal(l.safe.top, 0);

  // Con bandas laterales anchas, el notch lateral cae en la banda y no invade el juego;
  // la barra inferior sí cuenta porque el canvas ocupa toda la altura.
  const wide = computeLayout({ availW: 3840, availH: 1080, dpr: 1, insets, config: R });
  assert.equal(wide.safe.left, 0);
  assert.equal(wide.safe.right, 0);
  near(wide.safe.bottom, 21 / wide.cssScale, 1.5, 'la barra inferior sigue aplicando');
});

test('Layout: cambios mínimos de la ventana (barra del navegador) no recalculan nada', () => {
  const a = computeLayout({ availW: 915, availH: 412, dpr: 2, config: R });
  const b = computeLayout({ availW: 915, availH: 413, dpr: 2, config: R });
  const c = computeLayout({ availW: 915, availH: 412, dpr: 2, config: R });
  assert.equal(sameLayout(a, c), true, 'mismo dato → mismo layout');
  assert.equal(a.width, b.width, 'el ancho lógico está cuantizado');
  assert.equal(sameLayout(a, computeLayout({ availW: 1280, availH: 720, dpr: 2, config: R })), false);
});

test('Renderer: no toca el DOM si la presentación no cambió', () => {
  const env = createMockEnv();
  const r = new Renderer(env.canvas, R);
  assert.equal(r.resize(915, 412, { dpr: 2 }), true);
  const { styleWrites, bufferWrites } = env.stats;
  assert.equal(r.resize(915, 412, { dpr: 2 }), false, 'mismo tamaño → sin cambios');
  assert.deepEqual({ ...env.stats }, { styleWrites, bufferWrites }, 'ni estilo ni búfer reescritos');
  assert.equal(r.width, 1600);
  assert.equal(env.canvas.width, r.layout.bufW);

  // Solo cambia la densidad: se reasigna el búfer pero no el tamaño CSS
  assert.equal(r.resize(915, 412, { dpr: 1 }), true);
  assert.equal(env.stats.styleWrites, styleWrites, 'el tamaño CSS no se reescribe');
  assert.ok(env.stats.bufferWrites > bufferWrites, 'el búfer sí');

  r.resize(1280, 720, { dpr: 1 });
  assert.equal(r.width, 1280);
  near(r.cssToLogical(10), 10, 0.01, 'cssToLogical a escala 1');
  assert.ok(r.safeRect.w === 1280 && r.safeRect.h === 720);
});

test('SafeArea: lee los insets desde el estilo calculado de la sonda', () => {
  const env = createMockEnv({ insets: { top: 4, right: 30, bottom: 21, left: 44 } });
  assert.deepEqual(readSafeInsets(env.win), { top: 4, right: 30, bottom: 21, left: 44 });
  assert.deepEqual(readSafeInsets({}), { top: 0, right: 0, bottom: 0, left: 0 }, 'sin DOM → ceros');
  assert.deepEqual(readSafeInsets({ document: { getElementById: () => ({}) }, getComputedStyle: () => { throw new Error('x'); } }),
    { top: 0, right: 0, bottom: 0, left: 0 }, 'si falla → ceros');
});

test('Cámara: resize cambia la vista sin mover ni hacer zoom', () => {
  const cam = new Camera({ ...CONFIG.camera, viewW: 1280, viewH: 720, bounds: { x: 0, y: 0, w: 2400, h: 1350 } });
  cam.follow({ cx: 5000, cy: 5000 });
  cam.snap();
  assert.equal(cam.x, 2400 - 640);
  cam.resize(1728, 720);
  assert.equal(cam.x, 2400 - 864, 'el borde derecho sigue pegado al límite del mundo');
  assert.equal(cam.zoom, 1);
  cam.resize(960, 720);
  assert.equal(cam.x, 2400 - 864, 'al reducir la vista no se mueve sola: sigue dentro de los límites');
  cam.snap(); // al volver a seguir al objetivo, se pega al nuevo borde
  assert.equal(cam.x, 2400 - 480);
  cam.resize(960, 720); // sin cambios: no-op
  assert.equal(cam.viewRect().w, 960);
});

test('Orientación: detección por forma de ventana y por matchMedia', () => {
  const changes = [];
  const w = { innerWidth: 900, innerHeight: 400 };
  const o = new Orientation(w, { onChange: (b) => changes.push(b) });
  assert.equal(o.blocked, false);
  w.innerWidth = 400;
  w.innerHeight = 900;
  assert.equal(o.refresh(), true);
  assert.equal(o.refresh(), true, 'repetir no notifica de nuevo');
  w.innerWidth = 900;
  w.innerHeight = 400;
  o.refresh();
  assert.deepEqual(changes, [true, false], 'solo notifica cuando cambia');

  const env = createMockEnv({ width: 500, height: 500, matchMedia: true });
  assert.equal(new Orientation(env.win).blocked, true, 'cuadrado cuenta como vertical (igual que CSS)');
  env.setSize(800, 400);
  assert.equal(new Orientation(env.win).blocked, false);
});

test('Orientación: bloqueo (locked / denied / unsupported) y primer gesto', async () => {
  assert.equal(await new Orientation({ innerWidth: 900, innerHeight: 400 }).tryLock(), 'unsupported');

  const calls = [];
  const ok = new Orientation({ innerWidth: 900, innerHeight: 400, screen: { orientation: { lock: async (m) => void calls.push(m), unlock: () => calls.push('unlock') } } });
  assert.equal(await ok.tryLock(), 'locked');
  assert.deepEqual(calls, ['landscape']);
  ok.unlock();
  assert.equal(ok.lockState, 'idle');
  assert.deepEqual(calls, ['landscape', 'unlock']);

  const denied = new Orientation({ innerWidth: 900, innerHeight: 400, screen: { orientation: { lock: async () => { throw new DOMException('no', 'NotSupportedError'); } } } });
  assert.equal(await denied.tryLock(), 'denied', 'un rechazo del navegador es normal y no lanza');

  // Primer gesto: solo se intenta en táctiles y una única vez
  let attempts = 0;
  const win = { innerWidth: 900, innerHeight: 400, screen: { orientation: { lock: async () => void attempts++ } }, matchMedia: (q) => ({ matches: q.includes('coarse') }) };
  const touch = new Orientation(win);
  touch.onFirstGesture();
  touch.onFirstGesture();
  await Promise.resolve();
  assert.equal(attempts, 1, 'un solo intento');
  const desktopWin = { ...win, matchMedia: () => ({ matches: false }) };
  new Orientation(desktopWin).onFirstGesture();
  await Promise.resolve();
  assert.equal(attempts, 1, 'en PC no se intenta');
});

test('Orientación: pantalla completa (soporte, entrar, salir y bloqueo al entrar)', async () => {
  const locks = [];
  const root = { requestFullscreen: async () => { doc.fullscreenElement = root; } };
  const doc = { fullscreenEnabled: true, fullscreenElement: null, documentElement: root, exitFullscreen: async () => { doc.fullscreenElement = null; } };
  const o = new Orientation({ innerWidth: 900, innerHeight: 400, document: doc, screen: { orientation: { lock: async (m) => void locks.push(m), unlock: () => locks.push('unlock') } } });
  assert.equal(o.fullscreenSupported, true);
  assert.equal(await o.toggleFullscreen(), true);
  assert.equal(o.isFullscreen, true);
  o._onFullscreenChange();
  await Promise.resolve();
  assert.deepEqual(locks, ['landscape'], 'al entrar en pantalla completa se bloquea en horizontal');
  await o.toggleFullscreen();
  assert.equal(o.isFullscreen, false);
  o._onFullscreenChange();
  assert.deepEqual(locks, ['landscape', 'unlock'], 'al salir se desbloquea');

  assert.equal(new Orientation({ innerWidth: 900, innerHeight: 400 }).fullscreenSupported, false, 'sin DOM no hay soporte');
  assert.equal(new Orientation({ document: { fullscreenEnabled: false, documentElement: root } }).fullscreenSupported, false, 'iPhone: API desactivada');
  const denied = new Orientation({ document: { fullscreenEnabled: true, documentElement: { requestFullscreen: async () => { throw new Error('denegado'); } } } });
  assert.equal(await denied.toggleFullscreen(), false, 'si el navegador la niega, no lanza');
});

test('Menú: se centra con posición dinámica y su zona táctil llena los huecos', () => {
  let width = 1280;
  const hits = [];
  const menu = new Menu({
    x: () => width / 2,
    width: () => Math.min(900, width - 48),
    y: 100,
    itemHeight: 60,
    gap: 20,
    items: [{ label: 'A', onSelect: () => hits.push('A') }, { label: 'B', onSelect: () => hits.push('B') }],
  });
  const center = (i) => menu.rect(i).x + menu.rect(i).w / 2;
  assert.equal(center(0), 640);
  width = 960;
  assert.equal(center(0), 480, 'sigue centrado al cambiar el ancho lógico');
  assert.equal(menu.rect(0).w, 900);
  width = 600;
  assert.equal(menu.rect(0).w, 552, 'el ancho se adapta a pantallas estrechas');

  const tapAt = (y) => ({ wasPressed: () => false, pointerPos: { x: -1, y: -1, type: 'touch' }, getTaps: () => [{ x: center(0), y, consumed: false }] });
  menu.update(tapAt(100 + 60 + 9)); // en el hueco, más cerca de A
  menu.update(tapAt(100 + 60 + 11)); // en el hueco, más cerca de B
  menu.update(tapAt(10)); // fuera
  assert.deepEqual(hits, ['A', 'B']);
});

test('Texto legible: el tamaño mínimo se calcula en píxeles CSS reales', () => {
  const phone = { cssScale: 412 / 720 };
  assert.ok(legibleSize(phone, 14) * phone.cssScale >= CONFIG.ui.minTextCss - 0.5, 'en móvil se amplía');
  assert.equal(legibleSize({ cssScale: 1 }, 14), 14, 'en PC se respeta el tamaño pedido');
  assert.equal(legibleSize(phone, 40), 40, 'nunca reduce un texto grande');
});

test('Controles táctiles: tamaño cómodo, dentro del área segura y sin solaparse (todas las proporciones)', () => {
  const noteched = { top: 0, right: 48, bottom: 21, left: 48 };
  for (const v of VIEWPORTS.filter((vp) => vp.w >= 640)) {
    for (const insets of [{}, noteched]) {
      const env = createMockEnv();
      const renderer = new Renderer(env.canvas, R);
      renderer.resize(v.w, v.h, { dpr: 2, insets });
      const tc = new TouchControls({ renderer, settings: { touchControls: 'on' }, input: { usedTouch: true } });
      const tag = `${v.name}${insets.left ? ' con notch' : ''}`;
      const { safeRect: s } = renderer;

      const circles = [...tc.buttons.map((b) => ({ n: b.action, x: b.x, y: b.y, r: b.r })), { n: 'stick', x: tc.stickHome.x, y: tc.stickHome.y, r: tc.stickRadius }];
      for (const c of circles) {
        assert.ok(c.x - c.r >= s.x - 0.5 && c.x + c.r <= s.x + s.w + 0.5, `${tag}: ${c.n} dentro del área segura (horizontal)`);
        assert.ok(c.y - c.r >= s.y - 0.5 && c.y + c.r <= s.y + s.h + 0.5, `${tag}: ${c.n} dentro del área segura (vertical)`);
      }
      for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
          assert.ok(Math.hypot(circles[i].x - circles[j].x, circles[i].y - circles[j].y) >= circles[i].r + circles[j].r, `${tag}: ${circles[i].n} y ${circles[j].n} no se solapan`);
        }
      }
      for (const b of tc.buttons) assert.ok(2 * b.r * renderer.cssScale >= 44, `${tag}: ${b.action} mide ≥ 44 px reales (${(2 * b.r * renderer.cssScale).toFixed(0)})`);
    }
  }
});

test('Controles táctiles: se atenúan solo los que cubren al jugador o algo interactuable', () => {
  const env = createMockEnv();
  const renderer = new Renderer(env.canvas, R);
  renderer.resize(915, 412, { dpr: 2 });
  const tc = new TouchControls({ renderer, settings: { touchControls: 'on' }, input: { usedTouch: true } });

  const draws = []; // alfa con el que se dibuja cada círculo: [stick, interact, pause, zoomIn, zoomOut]
  const ctx = new Proxy({ globalAlpha: 1, arc() { draws.push(this.globalAlpha); } }, { get: (t, p) => (p in t ? t[p] : () => undefined), set: (t, p, v) => ((t[p] = v), true) });

  tc.render(ctx, true, []);
  assert.deepEqual(draws, [0.55, 0.55, 0.55, 0.55, 0.55], 'sin obstáculos, todos con la opacidad normal');

  draws.length = 0;
  const action = tc.buttons.find((b) => b.action === 'interact');
  tc.render(ctx, true, [{ x: action.x - 10, y: action.y - 10, w: 20, h: 20 }]); // algo importante bajo el botón de acción
  assert.equal(draws[1], 0.16, 'el botón de acción se atenúa');
  assert.deepEqual([draws[0], ...draws.slice(2)], [0.55, 0.55, 0.55, 0.55], 'los demás no');

  draws.length = 0;
  tc.render(ctx, false, [{ x: 0, y: 0, w: 5000, h: 5000 }]);
  assert.equal(draws.length, 0, 'oculto (diálogo) → no dibuja nada');
});

/** Arranca el juego completo sobre un entorno simulado y avanza hasta el menú principal. */
async function bootGame(envOptions) {
  const env = createMockEnv(envOptions);
  const game = new Game({ canvas: env.canvas, win: env.win, storage: env.storage });
  registerScenes(game.scenes);
  registerAllLevels(game.levels);
  game.boot();
  const step = (s = 1 / 60) => {
    for (let i = 0; i < Math.max(1, Math.round(s * 60)); i++) {
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
  return { env, game, step, press };
}

test('Integración: la presentación se adapta a distintas proporciones sin alterar la lógica', async () => {
  const { env, game, step, press } = await bootGame();
  step(1);
  assert.equal(game.scenes.current.name, 'mainMenu');
  press('Enter', 1); // Nueva partida
  press('Enter', 1); // espacio 1
  const lvl = game.scenes.current;
  assert.equal(lvl.name, 'level');

  const resized = [];
  game.events.on('display:resized', (e) => resized.push(e.width));
  let dir = 1; // se alterna derecha/izquierda para no chocar con el borde del mundo
  const runRight = () => {
    const key = dir > 0 ? 'KeyD' : 'KeyA';
    const x0 = lvl.player.x;
    game.input.handleKeyDown(key);
    step(1);
    game.input.handleKeyUp(key);
    const moved = (lvl.player.x - x0) * dir;
    dir = -dir;
    return moved;
  };
  const baseline = runRight();
  near(baseline, CONFIG.player.speed, 6, 'velocidad de referencia');

  for (const [w, h, expected] of [[915, 412, 1600], [1024, 768, 960], [1280, 800, 1152], [3840, 1080, 1728], [1280, 720, 1280]]) {
    env.setSize(w, h, { dpr: 2 });
    step();
    const r = game.renderer;
    assert.equal(r.width, expected, `${w}×${h}: ancho lógico`);
    assert.equal(r.height, 720);
    assert.equal(lvl.camera.viewW, expected, `${w}×${h}: la cámara adopta la nueva vista`);
    assert.equal(lvl.camera.viewH, 720);
    near(runRight(), baseline, 2, `${w}×${h}: las físicas no cambian con la pantalla`);
    // Un toque en el centro CSS del canvas debe convertirse al centro lógico (con o sin bandas)
    const rect = env.canvas.getBoundingClientRect();
    const p = r.toLogical(rect.left + rect.width / 2, rect.top + rect.height / 2);
    near(p.x, expected / 2, 1, `${w}×${h}: conversión de coordenadas táctiles X`);
    near(p.y, 360, 1, `${w}×${h}: conversión de coordenadas táctiles Y`);
    // Controles táctiles reubicados en el borde derecho
    const action = lvl.touch.buttons.find((b) => b.action === 'interact');
    assert.ok(action.x + action.r <= expected - CONFIG.ui.safeMargin + 0.5, `${w}×${h}: botón de acción dentro del borde`);
  }
  assert.deepEqual(resized, [1600, 960, 1152, 1728, 1280], 'una notificación por cambio real');

  // Eventos de resize repetidos sin cambio real no notifican ni redibujan el layout
  const before = { ...env.stats };
  for (let i = 0; i < 5; i++) env.win.dispatch('resize');
  step(0.2);
  assert.equal(resized.length, 5);
  assert.deepEqual({ ...env.stats }, before, 'sin cambios en el DOM');

  // Pausa y guardado siguen funcionando tras redimensionar, y el menú sigue centrado
  env.setSize(915, 412, { dpr: 2 });
  step();
  press('Escape');
  assert.equal(game.scenes.current.name, 'pause');
  const m = game.scenes.current.menu;
  near(m.rect(0).x + m.rect(0).w / 2, 800, 0.5, 'la pausa se centra en la nueva anchura');
  press('ArrowDown');
  press('Enter');
  assert.equal(game.saves.readSlot(1).status, 'ok', 'el guardado funciona tras adaptar la pantalla');
});

test('Integración: áreas seguras — la interfaz respeta el notch', async () => {
  const { env, game, step, press } = await bootGame({ width: 915, height: 412, dpr: 2, insets: { top: 0, right: 48, bottom: 21, left: 48 } });
  step(1);
  const r = game.renderer;
  near(r.safe.left, 48 / r.cssScale, 1.5);
  press('Enter', 1);
  press('Enter', 1);
  const lvl = game.scenes.current;
  const s = r.safeRect;
  for (const b of lvl.touch.buttons) assert.ok(b.x + b.r <= s.x + s.w + 0.5 && b.x - b.r >= s.x - 0.5, `${b.action} dentro del área segura`);

  // El notch cambia (p. ej. giro de 90° → 270°): la interfaz se recoloca
  env.setSize(915, 412, { dpr: 2, insets: { top: 0, right: 0, bottom: 21, left: 0 } });
  step();
  assert.equal(game.renderer.safe.left, 0);
  assert.ok(lvl.touch.buttons[0].x > s.x + s.w - 200, 'los controles se acercan al borde al desaparecer el notch');
});

test('Integración: en vertical el juego se congela y al volver a horizontal continúa sin recalcular', async () => {
  const { env, game, step, press } = await bootGame({ width: 915, height: 412 });
  step(1);
  press('Enter', 1);
  press('Enter', 1);
  const lvl = game.scenes.current;
  assert.equal(lvl.name, 'level');

  const resized = [];
  const orient = [];
  game.events.on('display:resized', () => resized.push(1));
  game.events.on('orientation:changed', (e) => orient.push(e.blocked));

  // Gira a vertical
  env.setSize(412, 915);
  step(0.1);
  assert.equal(game.orientation.blocked, true);
  assert.deepEqual(orient, [true]);
  const t0 = lvl.playtimeMs;
  const x0 = lvl.player.x;
  game.input.handleKeyDown('KeyD');
  step(1);
  game.input.handleKeyUp('KeyD');
  assert.equal(lvl.playtimeMs, t0, 'el tiempo de juego no avanza en vertical');
  assert.equal(lvl.player.x, x0, 'las entradas se ignoran en vertical');
  assert.equal(game.renderer.width, 1600, 'el layout horizontal se conserva (no se recalcula en vertical)');
  assert.equal(resized.length, 0);

  env.clearTexts();
  step();
  assert.equal(env.texts.length, 0, 'no se dibuja nada en el canvas en vertical');

  // Vuelve a horizontal con el mismo tamaño: nada que recalcular
  env.setSize(915, 412);
  step(0.2);
  assert.equal(game.orientation.blocked, false);
  assert.deepEqual(orient, [true, false]);
  assert.equal(resized.length, 0, 'mismo tamaño → sin reconstruir la interfaz');
  game.input.handleKeyDown('KeyD');
  step(1);
  game.input.handleKeyUp('KeyD');
  assert.ok(lvl.player.x - x0 > 250, 'el juego continúa donde estaba');
  assert.ok(lvl.playtimeMs > t0);

  // Gira a vertical y vuelve con OTRA proporción (p. ej. otro dispositivo/ventana): se recalcula una vez
  env.setSize(412, 915);
  step(0.1);
  env.setSize(1024, 768);
  step(0.2);
  assert.equal(game.renderer.width, 960);
  assert.equal(resized.length, 1);
  assert.equal(lvl.camera.viewW, 960);
});

test('Integración: arrancar en vertical muestra la espera y completa el arranque al girar', async () => {
  const { env, game, step } = await bootGame({ width: 412, height: 915 });
  step(1);
  assert.equal(game.orientation.blocked, true);
  assert.equal(game.renderer.layout, null, 'sin layout hasta estar en horizontal');
  assert.equal(game.scenes.current.name, 'boot', 'el arranque espera');
  env.setSize(915, 412, { dpr: 2 });
  step(1);
  assert.equal(game.renderer.width, 1600);
  assert.equal(game.scenes.current.name, 'mainMenu', 'al girar, el juego arranca con normalidad');
});

test('Integración: pantalla completa (botón táctil y tecla F) sin interferir con el resto', async () => {
  const root = { requestFullscreen: async () => { doc.fullscreenElement = root; } };
  const doc = { fullscreenEnabled: true, fullscreenElement: null, documentElement: root, exitFullscreen: async () => { doc.fullscreenElement = null; }, addEventListener() {} };
  const { env, game, step, press } = await bootGame({ width: 915, height: 412, dpr: 2, matchMedia: true, coarse: true, document: doc });
  step(1);
  assert.equal(game.scenes.current.name, 'mainMenu');
  assert.equal(game.fullscreenButton.visible, true, 'visible en táctil con soporte de pantalla completa');

  // Un toque sobre el botón entra en pantalla completa y NO llega al menú
  const g = game.fullscreenButton._geometry();
  const rect = env.canvas.getBoundingClientRect();
  const clientX = rect.left + (g.x / game.renderer.width) * rect.width;
  const clientY = rect.top + (g.y / game.renderer.height) * rect.height;
  game.input.handlePointerDown(1, clientX, clientY, 'touch');
  game.input.handlePointerUp(1);
  step(0.1);
  await Promise.resolve();
  assert.equal(doc.fullscreenElement, root, 'entra en pantalla completa');
  assert.equal(game.scenes.current.name, 'mainMenu', 'el toque no activó nada del menú');

  press('KeyF');
  await Promise.resolve();
  assert.equal(doc.fullscreenElement, null, 'la tecla F alterna la pantalla completa');

  // Sin soporte de pantalla completa (iPhone) el botón no se muestra
  doc.fullscreenEnabled = false;
  assert.equal(game.fullscreenButton.visible, false, 'sin soporte (iPhone) no se muestra');

  // En PC (puntero de ratón, sin haber tocado la pantalla) tampoco: basta con la tecla F
  const desktop = await bootGame({ width: 1280, height: 720, matchMedia: true, coarse: false, document: { ...doc, fullscreenEnabled: true } });
  desktop.step(1);
  assert.equal(desktop.game.fullscreenButton.visible, false, 'en PC no se muestra');
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
