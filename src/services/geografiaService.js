import api from "./api";
import catalogCache from "./catalogCacheService";
import callesCacheService from "./callesCacheService";
import { normalizeSearch } from "../utils/searchText";
import {
  crearBuscadorAsync,
  BUSCADOR_LOCALIDADES,
  MAX_RESULTADOS,
  MIN_CARACTERES,
  enIdle,
} from "../utils/catalogSearchIndex";

// Re-export: mantiene el contrato histórico (tests y consumidores que importan
// `normalizeSearch` desde este servicio) sin duplicar el algoritmo, que ahora
// vive en `utils/searchText.js`.
export { normalizeSearch };

let memoriaLocalidades = null;
let cargandoCatalogoPromise = null;

// Índice MiniSearch de localidades. Reemplaza a preindexarLocalidades/_searchKey:
// la normalización se hace UNA vez dentro de la librería, en vez de recalcular
// dos claves por registro en cada hidratación desde IndexedDB.
let buscadorLocalidades = null;
let construyendoBuscador = null;
// Token de generación: permite descartar un build que quedó obsoleto porque el
// catálogo se re-sincronizó MIENTRAS se estaba construyendo (addAllAsync cede
// el control durante cientos de ms, así que la ventana es real).
let generacionBuscador = 0;
/**
 * Servicio para obtener datos geográficos con soporte de caché blindado y fallback a red.
 */
