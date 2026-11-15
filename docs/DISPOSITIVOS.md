# Dispositivos, pantallas y orientación

ROTONDA se juega **solo en horizontal**, en navegadores de PC y en teléfonos y tablets Android. Esta guía explica cómo se adapta a cada pantalla, qué se puede (y qué no) garantizar sobre la orientación, y cómo probarlo.

## 1. Cómo se adapta a la pantalla

La resolución lógica de referencia sigue siendo **1280 × 720** (16:9), pero ahora solo la **altura** es fija:

- **Altura lógica: siempre 720.** Física, cámara, tamaño del personaje y arte se miden contra ella. Por eso el movimiento es idéntico en cualquier dispositivo.
- **Ancho lógico: variable**, según la proporción de la pantalla, entre **960 (4:3)** y **1728 (2,4:1)**, en múltiplos de 16.
- La escala es **uniforme**: nada se estira ni se deforma. Si la proporción queda fuera del rango (p. ej. un monitor 32:9 o una ventana casi cuadrada) se añaden **bandas** y el juego se centra.

| Pantalla (horizontal) | Proporción | Ancho lógico | Qué ocurre |
|---|---|---|---|
| Teléfono 20:9 (915×412) | 2,22 | 1600 | ve más escenario a los lados |
| Teléfono 21:9 (1008×432) | 2,33 | 1680 | ídem |
| Teléfono/PC 16:9 | 1,78 | 1280 | la referencia |
| Tablet 16:10 (1280×800) | 1,60 | 1152 | |
| Tablet 4:3 (1024×768) | 1,33 | 960 | ve el mínimo |
| Ultrapanorámico 32:9 | 3,56 | 1728 | bandas laterales |
| Ventana casi cuadrada 5:4 | 1,25 | 960 | bandas arriba y abajo |

> **Pauta para niveles futuros:** todo lo imprescindible para jugar (personaje, acertijos, textos, salidas) debe caber en la **zona central de 960 × 720**, porque es lo único que ven todas las pantallas. Lo que quede a los lados de esa zona es ambientación extra. El ancho disponible se lee siempre de `game.renderer.width`; nunca se escribe 1280 a mano.

**Cuándo se recalcula.** Los eventos del navegador (cambio de tamaño, giro, pantalla completa) solo marcan el layout como pendiente; se recalcula **una vez** al inicio del siguiente fotograma, y solo si el resultado cambió de verdad (el ancho lógico está cuantizado, así que la barra de direcciones que aparece y desaparece en Android no provoca trabajo). Si nada cambió no se toca el DOM ni las escenas. Mientras la ventana está en vertical no se recalcula nada.

**Rendimiento.** Se mantiene el tope de densidad de píxeles (`maxPixelRatio`, 2×) y se añade un presupuesto total (`maxPixels`, 3 millones de píxeles): en una tablet de 1280×800 con pantalla 2× el juego baja a ~1,7× en lugar de pintar 4 millones de píxeles. Ambos valores están en `src/config/config.js`.

## 2. Áreas seguras (notch, esquinas redondeadas, barra de gestos)

`index.html` usa `viewport-fit=cover`, así que el juego puede pintar bajo el notch. A cambio, el motor mide las áreas seguras (`src/engine/SafeArea.js`, con un elemento invisible `#safe-probe` que usa `env(safe-area-inset-*)`) y las convierte a unidades lógicas en `renderer.safe` / `renderer.safeRect`. Quedan dentro de ellas: los controles táctiles, el botón de pantalla completa, los textos de esquina, el aviso de guardado y la caja de diálogos. Las bandas absorben la parte del área segura que ya queda fuera del canvas.

Los fondos y el mundo **sí** se pintan hasta el borde de la pantalla; solo la interfaz respeta las áreas seguras.

## 3. Orientación: qué se hace y qué NO se puede garantizar

### Lo que hace el juego (de más fiable a menos)

1. **Pantalla de giro (HTML/CSS, siempre).** Si la ventana es más alta que ancha, `index.html` muestra "Gira tu dispositivo" con un teléfono animado. Es CSS puro (`@media (orientation: portrait)`): funciona aunque el JavaScript no llegue a cargar. En PC (puntero de ratón) el mensaje pide ensanchar la ventana.
2. **Congelación del juego (motor).** El motor aplica el mismo criterio (`matchMedia('(orientation: portrait)')`). En vertical no se actualiza la lógica, no se dibuja el canvas, se descartan las entradas y se suspende el audio. Al volver a horizontal continúa exactamente donde estaba, sin perder tiempo de juego ni progreso, y sin reconstruir la interfaz si el tamaño es el mismo.
3. **Bloqueo de orientación (si el navegador lo permite).** Se intenta `screen.orientation.lock('landscape')` en el primer gesto del usuario (solo en táctiles) y otra vez al entrar en pantalla completa; al salir se desbloquea. Un rechazo es normal y no produce ningún error.
4. **Botón de pantalla completa** (esquina superior izquierda, solo en táctiles; tecla `F` en PC), porque es la condición habitual para que el bloqueo funcione.
5. **Manifiesto web** (`manifest.webmanifest`) con `"orientation": "landscape"` y `"display": "fullscreen"`: al **instalar** el juego como app en Android, el sistema lo abre ya en horizontal y a pantalla completa. Los iconos actuales son provisionales (`assets/graphics/provisional/`).

