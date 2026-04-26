import api from './api';

/**
 * Servicio para la gestión de Modalidades Educativas.
 */
const modalidadService = {
    getAll: async () => {
        const response = await api.get('/admin/modalidades');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/modalidades/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/modalidades', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/modalidades/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/modalidades/${id}`);
        return response.data;
    }
};

export default modalidadService;
