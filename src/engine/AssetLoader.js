/**
 * Carga de recursos (imágenes, JSON, audio) a partir del manifiesto.
 *
 * Política: un recurso que falla NO rompe el juego. Se avisa por consola y
 * get*() devuelve null para que el código use su dibujo provisional.
 */
export class AssetLoader {
  constructor({ audio = null } = {}) {
    this.audio = audio;
    this.images = new Map();
    this.json = new Map();
    this.failed = [];
  }

  async loadManifest(manifest, onProgress) {
    const jobs = [
      ...Object.entries(manifest.images ?? {}).map(([key, url]) => () => this._loadImage(key, url)),
      ...Object.entries(manifest.json ?? {}).map(([key, url]) => () => this._loadJson(key, url)),
      ...Object.entries(manifest.audio ?? {}).map(([key, url]) => () => this._loadAudio(key, url)),
    ];

    let done = 0;
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await job();
        } catch (err) {
          console.warn('[AssetLoader] No se pudo cargar un recurso:', err.message);
        }
        done++;
        onProgress?.(done, jobs.length);
      }),
    );
    return { total: jobs.length, failed: this.failed.length };
  }

  _loadImage(key, url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        resolve();
      };
      img.onerror = () => {
        this.failed.push(url);
        reject(new Error(`imagen "${key}" (${url})`));
      };
      img.src = url;
    });
  }

  async _loadJson(key, url) {
    const res = await fetch(url);
    if (!res.ok) {
      this.failed.push(url);
      throw new Error(`json "${key}" (${url}) → HTTP ${res.status}`);
    }
    this.json.set(key, await res.json());
  }

  async _loadAudio(key, url) {
    if (!this.audio) return;
    try {
      await this.audio.registerSource(key, url);
    } catch (err) {
      this.failed.push(url);
      throw err;
    }
  }

  getImage(key) {
    return this.images.get(key) ?? null;
  }

  getJson(key) {
    return this.json.get(key) ?? null;
  }
}
