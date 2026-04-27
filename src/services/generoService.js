import api from './api';

const generoService = {
    getAll: async () => {
        const response = await api.get('/admin/generos');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/admin/generos/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/admin/generos', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/admin/generos/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/admin/generos/${id}`);
        return response.data;
    }
};

export default generoService;
