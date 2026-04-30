import api from './api';

/**
 * Servicio para gestionar las localidades.
 */
const localidadService = {
    /**
     * Obtiene las localidades paginadas y filtradas.
     */
    getAll: async (params = {}) => {
        const response = await api.get('/admin/localidades', { params });
        return response.data;
    },

    /**
     * Obtiene una localidad por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/localidades/${id}`);
        return response.data;
    },

    /**
     * Crea una nueva localidad.
     */
    create: async (data) => {
        const response = await api.post('/admin/localidades', data);
        return response.data;
    },

    /**
     * Actualiza una localidad existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/localidades/${id}`, data);
        return response.data;
    },

    /**
     * Elimina una localidad.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/localidades/${id}`);
        return response.data;
    }
};

export default localidadService;
