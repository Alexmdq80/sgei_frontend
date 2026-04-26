import api from './api';

/**
 * Servicio para la gestión de Combinaciones de Modalidad y Nivel.
 */
const modalidadNivelService = {
    getAll: async () => {
        const response = await api.get('/admin/modalidad-niveles');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/modalidad-niveles/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/modalidad-niveles', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/modalidad-niveles/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/modalidad-niveles/${id}`);
        return response.data;
    }
};

export default modalidadNivelService;
