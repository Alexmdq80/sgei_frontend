import api from './api';

/**
 * Servicio para la gestión de Fuentes Georef.
 */
const georefFuenteService = {
    /**
     * Obtener todas las fuentes.
     */
    getAll: async (params) => {
        const response = await api.get('/admin/georef-fuentes', { params });
        return response.data;
    },

    /**
     * Obtener una fuente por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/georef-fuentes/${id}`);
        return response.data;
    },

    /**
     * Crear una nueva fuente.
     */
    create: async (data) => {
        const response = await api.post('/admin/georef-fuentes', data);
        return response.data;
    },

    /**
     * Actualizar una fuente existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/georef-fuentes/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar una fuente.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/georef-fuentes/${id}`);
        return response.data;
    }
};

export default georefFuenteService;
