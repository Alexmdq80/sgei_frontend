import api from "./api";
import catalogCache from "./catalogCacheService";

const CACHE_KEY = "sexos";

const sexoService = {
  getAll: async () => {
    return catalogCache.getOrFetch(CACHE_KEY, async () => {
      const response = await api.get("/admin/sexos");
      return response.data?.data || response.data || [];
    });
  },

  getById: async (id) => {
    const response = await api.get(`/admin/sexos/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/admin/sexos", data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/sexos/${id}`, data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/sexos/${id}`);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },
};

export default sexoService;
