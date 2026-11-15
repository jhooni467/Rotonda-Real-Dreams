# ROTONDA

> Un niño con apariencia de peluche despierta en un mundo que no es del todo un sueño.

**ROTONDA** es una aventura 2D de exploración, acertijos y surrealismo. Se juega en el navegador, en PC y en Android.

**Estado del proyecto:** Etapa 01 · adaptabilidad multidispositivo (sobre la estructura base de la Etapa 00). Todavía no hay historia, niveles ni arte definitivos: este repositorio contiene los cimientos técnicos sobre los que se construirá el juego.

---

## ⚠️ Advertencias de contenido

ROTONDA tiene un tono emocional y personal. Antes de jugar, ten en cuenta que incluirá:

- **Temas psicológicos y emocionales sensibles.**
- **Representaciones simbólicas de experiencias traumáticas.**
- **Referencias al suicidio.**
- **Ambientes inquietantes y situaciones perturbadoras.**
- **Elementos surrealistas que pueden generar incomodidad.**

El juego aborda estos temas desde una perspectiva **narrativa, humana y orientada a la recuperación**. No pretende romantizar el sufrimiento ni presentarlo como una salida.

Si estos temas te afectan o estás pasando por un momento difícil, puedes tomarte un descanso o dejar de jugar cuando lo necesites. Hablar con alguien de confianza o con un profesional puede ayudar; si estás en peligro inmediato, contacta con los servicios de emergencia de tu país. Puedes encontrar líneas de ayuda por país en [findahelpline.com](https://findahelpline.com).

---

## 🧸 De qué trata

Un niño con apariencia de peluche queda atrapado en un extraño mundo onírico. Sus escenarios, personajes y situaciones representan, de forma simbólica, distintas experiencias y emociones de su vida. Explorar ese mundo y resolver sus acertijos es la manera de avanzar y de entender dónde está.

*(Este README no revela acontecimientos de la historia.)*

| | |
|---|---|
| **Género** | Aventura 2D · exploración · acertijos · surrealismo |
| **Plataformas** | Navegadores de PC y Android (controles adaptables) |
| **Tecnología** | HTML · CSS · JavaScript (módulos ES) · Canvas 2D — sin dependencias |

### Dirección artística

- Ilustración 2D con apariencia **dibujada a mano**.
- Personajes **adorables y expresivos**.
- Escenarios **surrealistas y experimentales**.
- Texturas, trazos y formas **irregulares**.
- Contrastes entre ambientes bonitos, melancólicos e inquietantes.
- Cada nivel podrá tener una **identidad visual completamente distinta**.

> Todo lo que se ve ahora mismo en el juego (personaje, marcadores, menús, fondo de la sala de pruebas) es **provisional** y está rotulado como tal. No representa el diseño final.

---

## ▶️ Cómo ejecutar el juego

Los navegadores bloquean los módulos de JavaScript si abres `index.html` con doble clic (`file://`), así que hace falta un servidor local. Elige **una** opción:

**Con Node.js 18 o superior** (incluye un servidor sin dependencias):

```bash
node tools/serve.mjs
# o:  npm start
```

**Con Python 3:**

```bash
python3 -m http.server 8080
```

Abre <http://localhost:8080>.

**Para probar en un Android:** con `node tools/serve.mjs` el terminal muestra también una dirección de red local (`http://192.168.x.x:8080`). Abre esa dirección en el navegador del móvil, conectado al mismo Wi-Fi. Los controles táctiles aparecen al primer toque.

**Sin instalar nada:** publícalo con GitHub Pages (ver [docs/GITHUB.md](docs/GITHUB.md)).

### Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Moverse | `WASD` / flechas | Stick flotante (mitad izquierda) |
| Interactuar / avanzar diálogo | `E` · `Enter` · `Espacio` | Botón **Acción** o tocar la pantalla |
| Pausa | `Esc` · `P` | Botón **II** |
| Zoom | `+` / `−` o rueda del ratón | Botones **+** / **−** |
| Menús | Flechas + `Enter` | Tocar la opción |
| Pantalla completa | `F` | Botón de la esquina superior izquierda |
| Depuración (FPS, tamaño, áreas seguras) | `F3` | — |

### 📱 Teléfonos y tablets

ROTONDA se juega **solo en horizontal**. Con el dispositivo en vertical aparece una pantalla de "Gira tu dispositivo" y el juego queda en pausa hasta que lo giras. La imagen se adapta a cualquier proporción (de 4:3 a 21:9) sin deformarse, respeta las áreas seguras (notch, esquinas, barra de gestos) y los controles táctiles se ajustan al tamaño de la pantalla. El bloqueo de orientación del navegador se intenta cuando es posible, pero **no está garantizado** (por ejemplo, no existe en Safari/iPhone). Todos los detalles y limitaciones: [docs/DISPOSITIVOS.md](docs/DISPOSITIVOS.md).

### Qué puedes probar en esta etapa

Menú principal → **Nueva partida** (3 espacios de guardado) → una **sala de pruebas técnica** donde puedes moverte, ver cómo la cámara te sigue, acercar/alejar el zoom, interactuar con dos marcadores para probar los diálogos, pausar, **guardar** y volver con **Continuar**.

---

## ✅ Comprobar que todo funciona

Solo necesitas Node.js 18+ (no hay nada que instalar):

```bash
npm run check    # sintaxis, rutas de imports, manifiesto y archivos obligatorios
npm test         # pruebas automáticas (cámara, diálogos, guardado, colisiones, proporciones de pantalla, giro, táctil, flujo completo…)
npm run verify   # las dos anteriores
```

---

## 🗂️ Estructura del proyecto

```
rotonda/
├── index.html                 Página que aloja el canvas y la pantalla de giro
├── manifest.webmanifest       Manifiesto de app instalable (orientación horizontal)
├── css/main.css               Estilos de la página contenedora y de la pantalla de giro
├── src/
│   ├── main.js                Punto de entrada
│   ├── config/                Configuración general (valores, controles, tema, manifiesto de recursos)
│   ├── engine/                Motor y lógica: bucle, render y layout, entrada, cámara, escenas, orientación
│   │   └── systems/           Sistemas de juego: interacción y diálogos
│   ├── characters/            Personajes y entidades (Entity, Player, NPC)
│   ├── levels/                Gestión de niveles y definiciones de cada nivel
│   │   └── dev/               Sala de pruebas técnica (provisional)
│   ├── scenes/                Escenas del juego: arranque y nivel
│   ├── ui/                    Interfaz: menús, caja de diálogo, controles táctiles
│   │   └── screens/           Pantallas: menú principal, partidas, pausa, confirmación
│   ├── animation/             Animator (fotogramas), Tween y easing
│   ├── audio/                 Audio con Web Audio API
│   └── save/                  Guardado: espacios, versionado, almacenamiento
├── assets/
│   ├── graphics/              Recursos gráficos (vacío: aún no hay arte definitivo)
│   └── audio/                 Música y efectos (vacío)
├── docs/                      Arquitectura, decisiones técnicas y guía de GitHub
├── tools/                     serve.mjs (servidor local) y check.mjs (verificación)
└── tests/                     Pruebas automáticas
```

## 📚 Documentación técnica

- [**Arquitectura**](docs/ARQUITECTURA.md): cómo encajan las piezas y cómo añadir niveles, personajes, animaciones y sonidos.
- [**Dispositivos y orientación**](docs/DISPOSITIVOS.md): adaptación a pantallas, áreas seguras, orientación y sus limitaciones en los navegadores.
- [**Decisiones técnicas**](docs/DECISIONES.md): qué se decidió, por qué, y qué queda pendiente.
- [**GitHub**](docs/GITHUB.md): crear el repositorio, subir cambios, publicar y seguir trabajando.

## 🧭 Siguientes etapas (orientativo)

La base está preparada para crecer sin reconstruirla: primer nivel real, arte definitivo, personajes y animaciones, música y efectos, acertijos, y la historia. Cada una se añade como módulo nuevo; ver la guía de arquitectura.

## Licencia

Por definir.
