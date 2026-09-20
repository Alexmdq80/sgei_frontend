import api from "./api";
import catalogCache from "./catalogCacheService";

const CACHE_KEY = "naciones";
// El caché guarda SIEMPRE el listado completo (independiente del per_page que pida cada consumidor).
const CACHE_PER_PAGE = 1000;

/**
 * Servicio para gestionar las naciones.
 */
const nacionService = {
  /**
   * Obtiene las naciones paginadas y filtradas.
   * - Búsqueda o paginación (ABM): siempre API directa, para no romper el filtrado ni la paginación.
   * - Listado completo (selectores, cascadas geográficas): caché blindado con fallback a red.
   */
  getAll: async (params = {}) => {
    const esConsultaDeAbm = Boolean(params.search) || params.page !== undefined;

    if (esConsultaDeAbm) {
      const response = await api.get("/admin/naciones", { params });
      return response.data;
    }

    const list = await catalogCache.getOrFetch(CACHE_KEY, async () => {
      const response = await api.get("/admin/naciones", {
        params: { per_page: CACHE_PER_PAGE },
      });
      return response.data?.data || response.data || [];
    });

    return {
      data: list,
      total: list.length,
      per_page: list.length,
      current_page: 1,
      last_page: 1,
    };
  },

  /**
   * Obtiene una nación por ID.
   */
  getById: async (id) => {
    const response = await api.get(`/admin/naciones/${id}`);
    return response.data;
  },

  /**
   * Crea una nueva nación.
   */
  create: async (data) => {
    const response = await api.post("/admin/naciones", data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  /**
   * Actualiza una nación existente.
   */
  update: async (id, data) => {
    const response = await api.put(`/admin/naciones/${id}`, data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  /**
   * Elimina una nación.
   */
  delete: async (id) => {
    const response = await api.delete(`/admin/naciones/${id}`);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },
};

export default nacionService;
