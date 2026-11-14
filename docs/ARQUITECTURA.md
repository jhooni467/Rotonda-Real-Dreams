# Arquitectura de ROTONDA

Objetivo del diseño: **que añadir un nivel, un personaje, una animación o un sonido sea crear archivos nuevos, no reescribir el motor.**

## Visión general

```
index.html ─▶ src/main.js ─▶ Game ──┬─ Renderer      canvas, escalado, coordenadas
                                    ├─ Input         teclado · ratón · táctil → ACCIONES
                                    ├─ SceneManager  pila de escenas + Transition
                                    ├─ LevelManager  registro de niveles (datos)
                                    ├─ SaveManager   espacios de guardado + ajustes
                                    ├─ AudioManager  Web Audio (canales music / sfx)
                                    ├─ AssetLoader   imágenes · json · audio (manifiesto)
                                    └─ EventBus      comunicación entre sistemas
```

`Game` crea los sistemas y los comparte con cada escena como `this.game`. Los sistemas no se importan entre sí en cadena: se hablan a través de `game`.

### Bucle

`Loop` actualiza la lógica en **pasos fijos de 1/60 s** (acumulador) y dibuja una vez por fotograma. El movimiento es idéntico a 60 Hz o a 144 Hz. Si la pestaña estuvo en segundo plano, el tiempo recuperado se limita (`loop.maxFrameTime`).

```
rAF → acumula tiempo → N × Game.update(1/60) → Game.render()
                         │                        └─ SceneManager.render → escenas visibles → Transition
                         └─ SceneManager.update → escena superior · Input.endFrame()
```

### Coordenadas

- **Resolución lógica** fija: 1280 × 720 (`config.render`). El canvas se escala a la ventana con bandas si la proporción no coincide, y se limita la densidad de píxeles a 2× para cuidar el rendimiento en móviles.
- La interfaz se dibuja en coordenadas lógicas. El **mundo** se dibuja bajo la transformación de la cámara (`camera.apply(ctx)`); `camera.worldToScreen / screenToWorld` convierten entre ambos.

## Carpetas y responsabilidades

| Carpeta | Responsabilidad | Piezas actuales |
|---|---|---|
| `src/config/` | Valores ajustables, sin lógica | `config.js`, `controls.js`, `theme.js`, `assets.js` |
| `src/engine/` | Motor y lógica general | `Game`, `Loop`, `Renderer`, `Input`, `Camera`, `Scene`, `SceneManager`, `Transition`, `AssetLoader`, `EventBus` |
| `src/engine/systems/` | Sistemas de juego reutilizables | `Dialogue` (lógica), `Interaction` |
| `src/characters/` | Todo lo que vive dentro de un nivel | `Entity` (base), `Player`, `NPC` |
| `src/levels/` | Cómo se describen y cargan los niveles | `Level`, `LevelManager`, `entityFactory`, `index.js`, `dev/` |
| `src/scenes/` | Escenas de flujo del juego | `BootScene`, `LevelScene` |
| `src/ui/` | Dibujo e interacción de la interfaz | `Menu`, `DialogBox`, `TouchControls`, `screens/*` |
| `src/animation/` | Animación | `Animator`, `Tween`/`TweenManager`, `easing` |
| `src/audio/` | Sonido | `AudioManager` |
| `src/save/` | Persistencia | `SaveManager`, `schema` (versionado), `storage` |
| `assets/` | Archivos de arte y audio | vacío por ahora (ver sus README) |

## Escenas

Una escena es una clase que hereda de `Scene` (`enter`, `update`, `render`, `exit`, `pause`, `resume`).

- `scenes.replace('nombre', params)` — cambia de escena con **fundido**; vacía la pila.
- `scenes.push('nombre', params)` / `scenes.pop()` — apila/retira (pausa, confirmaciones). Una escena con `get transparent() { return true; }` deja ver lo de debajo.
- Solo la escena superior recibe `update`.
- Si el fundido está en la fase de oscurecer, no se actualiza ninguna escena (evita entradas "fantasma").

Flujo actual:

