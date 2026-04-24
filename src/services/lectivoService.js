import api from './api';

const lectivoService = {
  getAll: async (filters = {}) => {
    const response = await api.get('/lectivos', { params: filters });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/lectivos/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/lectivos', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/lectivos/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/lectivos/${id}`);
    return response.data;
  }
};

export default lectivoService;
