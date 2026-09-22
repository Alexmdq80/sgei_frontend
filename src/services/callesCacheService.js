const DB_NAME = "sgei_calles_db";
const DB_VERSION = 2;
const STORE_CALLES = "localidades_calles";
const STORE_LOCALIDADES = "departamentos_localidades";

const CALLES_VERSION_KEY = "sgei_calles_version";
const LOCALIDADES_VERSION_KEY = "sgei_localidades_version";

// Si otra pestaña mantiene abierta la versión anterior, el upgrade queda bloqueado.
// Este timeout garantiza que la app degrade a red en vez de colgarse.
const DB_OPEN_TIMEOUT_MS = 1000;

class CallesCacheService {
  /** Abre y configura la base de datos IndexedDB con ambos almacenes */
  async openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        return reject(new Error("IndexedDB no soportado en este navegador"));
      }

      let settled = false;
      let timer = null;

      const finish = (fn) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        fn();
      };

      timer = setTimeout(
        () => finish(() => reject(new Error("Timeout abriendo IndexedDB"))),
        DB_OPEN_TIMEOUT_MS,
      );

      let req;
      try {
        req = window.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        finish(() => reject(e));
        return;
      }

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // Almacén 1: calles por localidad (NO se toca: sobrevive a la migración v1 -> v2)
        if (!db.objectStoreNames.contains(STORE_CALLES)) {
          db.createObjectStore(STORE_CALLES, { keyPath: "localidad_id" });
        }
        // Almacén 2: localidades por departamento (nuevo en v2)
        if (!db.objectStoreNames.contains(STORE_LOCALIDADES)) {
          db.createObjectStore(STORE_LOCALIDADES, {
            keyPath: "departamento_id",
          });
        }
      };
      req.onsuccess = () =>
        finish(() => {
          const db = req.result;
          // Si otra pestaña pide un upgrade futuro, cerramos para no bloquearla.
          db.onversionchange = () => db.close();
          resolve(db);
        });
      req.onerror = () => finish(() => reject(req.error));
      req.onblocked = () =>
        finish(() => reject(new Error("IndexedDB bloqueada por otra pestaña")));
    });
  }

  /* ========================================================
   * MÉTODOS DE CALLES (existentes)
   * ======================================================== */

  /** Obtiene las calles de una localidad desde IndexedDB */
  async getLocalidad(localidadId) {
    const key = Number(localidadId);
    if (!Number.isFinite(key)) return null;
    try {
      const db = await this.openDb();
      return await new Promise((resolve) => {
        const tx = db.transaction(STORE_CALLES, "readonly");
        const req = tx.objectStore(STORE_CALLES).get(key);
        req.onsuccess = () => {
          db.close();
          resolve(req.result || null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  /** Guarda o acumula las calles de una localidad en IndexedDB */
  async saveLocalidad(localidadId, calles) {
    const key = Number(localidadId);
    if (!Number.isFinite(key)) return;
    try {
      const db = await this.openDb();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_CALLES, "readwrite");
        tx.objectStore(STORE_CALLES).put({
          localidad_id: key,
          calles,
          savedAt: Date.now(),
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          resolve();
        };
      });
    } catch (e) {
      console.warn("No se pudo guardar la localidad en IndexedDB:", e);
    }
  }

  /** Purga el almacén de calles cuando la versión del catálogo de calles cambia */
  async clearAllCalles() {
    // Sin IndexedDB no hay nada que purgar (evita warnings ruidosos en jsdom).
    if (!window.indexedDB) return;
    try {
      const db = await this.openDb();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_CALLES, "readwrite");
        tx.objectStore(STORE_CALLES).clear();
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          resolve();
        };
      });
    } catch (e) {
      console.warn("Error al limpiar calles en IndexedDB:", e);
    }
  }

  /** Compara la versión del catálogo de calles del manifiesto y purga si cambió */
  async checkGlobalVersion(remoteVersion) {
    if (!remoteVersion) return;
    try {
      const currentVersion = localStorage.getItem(CALLES_VERSION_KEY);
      if (currentVersion !== remoteVersion) {
        await this.clearAllCalles();
        localStorage.setItem(CALLES_VERSION_KEY, remoteVersion);
      }
    } catch (e) {
      console.warn("Error al verificar versión global de calles:", e);
    }
  }

  /* ========================================================
   * MÉTODOS DE LOCALIDADES (nuevos)
   * ======================================================== */

  /** Obtiene las localidades de un departamento desde IndexedDB (array o null) */
  async getLocalidades(departamentoId) {
    const key = Number(departamentoId);
    if (!Number.isFinite(key)) return null;
    try {
      const db = await this.openDb();
      return await new Promise((resolve) => {
        const tx = db.transaction(STORE_LOCALIDADES, "readonly");
        const req = tx.objectStore(STORE_LOCALIDADES).get(key);
        req.onsuccess = () => {
          db.close();
          resolve(req.result ? req.result.localidades : null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  /**
   * Guarda las localidades de un departamento (un registro por departamento:
   * la acumulación es por clave, NO concatenando arrays).
   */
  async saveLocalidades(departamentoId, localidades) {
    const key = Number(departamentoId);
    if (!Number.isFinite(key) || !Array.isArray(localidades)) return;
    try {
      const db = await this.openDb();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_LOCALIDADES, "readwrite");
        tx.objectStore(STORE_LOCALIDADES).put({
          departamento_id: key,
          localidades,
          savedAt: Date.now(),
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          resolve();
        };
      });
    } catch (e) {
      console.warn("No se pudo guardar localidades en IndexedDB:", e);
    }
  }

  /** Purga TODO el almacén de localidades (no toca las calles) */
  async clearAllLocalidades() {
    // Sin IndexedDB no hay nada que purgar (evita warnings ruidosos en jsdom).
    if (!window.indexedDB) return;
    try {
      const db = await this.openDb();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_LOCALIDADES, "readwrite");
        tx.objectStore(STORE_LOCALIDADES).clear();
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          resolve();
        };
      });
    } catch (e) {
      console.warn("Error al limpiar localidades en IndexedDB:", e);
    }
  }

  /** Compara la versión del catálogo de localidades del manifiesto y purga si cambió */
  async checkLocalidadesVersion(remoteVersion) {
    if (!remoteVersion) return;
    try {
      const currentVersion = localStorage.getItem(LOCALIDADES_VERSION_KEY);
      if (currentVersion !== remoteVersion) {
        await this.clearAllLocalidades();
        localStorage.setItem(LOCALIDADES_VERSION_KEY, remoteVersion);
      }
    } catch (e) {
      console.warn("Error al verificar versión global de localidades:", e);
    }
  }

  /**
   * Purga AMBOS almacenes de IndexedDB (calles y localidades).
   * Punto único de entrada para invalidar la caché geográfica completa.
   */
  async clearAllStores() {
    await this.clearAllCalles();
    await this.clearAllLocalidades();
  }

  /**
   * Olvida las versiones sincronizadas desde el manifiesto.
   * Deja los almacenes en estado "por revalidar": el próximo syncWithManifest
   * vuelve a purgar (reintento si la purga anterior falló por bloqueo) y
   * guarda de nuevo la versión.
   */
  resetVersions() {
    try {
      localStorage.removeItem(CALLES_VERSION_KEY);
      localStorage.removeItem(LOCALIDADES_VERSION_KEY);
    } catch (e) {
      console.warn(
        "No se pudieron reiniciar las versiones de caché geográfica:",
        e,
      );
    }
  }

  /**
   * Purga los almacenes de IndexedDB y olvida las versiones.
   * Se invoca cuando cambia la estructura interna del caché (CACHE_VERSION)
   * o cuando el usuario pide limpiar la caché local.
   */
  async purge() {
    await this.clearAllStores();
    this.resetVersions();
  }
}

const callesCacheService = new CallesCacheService();
export default callesCacheService;
