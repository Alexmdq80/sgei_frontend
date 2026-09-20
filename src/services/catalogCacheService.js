import api from "./api";

const CACHE_VERSION = "v1.0.0"; // Incrementar si cambia la estructura interna de los objetos
const PREFIX = "sgei_cat_";

/**
 * Servicio defensivo de caché local para catálogos.
 * Si algo falla (cuota, JSON inválido, modo incógnito), se degrada a llamadas directas a la red sin romper la app.
 */
class CatalogCacheService {
  constructor() {
    this.checkVersion();
  }

  /**
   * Si la versión global de la app cambió, purga los datos viejos automáticamente.
   */
  checkVersion() {
    try {
      const storedVersion = localStorage.getItem(`${PREFIX}version`);
      if (storedVersion !== CACHE_VERSION) {
        this.clearAll();
        localStorage.setItem(`${PREFIX}version`, CACHE_VERSION);
      }
    } catch (e) {
      console.warn("Almacenamiento local no disponible:", e);
    }
  }

  /**
   * Obtiene un catálogo con protección try/catch y validación de estructura.
   */
  get(key) {
    try {
      const raw = localStorage.getItem(`${PREFIX}${key}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      // Blindaje: verificar que sea un array válido con elementos
      if (parsed && Array.isArray(parsed.data)) {
        return {
          data: parsed.data,
          hash: parsed.hash,
        };
      }
      // Si la estructura no es válida, limpiamos esa clave
      localStorage.removeItem(`${PREFIX}${key}`);
      return null;
    } catch (error) {
      console.warn(`Error al leer caché de ${key}, purgando...`, error);
      try {
        localStorage.removeItem(`${PREFIX}${key}`);
      } catch (cleanError) {
        void cleanError;
      }
      return null;
    }
  }

  /**
   * Guarda un catálogo con su hash de versión.
   */
  set(key, data, hash) {
    try {
      if (!Array.isArray(data)) return;
      const payload = JSON.stringify({ data, hash, savedAt: Date.now() });
      localStorage.setItem(`${PREFIX}${key}`, payload);
    } catch {
      // Si se excede la cuota de almacenamiento, no detiene la ejecución
      console.warn(`No se pudo cachear ${key} (posible cuota excedida).`);
    }
  }

  /**
   * Función Maestra: Devuelve el dato local si es válido; si no, llama a la API.
   * Con forceFresh = true se saltea el caché y se va directo a la red (y luego se actualiza).
   */
  async getOrFetch(key, fetcher, forceFresh = false) {
    if (!forceFresh) {
      const cached = this.get(key);
      if (cached && cached.data) {
        return cached.data;
      }
    }

    // Fallback directo a la API si no hay caché (o si se forzó el refresco)
    const freshData = await fetcher();
    // Lo guardamos sin hash específico hasta la próxima sincronización de manifiesto
    this.set(key, freshData, "initial");
    return freshData;
  }

  /**
   * Invalida una clave específica o claves que comiencen con el prefijo dado.
   */
  invalidate(keyPrefix) {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`${PREFIX}${keyPrefix}`))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      void e;
    }
  }

  /**
   * Sincroniza en segundo plano comparando los hashes del backend con los locales.
   */
  async syncWithManifest(catFetchers = {}) {
    try {
      const response = await api.get("/catalogos/manifest");
      const manifest = response.data;

      for (const [key, remoteHash] of Object.entries(manifest)) {
        const cached = this.get(key);

        // Si el hash remoto cambió (o no hay caché), purgamos SIEMPRE:
        // evita que el fetcher lea datos obsoletos vía getOrFetch y "envenene" el caché.
        if (!cached || cached.hash !== remoteHash) {
          this.invalidate(key);

          const fetcher = catFetchers[key];
          if (fetcher) {
            try {
              const freshData = await fetcher();
              this.set(key, freshData, remoteHash);
            } catch (err) {
              console.warn(`Fallo al sincronizar ${key}:`, err);
            }
          }
        }
      }
    } catch (error) {
      console.warn("No se pudo verificar el manifiesto de catálogos:", error);
    }
  }

  /**
   * Limpieza de emergencia.
   */
  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      void e;
    }
  }
}

const catalogCache = new CatalogCacheService();
export default catalogCache;