```
boot → mainMenu ─┬─ (Continuar) ───────────────┐
                 ├─ (Nueva partida) → slots ───┼→ level ⇄ pause → (confirm) → mainMenu
                 └─ (Cargar partida) → slots ──┘
```

## Entrada

El código del juego **nunca pregunta por teclas**, sino por acciones definidas en `config/controls.js`:

```js
input.isDown('up')            // sostenida
input.wasPressed('interact')  // se activó en este paso
input.getAxis()               // {x, y} de longitud ≤ 1 (teclado + stick virtual)
input.getTaps()               // toques/clics nuevos (en coordenadas lógicas)
```

`TouchControls` traduce los toques a acciones virtuales (`setVirtual`, `setVirtualAxis`), por lo que **PC y Android comparten exactamente el mismo código de juego**. Un toque que cae en un botón virtual se marca `consumed` para que no lo reciba también otra capa.

## Niveles

Un nivel es un **objeto de datos** (ver `levels/dev/devTestRoom.js`): tamaño, puntos de aparición, diálogos, entidades y una función `drawBackground`. Como cada nivel dibuja su propio fondo, **cada uno puede tener una identidad visual completamente distinta** sin tocar el motor.

`Level` convierte la definición en algo jugable (entidades, colisiones con límites y sólidos, orden de dibujo por profundidad). `LevelScene` es genérica: sirve para cualquier nivel registrado.

## Guardado

- 3 espacios (`config.save.slots`), clave `rotonda.save.<n>` en `localStorage`; ajustes aparte (`rotonda.settings`).
- Cada partida lleva `version`. Para cambiar el formato: sube `SAVE_VERSION` y añade una migración en `save/schema.js`.
- `readSlot` devuelve `empty | ok | corrupt | newer` **sin tocar el dato**. `write` verifica leyendo de vuelta.
- Si `localStorage` no está disponible, se usa memoria (`persistent: false`) y la interfaz avisa.

Formato v1: `{ version, slot, createdAt, updatedAt, playtimeMs, levelId, player:{x,y}|null, zoom|null, flags:{} }`. `flags` es el lugar previsto para el progreso de historia y acertijos.

## Cómo añadir cosas

**Un nivel nuevo**
1. Copia `src/levels/dev/devTestRoom.js` a `src/levels/<nombre>.js` y edita los datos y `drawBackground`.
2. Impórtalo y añádelo a `LEVELS` en `src/levels/index.js`.
3. Para empezar en él: `startLevelId` en `config/config.js`.

**Un personaje u objeto nuevo**
1. Crea `src/characters/MiPersonaje.js` extendiendo `Entity` (o `NPC`).
2. Regístralo: `registerEntityType('mi_personaje', MiPersonaje)` en `levels/entityFactory.js`.
3. Úsalo en un nivel: `{ type: 'mi_personaje', x, y, ... }`.
4. Para que sea interactuable: `this.interactable = { radius, prompt }` y `onInteract(scene)`.

**Un diálogo**: añade una entrada a `dialogues` del nivel (`[{ speaker, text }, …]`) y llámalo con `scene.startDialogue('id')`.

**Una animación**: define clips para `Animator` y dibuja `animator.frame` en el `render()` de la entidad. Para movimientos/efectos de valores (fundidos, rebotes) usa `TweenManager`.

**Un recurso (imagen, JSON, audio)**: ponlo en `assets/…` y decláralo en `config/assets.js`. Si falla la carga, el juego sigue y usa su dibujo provisional.

**Una escena nueva**: crea la clase en `src/scenes/` o `src/ui/screens/` y regístrala en `src/scenes/index.js`.

**Una mecánica nueva**: crea un sistema en `src/engine/systems/` (clase simple con `update`), instáncialo en la escena que lo necesite.

## Rendimiento

- Sin librerías ni bundler: carga mínima, un solo canvas, sin trabajo por fotograma que no sea necesario.
- El fondo de la sala de pruebas solo dibuja lo visible (`camera.viewRect()`): el patrón a seguir en niveles grandes.
- Las entidades se ordenan por profundidad una vez por fotograma.
- Para arte pesado en el futuro: pre-renderizar fondos estáticos a un canvas fuera de pantalla y dibujarlos con `drawImage`.
