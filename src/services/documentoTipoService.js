import api from "./api";
import catalogCache from "./catalogCacheService";

const CACHE_KEY = "documento_tipos";

const documentoTipoService = {
  getAll: async () => {
    return catalogCache.getOrFetch(CACHE_KEY, async () => {
      const response = await api.get("/documento-tipos");
      return response.data?.data || response.data || [];
    });
  },

  getById: async (id) => {
    const response = await api.get(`/documento-tipos/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/documento-tipos", data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/documento-tipos/${id}`, data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/documento-tipos/${id}`);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },
};

export default documentoTipoService;
