import api from './api';

const vinculoTipoService = {
    getAll: async () => {
        const response = await api.get('/admin/vinculo-tipos');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/vinculo-tipos/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/vinculo-tipos', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/vinculo-tipos/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/vinculo-tipos/${id}`);
        return response.data;
    }
};

export default vinculoTipoService;
