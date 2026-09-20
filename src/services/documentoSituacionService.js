import api from "./api";
import catalogCache from "./catalogCacheService";

const CACHE_KEY = "documento_situacions";

const documentoSituacionService = {
  getAll: async () => {
    return catalogCache.getOrFetch(CACHE_KEY, async () => {
      const response = await api.get("/admin/documento-situacions");
      return response.data?.data || response.data || [];
    });
  },

  getById: async (id) => {
    const response = await api.get(`/admin/documento-situacions/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/admin/documento-situacions", data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/documento-situacions/${id}`, data);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/documento-situacions/${id}`);
    catalogCache.invalidate(CACHE_KEY);
    return response.data;
  },
};

export default documentoSituacionService;
