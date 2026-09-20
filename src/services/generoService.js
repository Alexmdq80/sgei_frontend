import api from "./api";
import catalogCache from "./catalogCacheService";

const CACHE_KEY = "generos";

const generoService = {
  getAll: async () => {
    return catalogCache.getOrFetch(CACHE_KEY, async () => {
      const response = await api.get("/admin/generos");
      return response.data?.data || response.data || [];
    });
  },

  getById: async (id) => {
    const response = await api.get(`/admin/generos/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/admin/generos", data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/generos/${id}`, data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/generos/${id}`);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },
};

export default generoService;
