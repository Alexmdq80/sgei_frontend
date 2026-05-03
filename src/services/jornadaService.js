import api from './api';

const jornadaService = {
    getAll: async () => {
        const response = await api.get('/admin/jornadas');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/jornadas/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/jornadas', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/jornadas/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/jornadas/${id}`);
        return response.data;
    }
};

export default jornadaService;
