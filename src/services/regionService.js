import api from "./api";
import catalogCache from "./catalogCacheService";

const CACHE_KEY = "regiones_admin";
const CACHE_PER_PAGE = 500;

/**
 * Servicio para la gestión de Regiones Educativas.
 */
const regionService = {
  /**
   * Obtiene todas las regiones con paginación y búsqueda.
   * - Búsqueda o paginación (ABM): siempre API directa.
   * - Listado completo (selectores): caché blindado con fallback a red.
   */
  async getAll(params = {}) {
    const esConsultaDeAbm = Boolean(params.search) || params.page !== undefined;

    if (esConsultaDeAbm) {
      const response = await api.get("/admin/regiones", { params });
      return response.data;
    }

    const list = await catalogCache.getOrFetch(CACHE_KEY, async () => {
      const response = await api.get("/admin/regiones", {
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
   * Obtiene una región por ID.
   */
  async getById(id) {
    const response = await api.get(`/admin/regiones/${id}`);
    return response.data;
  },

  /**
   * Crea una nueva región.
   */
  async create(data) {
    const response = await api.post("/admin/regiones", data);
    catalogCache.invalidate("regiones");
    return response.data;
  },

  /**
   * Actualiza una región existente.
   */
  async update(id, data) {
    const response = await api.put(`/admin/regiones/${id}`, data);
    catalogCache.invalidate("regiones");
    return response.data;
  },

  /**
   * Elimina una región.
   */
  async delete(id) {
    const response = await api.delete(`/admin/regiones/${id}`);
    catalogCache.invalidate("regiones");
    return response.data;
  },
};

export default regionService;
