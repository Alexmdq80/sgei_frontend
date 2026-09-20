import api from "./api";
import catalogCache from "./catalogCacheService";

const CACHE_KEY = "provincias_admin";
const CACHE_PER_PAGE = 500;

/**
 * Servicio para gestionar las provincias.
 */
const provinciaService = {
  /**
   * Obtiene las provincias paginadas y filtradas.
   * - Búsqueda o paginación (ABM): siempre API directa.
   * - Listado completo (selectores): caché blindado con fallback a red.
   */
  getAll: async (params = {}) => {
    const esConsultaDeAbm = Boolean(params.search) || params.page !== undefined;

    if (esConsultaDeAbm) {
      const response = await api.get("/admin/provincias", { params });
      return response.data;
    }

    const list = await catalogCache.getOrFetch(CACHE_KEY, async () => {
      const response = await api.get("/admin/provincias", {
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
   * Obtiene una provincia por ID.
   */
  getById: async (id) => {
    const response = await api.get(`/admin/provincias/${id}`);
    return response.data;
  },

  /**
   * Crea una nueva provincia.
   */
  create: async (data) => {
    const response = await api.post("/admin/provincias", data);
    catalogCache.invalidate("provincias");
    return response.data;
  },

  /**
   * Actualiza una provincia existente.
   */
  update: async (id, data) => {
    const response = await api.put(`/admin/provincias/${id}`, data);
    catalogCache.invalidate("provincias");
    return response.data;
  },

  /**
   * Elimina una provincia.
   */
  delete: async (id) => {
    const response = await api.delete(`/admin/provincias/${id}`);
    catalogCache.invalidate("provincias");
    return response.data;
  },
};

export default provinciaService;
