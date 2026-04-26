import api from './api';

/**
 * Servicio para la gestión de Ofertas Educativas.
 */
const ofertaService = {
    getAll: async () => {
        const response = await api.get('/admin/ofertas');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/ofertas/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/ofertas', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/ofertas/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/ofertas/${id}`);
        return response.data;
    }
};

export default ofertaService;
