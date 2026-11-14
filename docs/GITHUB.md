# Trabajar con ROTONDA en GitHub

Guía paso a paso. Se asume que tienes una cuenta de GitHub y Git instalado ([git-scm.com](https://git-scm.com)).

## 0. Antes de tocar nada: comprobar el estado

Haz esto siempre al empezar a trabajar o al unir con un repositorio existente:

```bash
git status            # ¿hay cambios sin guardar?
git remote -v         # ¿a qué repositorio de GitHub apunta?
git log --oneline -5  # últimos commits
ls                    # qué archivos hay
```

Si ya existe un repositorio de ROTONDA con archivos, **no copies encima a ciegas**: clónalo, compara y copia solo lo que falte (ver sección 2).

## 1. Crear el repositorio (si todavía no existe)

1. En GitHub: botón **New repository**.
2. Nombre: `rotonda`. Elige Público o Privado.
3. **No marques** "Add a README", ".gitignore" ni "license" (el proyecto ya trae sus archivos; si los marcas habrá conflictos al subir).
4. **Create repository**. GitHub mostrará la URL, por ejemplo `https://github.com/TU_USUARIO/rotonda.git`.

## 2. Subir el proyecto por primera vez

El proyecto ya viene con un repositorio Git local iniciado en la rama `main` y un primer commit. Desde la carpeta `rotonda/`:

```bash
git remote add origin https://github.com/TU_USUARIO/rotonda.git
git push -u origin main
```

GitHub pedirá autenticación. Las contraseñas de cuenta ya no valen para `git push`. Opciones:

- **GitHub CLI** (lo más fácil): instala `gh`, ejecuta `gh auth login` y repite el `git push`.
- **Token personal**: GitHub → *Settings → Developer settings → Personal access tokens*; úsalo como contraseña.
- **GitHub Desktop**: *File → Add local repository* y *Publish repository*.

**Si el repositorio de GitHub ya tenía archivos** y `git push` se rechaza:

```bash
git pull origin main --allow-unrelated-histories   # une los historiales
# revisa los conflictos si los hay, no borres nada sin estar seguro
git push -u origin main
```

> Alternativa sin Git: en la página del repositorio, **Add file → Upload files** y arrastra el contenido de la carpeta. Funciona, pero pierdes el historial de cambios; se recomienda Git.

## 3. Publicar el juego (GitHub Pages)

Así puedes jugar desde cualquier navegador y desde el Android **sin servidor local**:

1. En el repositorio: **Settings → Pages**.
2. En *Build and deployment*, **Source: Deploy from a branch**.
3. **Branch: `main`**, carpeta **`/ (root)`** → **Save**.
4. Tras uno o dos minutos, el juego queda en `https://TU_USUARIO.github.io/rotonda/`.

Todas las rutas del proyecto son relativas, así que funciona en esa subcarpeta sin cambios.

## 4. Flujo de trabajo diario

```bash
git pull                         # trae lo último (útil si trabajas desde varios equipos)
# ... haces cambios ...
npm run verify                   # comprueba sintaxis, rutas y pruebas (requiere Node 18+)
git status                       # revisa qué cambió
git add -A
git commit -m "Describe el cambio en una frase"
git push
```

Recomendaciones:

- **Un commit por cambio con sentido** ("Añade nivel X", "Corrige colisión con Y"), no uno enorme al final.
- Para cambios grandes o experimentales, usa una rama:
  ```bash
  git switch -c nombre-de-la-rama
  git push -u origin nombre-de-la-rama   # luego abre un Pull Request en GitHub
  ```
- Después de publicar, si no ves los cambios, recarga sin caché (`Ctrl+Shift+R`).
- Los **guardados** viven en el navegador (`localStorage`), no en el repositorio: cada dominio (`localhost`, `github.io`) tiene los suyos.

## 5. Probar antes de subir

```bash
npm run verify        # automático: estructura + 13 pruebas
npm start             # abre http://localhost:8080 y pruébalo a mano
```

Comprobación manual mínima: menú → Nueva partida → mover → interactuar con un marcador → pausa → Guardar → salir → Continuar. En el móvil, usa la dirección de red local que muestra `npm start`, o la URL de GitHub Pages.

## 6. Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| Pantalla negra / error de módulos al abrir `index.html` | Se abrió con doble clic (`file://`). Usa un servidor (`npm start`). |
| Funciona en tu PC pero no en GitHub Pages | Mayúsculas/minúsculas distintas en el nombre de un archivo importado. `npm run check` lo detecta. |
| 404 en `github.io` | Pages aún no terminó de publicar, o la rama/carpeta de *Settings → Pages* no es `main` / root. |
| `git push` rechazado | El remoto tiene commits que no tienes: `git pull` primero (ver sección 2). |
| Los guardados "desaparecen" | Modo privado del navegador, datos del sitio borrados, o otro dominio. El juego avisa cuando el navegador bloquea el almacenamiento. |
