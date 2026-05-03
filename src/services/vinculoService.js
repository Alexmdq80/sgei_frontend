import api from './api';

const vinculoService = {
    getAll: async () => {
        const response = await api.get('/admin/vinculos');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/vinculos/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/vinculos', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/vinculos/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/vinculos/${id}`);
        return response.data;
    }
};

export default vinculoService;
