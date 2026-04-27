import api from './api';

const continenteService = {
    getAll: async () => {
        const response = await api.get('/admin/continentes');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/admin/continentes/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/admin/continentes', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/admin/continentes/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/admin/continentes/${id}`);
        return response.data;
    }
};

export default continenteService;
