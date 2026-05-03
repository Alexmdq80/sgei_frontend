import api from './api';

const escalafonService = {
    getAll: async () => {
        const response = await api.get('/admin/escalafones');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/escalafones/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/escalafones', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/escalafones/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/escalafones/${id}`);
        return response.data;
    }
};

export default escalafonService;
