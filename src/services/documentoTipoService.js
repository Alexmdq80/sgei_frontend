import api from './api';

const documentoTipoService = {
    getAll: async () => {
        const response = await api.get('/admin/documento-tipos');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/admin/documento-tipos/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/admin/documento-tipos', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/admin/documento-tipos/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/admin/documento-tipos/${id}`);
        return response.data;
    }
};

export default documentoTipoService;