const geografiaService = {
  /**
   * Obtiene provincias desde el caché blindado (o red si no está cargado).
   */
  async getProvincias(params = {}) {
    const hasCustomParams = Object.keys(params).some(
      (k) => k !== "per_page" || params[k] !== 500,
    );

    if (!hasCustomParams) {
      return catalogCache.getOrFetch("provincias", async () => {
        const response = await api.get("/provincias");
        return response.data;
      });
    }

    const response = await api.get("/provincias", { params });
    return response.data;
  },
  /**
   * Obtiene las regiones educativas (opcionalmente filtradas por provincia).
   * Acepta tanto un provinciaId directamente como un objeto de parámetros { provincia_id }.
   */
  async getRegiones(provinciaOrParams = {}) {
    const provinciaId =
      typeof provinciaOrParams === "object"
        ? provinciaOrParams?.provincia_id
        : provinciaOrParams;

    const cacheKey = provinciaId
      ? `regiones_prov_${provinciaId}`
      : "regiones_todas";

    return catalogCache.getOrFetch(cacheKey, async () => {
      const params = provinciaId ? { provincia_id: provinciaId } : {};
      const response = await api.get("/regiones", { params });
      return response.data;
    });
  },

  /**
   * Departamentos de una provincia con soporte de caché compuesto.
   */
  async getDepartamentos(provinciaId, params = {}) {
    if (!provinciaId) return [];

    const hasCustomParams = Object.keys(params).some(
      (k) => k !== "provincia_id" && (k !== "per_page" || params[k] !== 500),
    );

    if (!hasCustomParams) {
      return catalogCache.getOrFetch(
        `departamentos_prov_${provinciaId}`,
        async () => {
          const response = await api.get("/departamentos", {
            params: { provincia_id: provinciaId },
          });
          return response.data;
        },
      );
    }

    const response = await api.get("/departamentos", {
      params: { ...params, provincia_id: provinciaId },
    });
    return response.data;
  },

  /**
   * Obtiene las localidades de un departamento usando IndexedDB como primer nivel
   * de caché (0 ms en revisitas) y la API como fallback seguro.
   */
  async getLocalidades(departamentoId, params = {}) {
    if (!departamentoId) return [];

    const hasCustomParams = Object.keys(params).some(
      (k) => k !== "departamento_id" && (k !== "per_page" || params[k] !== 500),
    );

    if (!hasCustomParams) {
      // Normalizamos la clave: IndexedDB distingue 64 (número) de "64" (string).
      const numericId = Number(departamentoId);
      const depId = Number.isFinite(numericId) ? numericId : null;

      if (depId !== null) {
        try {
          const cached = await callesCacheService.getLocalidades(depId);
          if (Array.isArray(cached) && cached.length > 0) {
            return cached;
          }
        } catch (e) {
          // Degradación segura: si IndexedDB falla, seguimos por red.
          console.warn("Lectura de localidades en IndexedDB falló:", e);
        }
      }

      const response = await api.get("/localidades", {
        params: { departamento_id: depId ?? departamentoId },
      });

      // Persistimos en segundo plano: no debe demorar ni bloquear el render.
      if (
        depId !== null &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        void callesCacheService.saveLocalidades(depId, response.data);
      }

      return response.data;
    }

    const response = await api.get("/localidades", {
      params: { ...params, departamento_id: departamentoId },
    });
    return response.data;
  },

  /**
   * Obtiene todas las localidades (con filtros opcionales de query).
   */
  async getAllLocalidades(params = {}) {
    const response = await api.get("/localidades", { params });
    return response.data;
  },
  /**
   * Descarga el catálogo completo, lo persiste en IndexedDB y lo precarga en RAM.
   */
  async syncCatalogoLocalidadesCompleto() {
    try {
      const response = await api.get("/localidades/catalogo-completo");
      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        memoriaLocalidades = data;
        this.invalidarBuscadorLocalidades(); // el catálogo cambió: el índice quedó obsoleto
        void callesCacheService.saveCatalogoLocalidades(data);
      }
      return data;
    } catch (error) {
      console.warn(
        "Fallo al descargar catálogo completo de localidades:",
        error,
      );
      throw error;
    }
  },

  /**
   * Obtiene el catálogo completo (Memoria RAM -> IndexedDB -> API).
   */
  async getCatalogoLocalidades() {
    if (memoriaLocalidades && memoriaLocalidades.length > 0) {
      return memoriaLocalidades;
    }

    if (cargandoCatalogoPromise) {
      return cargandoCatalogoPromise; // deduplicación: una sola descarga concurrente
    }
    cargandoCatalogoPromise = (async () => {
      try {
        const cached = await callesCacheService.getCatalogoLocalidades();
        if (Array.isArray(cached) && cached.length > 0) {
          memoriaLocalidades = cached; // ya no se agregan _nombreKey/_searchKey
          return memoriaLocalidades;
        }
      } catch (e) {
        console.warn("Lectura de IndexedDB falló:", e);
      }
      return await this.syncCatalogoLocalidadesCompleto();
    })();

    try {
      return await cargandoCatalogoPromise;
    } finally {
      cargandoCatalogoPromise = null;
    }
  },
  /**
   * Índice de búsqueda listo para consultar (RAM → IndexedDB → red).
   * Se construye UNA vez por sesión con `addAllAsync` (cede el control entre
   * lotes): nunca bloquea el hilo principal. La promesa se memoiza para que
   * varias pulsaciones concurrentes compartan la misma construcción.
   */
  async getLocalidadesBuscador() {
    if (buscadorLocalidades) return buscadorLocalidades;
    if (construyendoBuscador) return construyendoBuscador;

    construyendoBuscador = (async () => {
      const gen = ++generacionBuscador;
      const catalogo = await this.getCatalogoLocalidades();
      if (!Array.isArray(catalogo) || catalogo.length === 0) return null;

      // Chequeo 1: el catálogo pudo invalidarse durante la lectura/descarga.
      if (gen !== generacionBuscador) return null;

      const construido = await crearBuscadorAsync(
        catalogo,
        BUSCADOR_LOCALIDADES,
      );

      // Chequeo 2: pudo invalidarse durante los ~cientos de ms del indexado.
      // Se construye en una variable local y recién se "commitea" si sigue vigente.
      if (gen !== generacionBuscador) return null;

      buscadorLocalidades = construido;
      return construido;
    })();

    try {
      return await construyendoBuscador;
    } finally {
      construyendoBuscador = null;
    }
  },

  /**
   * Precalienta el índice en tiempo ocioso, para que la PRIMERA tecla sea
   * instantánea. Fire-and-forget: nunca propaga rechazos.
   */
  prefetchLocalidadesBuscador() {
    if (buscadorLocalidades || construyendoBuscador) return;
    enIdle(() => {
      this.getLocalidadesBuscador().catch(() => {});
    });
  },

  /** Invalida el índice cuando el catálogo se re-sincroniza. */
  invalidarBuscadorLocalidades() {
    buscadorLocalidades = null;
    construyendoBuscador = null; // un build en vuelo ya no se considera vigente
    generacionBuscador += 1; // ⚠️ sin esto, el build en vuelo NO se descarta
  },

  /**
   * Búsqueda omnibox de localidades sobre el índice en memoria.
   *
   * El catálogo local (`/localidades/catalogo-completo`) es la fotografía
   * COMPLETA del país, así que cuando el índice está construido es AUTORITATIVO:
   * 0 coincidencias locales = 0 resultados, sin golpear la API (evita un request
   * por cada tecla sin resultados). La frescura la garantiza el manifiesto
   * (`manifest.localidades` → checkLocalidadesVersion → purge).
   * La red queda SOLO como degradación cuando no hay índice disponible.
   */
  async searchLocalidades(search, perPage = MAX_RESULTADOS) {
    const term = (search || "").trim();
    if (term.length < MIN_CARACTERES) return [];

    try {
      const buscador = await this.getLocalidadesBuscador();
      if (buscador) return buscador.search(term, perPage);
    } catch (e) {
      console.warn("Búsqueda local de localidades falló, se degrada a red:", e);
    }

    const response = await api.get("/localidades", {
      params: { search: term, per_page: perPage },
    });
    return response.data;
  },
};

export default geografiaService;
