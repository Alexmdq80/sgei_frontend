import api from './api';

/**
 * Servicio para la gestión de Niveles Educativos.
 */
const nivelService = {
    getAll: async () => {
        const response = await api.get('/admin/niveles');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/niveles/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/niveles', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/niveles/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/niveles/${id}`);
        return response.data;
    }
};

export default nivelService;
