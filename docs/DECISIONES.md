# Decisiones técnicas

Registro de las decisiones importantes de la Etapa 00, con su motivo. Si una decisión cambia, se actualiza aquí.

## Decisiones

| # | Decisión | Motivo |
|---|---|---|
| 1 | **JavaScript con módulos ES nativos, sin bundler ni dependencias.** | Cero configuración, arranque instantáneo, el repositorio es lo que se publica. Menos piezas = menos cosas que rompan. |
| 2 | **Requiere servidor local** (no vale abrir `index.html` con doble clic). | Los navegadores bloquean módulos ES en `file://`. Se incluye `tools/serve.mjs` (sin dependencias) y GitHub Pages sirve el juego sin instalar nada. |
| 3 | **Resolución lógica fija 1280×720**, escalada con bandas. | El mismo código de juego y de interfaz sirve en cualquier pantalla. Densidad de píxeles limitada a 2× por rendimiento en móviles. |
| 4 | **Bucle de paso fijo (60 Hz).** | Comportamiento idéntico a cualquier tasa de refresco y colisiones estables. |
| 5 | **Entrada por acciones**, no por teclas. | PC y Android comparten código. Remapear controles en el futuro es cambiar `controls.js`. |
| 6 | **Interfaz dibujada en el canvas** (no DOM). | Mismo estilo artístico que el juego, funciona igual con teclado, ratón y táctil, y evita capas HTML superpuestas en móvil. |
| 7 | **Controles táctiles con stick flotante.** | Más cómodo que un stick fijo en pantallas pequeñas. Solo aparecen tras el primer toque real. |
| 8 | **Niveles como datos** + `drawBackground` propio. | Cada nivel puede tener una identidad visual distinta; añadir uno no toca el motor. |
| 9 | **Guardado versionado en `localStorage`**, 3 espacios, con migraciones. | Las partidas de versiones antiguas seguirán funcionando. |
| 10 | **Un guardado ilegible nunca se borra solo.** | Evitar pérdida de progreso por un error. Sobrescribir un espacio con datos siempre pide confirmación. |
| 11 | **`write()` verifica leyendo de vuelta**, con respaldo a memoria si `localStorage` falla. | Detecta cuota llena o almacenamiento bloqueado y lo comunica en vez de fingir que guardó. |
| 12 | **Todo el arte es provisional y está rotulado.** | El prompt prohíbe inventar diseños definitivos. El personaje, los marcadores y el tema de los menús se sustituyen sin cambiar la lógica (`theme.js`, `render()` de cada entidad). |
| 13 | **Sala de pruebas técnica** (`levels/dev/`) en lugar de un nivel real. | Hace falta *algo* donde probar movimiento, cámara, interacción, diálogos y guardado. Sus textos son de prueba, no de la historia. Se elimina quitándola de `levels/index.js`. |
| 14 | **Aviso de contenido discreto en el menú principal** (una línea). | El juego trata temas sensibles; el aviso completo está en el README. Un aviso previo más completo dentro del juego queda para una etapa posterior. |
| 15 | **Colisiones por tramos de 8 px.** | Una prueba automática detectó que un desplazamiento grande podía atravesar paredes finas. |
| 16 | **`tools/check.mjs` comprueba mayúsculas/minúsculas exactas en los imports.** | En Windows/macOS `Menu.js` y `menu.js` se confunden; en GitHub Pages (Linux) no, y el juego fallaría solo al publicarlo. |
| 17 | **Pruebas con Node y un canvas simulado**, sin framework. | Verifican el flujo real del juego sin instalar nada. No sustituyen una prueba visual en navegador. |

## Limitaciones conocidas (Etapa 00)

- **Probado en Chrome (escritorio y móvil emulado), no en un Android físico ni en Firefox/Safari.** Las pruebas automáticas validan lógica, rutas y flujo con un canvas simulado; además se recorrió el juego en Chrome real (menú → partida → diálogo → zoom → guardado en `localStorage` → recarga → continuar) y se simuló un móvil táctil (toque en menús, stick, botón de acción) sin errores de consola. Falta una comprobación en un dispositivo Android real y en otros navegadores (ver README → *Cómo ejecutar*).
- Sin soporte de mando/gamepad ni de pellizco (pinch) para el zoom táctil; en táctil el zoom se hace con los botones +/−.
- Sin pantalla completa ni ajustes de volumen/controles en la interfaz (los ajustes ya se guardan, falta la pantalla).
- Sin autoguardado: se guarda desde la pausa.
- Sin service worker / modo sin conexión.
- El audio está preparado (canales, carga, música, efectos) pero no hay recursos; el único sonido son pitidos provisionales de menú.
- Rotación de pantalla en móvil: el juego se reescala, pero no hay aviso para pedir orientación horizontal.

## Pendiente de decidir (para etapas posteriores)

- Licencia del proyecto y del arte.
- Formato definitivo de los diálogos largos (¿JSON externo por capítulo?) y si habrá opciones de respuesta.
- Pipeline de arte dibujado a mano: hojas de sprites vs. imágenes sueltas; resolución de origen.
- Estrategia de audio (formatos `.ogg`/`.mp3` según compatibilidad con Android/iOS).
- Si se añade un paso de compilación (minificar/empaquetar) cuando el proyecto crezca.
