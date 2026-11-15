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

## Decisiones de la Etapa 01 (multidispositivo)

| # | Decisión | Motivo |
|---|---|---|
| 18 | **Altura lógica fija (720) y ancho variable (960–1728)**, en lugar de una resolución 16:9 fija con bandas. | Aprovecha las pantallas panorámicas (20:9, 21:9) sin deformar y sin bandas. Como la altura no cambia, **físicas, velocidad y cámara no se tocan**. Fuera del rango se añaden bandas. |
| 19 | **Los niveles deben ser legibles en la zona central de 960×720.** | Es lo único que ven todas las pantallas. El resto es ambientación. Queda como pauta en `docs/DISPOSITIVOS.md`. |
| 20 | **Cálculo de layout como función pura** (`engine/layout.js`) separada del DOM. | Se prueba con cualquier proporción en Node, sin navegador. |
| 21 | **Recalcular una vez por fotograma y solo si el resultado cambia**; ancho lógico cuantizado a múltiplos de 16. | "Evitar redimensionamientos innecesarios": cambiar el tamaño de un canvas lo borra y es costoso; la barra de direcciones de Android no debe provocar trabajo. |
| 22 | **Tope de densidad 2× + presupuesto de 3 M píxeles.** | Conserva el límite existente y evita que una tablet 2× pinte 4 M de píxeles por fotograma. |
| 23 | **Áreas seguras leídas desde CSS** (`env(safe-area-inset-*)` vía un elemento sonda) y aplicadas solo a la interfaz. | JavaScript no puede leerlas directamente. El mundo se pinta hasta el borde; los controles y textos quedan dentro. |
| 24 | **Pantalla de giro en HTML/CSS** (media query `orientation: portrait`) y el motor usa el mismo criterio. | Funciona aunque falle el JavaScript y no depende del bloqueo del navegador. En vertical el juego se congela (sin lógica, dibujo, entradas ni audio). |
| 25 | **Se detecta la forma de la ventana**, no la orientación física del aparato. | Cubre multiventana de Android y ventanas de escritorio estrechas; es lo que realmente determina si el juego cabe. |
| 26 | **Bloqueo de orientación como extra**, más **botón de pantalla completa** (táctil) y **manifiesto con `orientation: landscape`**. | El bloqueo suele exigir pantalla completa (Chrome Android) y no existe en Safari/iOS. Sin una forma de entrar en pantalla completa sería inalcanzable. El manifiesto lo fija al instalar la app. Ver las limitaciones en `docs/DISPOSITIVOS.md`. |
| 27 | **Iconos del manifiesto provisionales** (color plano + círculo) en `assets/graphics/provisional/`. | Un manifiesto instalable los necesita. No son arte del juego; se sustituyen cuando exista. |
| 28 | **Controles táctiles dimensionados en píxeles CSS reales**, con tamaños mínimos cómodos (~48 px) y colocados dentro del área segura. | El mismo tamaño en unidades lógicas sería diminuto en un móvil de 412 px de alto. |
| 29 | **Los controles se atenúan si cubren al jugador o algo interactuable**, y se ocultan en diálogos. | "Evitar que los botones cubran elementos importantes" sin añadir interfaz. Una captura mostró el botón de acción sobre un marcador; ya está corregido. |
| 30 | **Menús con posición dinámica** (`x` y `width` como función) y zona táctil que llena los huecos; texto reducido en vez de cortado. | Se mantienen centrados al cambiar la proporción y son más cómodos con el dedo, sin cambiar su aspecto. |
| 31 | **Corregido un defecto previo**: el segundo botón del diálogo de confirmación sobresalía del panel. | Detectado al revisar la geometría de los menús. |

## Limitaciones conocidas (Etapa 00)

- **Probado en Chrome (escritorio y móvil emulado, 9 proporciones, giro y área segura emulada en la Etapa 01), no en un Android físico ni en Firefox/Safari.** Las pruebas automáticas validan lógica, rutas y flujo con un canvas simulado; además se recorrió el juego en Chrome real (menú → partida → diálogo → zoom → guardado en `localStorage` → recarga → continuar) y se simuló un móvil táctil (toque en menús, stick, botón de acción) sin errores de consola. Falta una comprobación en un dispositivo Android real y en otros navegadores (ver README → *Cómo ejecutar*).
- Sin soporte de mando/gamepad ni de pellizco (pinch) para el zoom táctil; en táctil el zoom se hace con los botones +/−.
- Sin pantalla de ajustes de volumen/controles en la interfaz (los ajustes ya se guardan, falta la pantalla).
- Sin autoguardado: se guarda desde la pausa.
- Sin service worker / modo sin conexión.
- El audio está preparado (canales, carga, música, efectos) pero no hay recursos; el único sonido son pitidos provisionales de menú.
- ~~Rotación de pantalla en móvil~~ → resuelto en la Etapa 01 (pantalla de giro). Las limitaciones de orientación de los navegadores están en `docs/DISPOSITIVOS.md`.

## Pendiente de decidir (para etapas posteriores)

- Licencia del proyecto y del arte.
- Formato definitivo de los diálogos largos (¿JSON externo por capítulo?) y si habrá opciones de respuesta.
- Pipeline de arte dibujado a mano: hojas de sprites vs. imágenes sueltas; resolución de origen.
- Estrategia de audio (formatos `.ogg`/`.mp3` según compatibilidad con Android/iOS).
- Si se añade un paso de compilación (minificar/empaquetar) cuando el proyecto crezca.
