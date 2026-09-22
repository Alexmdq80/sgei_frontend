import api from "./api";
import catalogCache from "./catalogCacheService";
import callesCacheService from "./callesCacheService";

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
   * Búsqueda omnibox de localidades con la jerarquía completa
   * (devuelve un array: { id, nombre, departamento_id, departamento: { provincia: { nacion } } }).
   */
  async searchLocalidades(search, perPage = 15) {
    const response = await api.get("/localidades", {
      params: { search, per_page: perPage },
    });
    return response.data;
  },
};

export default geografiaService;
