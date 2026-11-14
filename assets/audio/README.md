# Audio y efectos

Carpeta reservada para la música y los efectos de sonido de ROTONDA. **Está vacía a propósito**: aún no hay audio definitivo (los menús usan pitidos provisionales generados por código).

## Cómo añadir un sonido

1. Guarda el archivo aquí (`assets/audio/music/…`, `assets/audio/sfx/…`).
2. Decláralo en `src/config/assets.js`:
   ```js
   audio: { 'sfx.paso': 'assets/audio/sfx/paso.ogg', 'musica.menu': 'assets/audio/music/menu.ogg' },
   ```
3. Reprodúcelo desde el código:
   ```js
   game.audio.playSfx('sfx.paso');
   game.audio.playMusic('musica.menu', { fade: 1.5 });
   ```

## Notas

- Los navegadores no reproducen sonido hasta que el usuario toca o pulsa algo; el motor desbloquea el audio con el primer gesto.
- Formatos recomendados: `.ogg` (Android/PC) con `.mp3` de respaldo si se necesita compatibilidad con Safari/iOS.
- Nombres en minúsculas y sin espacios.
