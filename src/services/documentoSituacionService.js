import api from './api';

const documentoSituacionService = {
    getAll: async () => {
        const response = await api.get('/admin/documento-situacions');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/admin/documento-situacions/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/admin/documento-situacions', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/admin/documento-situacions/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/admin/documento-situacions/${id}`);
        return response.data;
    }
};

export default documentoSituacionService;