### Limitaciones de los navegadores

| Situación | Comportamiento |
|---|---|
| **Chrome en Android, pestaña normal** | `screen.orientation.lock()` normalmente **se rechaza** si la página no está en pantalla completa. Con el botón de pantalla completa suele funcionar. |
| **Chrome en Android, app instalada** | El manifiesto fija la orientación; es el caso más sólido. |
| **Firefox en Android** | Soporta `lock()` desde la versión 144, con condiciones parecidas (pantalla completa). Versiones anteriores: sin bloqueo. |
| **Safari / iPhone / iPad** | **No soporta `lock()`** (en WebKit sigue tras un indicador experimental), y en iPhone la API de pantalla completa de páginas tampoco está disponible, por lo que el botón no se muestra. Solo funciona la pantalla de giro. |
| **Navegadores de PC** | `lock()` suele no estar disponible o no aplicar; no es necesario. |
| **Giro automático desactivado** en el sistema | El navegador no cambia de orientación y el aparato queda en vertical: el jugador verá la pantalla de giro y debe activarlo o girar con el bloqueo del sistema. Ninguna web puede evitarlo. |
| **Android con ventana dividida / ventana flotante** | La forma de la ventana puede ser vertical aunque el aparato esté en horizontal; se muestra la pantalla de giro (se detecta la forma de la **ventana**, no la orientación física). |
| **Retraso al girar** | Algunos navegadores comunican el tamaño nuevo con retraso; el motor vuelve a comprobarlo 250 ms después de cada giro. |

Conclusión: **el bloqueo es un extra, no una garantía.** La pantalla de giro es la única protección que funciona en todos los navegadores, y por eso no se depende del bloqueo.

*Fuentes consultadas el 14-nov-2026: MDN (`ScreenOrientation.lock()`) y el explorador de web-features (compatibilidad). Los comportamientos de Chrome en Android con app instalada y de Firefox ≥ 144 no se han probado en un dispositivo físico (ver §6).*

## 4. Controles táctiles

Se definen en **píxeles CSS reales** (`CONFIG.ui.touch`) y el motor los convierte a unidades lógicas según el tamaño en que se muestra el juego; así el botón mide lo mismo para el dedo en un móvil pequeño que en una tablet:

- Botones secundarios (pausa, zoom): ~48 px de diámetro. Botón de acción: ~92 px. Stick: radio ~62 px.
- Zona táctil de cada botón ampliada con un margen (`hitSlopCss`). Las opciones de los menús también llenan el hueco entre ellas.
- Todo colocado dentro del área segura, con margen (`ui.safeMargin`).
- **Para no cubrir lo importante:** los controles se vuelven casi transparentes cuando quedan encima del jugador o de algo interactuable, y se ocultan durante los diálogos. El stick es flotante: aparece donde pones el dedo.
- Los textos secundarios nunca bajan de ~11 px reales (`ui.minTextCss`).
- Tamaño mínimo soportado con comodidad: **640 × 360** px CSS.

## 5. Cómo probar

```bash
npm run verify     # sintaxis, rutas, manifiesto y pruebas (proporciones, áreas seguras, giro, táctil…)
npm start          # http://localhost:8080 (y la dirección de red local para el móvil)
```

- **Escritorio, sin móvil:** Chrome → F12 → *Toggle device toolbar* (Ctrl+Shift+M) → elige un teléfono/tablet y gira con el icono de rotar. Con `F3` el juego muestra el tamaño lógico, el CSS, la densidad, las áreas seguras y el estado del bloqueo.
- **Áreas seguras:** para probarlas sin un móvil con notch se puede forzar un valor por CDP (`Emulation.setSafeAreaInsetsOverride`, con Playwright o Puppeteer); así se verificó esta etapa. Lo ideal es confirmarlo en un dispositivo real.
- **Móvil real:** abre la dirección de red local (mismo Wi-Fi) o la URL de GitHub Pages y comprueba: giro a vertical (pantalla de giro y juego congelado), giro de vuelta, botón de pantalla completa y si el bloqueo funciona. El estado del bloqueo aparece en la ventana de depuración (`F3` en PC) y en `window.rotonda.orientation.lockState` con depuración remota de Chrome (`chrome://inspect`).

## 6. Lo que se probó y lo que no

Probado (Chrome real, controlado por Playwright): 9 tamaños (teléfonos 20:9, 19,5:9 y 21:9; tablets 16:10 y 4:3; 640×360; 1080p; 32:9; 5:4) sin desbordes, deformaciones ni errores de consola; giro a vertical y regreso; arranque en vertical; áreas seguras con notch emulado; manifiesto válido sin errores; botón de pantalla completa.

**No probado todavía:** un Android físico (comportamiento real del bloqueo, de la instalación como app, de las barras del sistema y de las áreas seguras de cada fabricante), Firefox, Safari/iOS. Antes de dar la etapa por cerrada conviene una prueba en al menos un teléfono y una tablet reales.

## 7. Límites conocidos

- Sin pellizco (pinch) para el zoom táctil; se usa +/−.
- Sin pantalla de ajustes (volumen, controles táctiles); los valores ya se guardan.
- Sin service worker: el juego instalado necesita conexión la primera vez y no funciona sin red.
- Los iconos del manifiesto son provisionales.
