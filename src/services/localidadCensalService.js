import api from './api';

/**
 * Servicio para gestionar las localidades censales.
 */
const localidadCensalService = {
    /**
     * Obtiene las localidades censales paginadas y filtradas.
     */
    getAll: async (params = {}) => {
        const response = await api.get('/admin/localidad-censals', { params });
        return response.data;
    },

    /**
     * Obtiene una localidad censal por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/localidad-censals/${id}`);
        return response.data;
    },

    /**
     * Crea una nueva localidad censal.
     */
    create: async (data) => {
        const response = await api.post('/admin/localidad-censals', data);
        return response.data;
    },

    /**
     * Actualiza una localidad censal existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/localidad-censals/${id}`, data);
        return response.data;
    },

    /**
     * Elimina una localidad censal.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/localidad-censals/${id}`);
        return response.data;
    }
};

export default localidadCensalService;
