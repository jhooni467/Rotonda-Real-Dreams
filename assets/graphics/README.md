# Recursos gráficos

Carpeta reservada para el arte de ROTONDA. **Está vacía a propósito**: en la Etapa 00 no hay arte definitivo y todo lo visible es dibujo provisional hecho con código.

## Cómo añadir un recurso

1. Guarda el archivo aquí, agrupado por uso, por ejemplo:
   ```
   assets/graphics/
   ├── characters/    (personajes y sus hojas de animación)
   ├── levels/        (fondos y elementos de cada nivel, una subcarpeta por nivel)
   └── ui/            (marcos, iconos, botones)
   ```
2. Decláralo en `src/config/assets.js`:
   ```js
   images: { 'player.idle': 'assets/graphics/characters/player_idle.png' },
   ```
3. Úsalo con `game.assets.getImage('player.idle')`. Si falla la carga devuelve `null` y el código usa su dibujo provisional.

## Convenciones sugeridas

- Nombres en minúsculas, sin espacios ni tildes (`fondo_bosque.png`): GitHub Pages distingue mayúsculas.
- Formatos: PNG o WebP. Evita archivos enormes: el juego debe cargar bien en móviles.
- Cada nivel puede tener su propio estilo; mantén sus recursos en su propia subcarpeta.
