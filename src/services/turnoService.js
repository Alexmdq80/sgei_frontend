import api from './api';

const turnoService = {
    getAll: async () => {
        const response = await api.get('/admin/turnos');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/turnos/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/turnos', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/turnos/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/turnos/${id}`);
        return response.data;
    }
};

export default turnoService;
