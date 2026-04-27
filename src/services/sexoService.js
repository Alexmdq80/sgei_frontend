import api from './api';

const sexoService = {
    getAll: async () => {
        const response = await api.get('/admin/sexos');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/admin/sexos/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/admin/sexos', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/admin/sexos/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/admin/sexos/${id}`);
        return response.data;
    }
};

export default sexoService;
