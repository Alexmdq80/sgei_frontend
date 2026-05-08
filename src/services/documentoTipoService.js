import api from './api';

const documentoTipoService = {
    getAll: async () => {
        const response = await api.get('/documento-tipos');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/documento-tipos/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/documento-tipos', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/documento-tipos/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/documento-tipos/${id}`);
        return response.data;
    }
};

export default documentoTipoService;
