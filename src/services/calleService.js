import api from './api';

/**
 * Servicio para gestionar las calles.
 */
const calleService = {
    /**
     * Obtiene las calles paginadas y filtradas.
     */
    getAll: async (params = {}) => {
        const response = await api.get('/admin/calles', { params });
        return response.data;
    },

    /**
     * Obtiene una calle por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/calles/${id}`);
        return response.data;
    },

    /**
     * Crea una nueva calle.
     */
    create: async (data) => {
        const response = await api.post('/admin/calles', data);
        return response.data;
    },

    /**
     * Actualiza una calle existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/calles/${id}`, data);
        return response.data;
    },

    /**
     * Elimina una calle.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/calles/${id}`);
        return response.data;
    }
};

export default calleService;
