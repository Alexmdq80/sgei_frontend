import api from './api';

/**
 * Servicio para gestionar las naciones.
 */
const nacionService = {
    /**
     * Obtiene todas las naciones.
     */
    getAll: async () => {
        const response = await api.get('/admin/naciones');
        return response.data;
    },

    /**
     * Obtiene una nación por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/naciones/${id}`);
        return response.data;
    },

    /**
     * Crea una nueva nación.
     */
    create: async (data) => {
        const response = await api.post('/admin/naciones', data);
        return response.data;
    },

    /**
     * Actualiza una nación existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/naciones/${id}`, data);
        return response.data;
    },

    /**
     * Elimina una nación.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/naciones/${id}`);
        return response.data;
    }
};

export default nacionService;
