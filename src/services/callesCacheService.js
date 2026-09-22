const DB_NAME = "sgei_calles_db";
const DB_VERSION = 1;
const STORE_NAME = "localidades_calles";
const VERSION_KEY = "sgei_calles_version";

class CallesCacheService {
    /** Abre y configura la base de datos IndexedDB */
    async openDb() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return reject(new Error("IndexedDB no soportado en este navegador"));
            }
            const req = window.indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "localidad_id" });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    /** Obtiene las calles de una localidad desde IndexedDB */
    async getLocalidad(localidadId) {
        try {
            const db = await this.openDb();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, "readonly");
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(Number(localidadId));
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    /** Guarda o acumula las calles de una localidad en IndexedDB */
    async saveLocalidad(localidadId, calles) {
        try {
            const db = await this.openDb();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                store.put({
                    localidad_id: Number(localidadId),
                    calles,
                    savedAt: Date.now(),
                });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {
            console.warn("No se pudo guardar la localidad en IndexedDB:", e);
        }
    }

    /** Purga todo el almacén de calles cuando la versión de CatalogoVersion cambia */
    async clearAll() {
        try {
            const db = await this.openDb();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {
            console.warn("Error al limpiar IndexedDB:", e);
        }
    }

    /** Compara la versión del catálogo de calles del manifiesto y purga si cambió */
    async checkGlobalVersion(remoteVersion) {
        if (!remoteVersion) return;
        try {
            const currentVersion = localStorage.getItem(VERSION_KEY);
            if (currentVersion !== remoteVersion) {
                await this.clearAll();
                localStorage.setItem(VERSION_KEY, remoteVersion);
            }
        } catch (e) {
            console.warn("Error al verificar versión global de calles:", e);
        }
    }
}

const callesCacheService = new CallesCacheService();
export default callesCacheService;