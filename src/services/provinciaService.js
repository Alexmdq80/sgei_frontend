import api from './api';

/**
 * Servicio para gestionar las provincias.
 */
const provinciaService = {
    /**
     * Obtiene las provincias paginadas y filtradas.
     */
    getAll: async (params = {}) => {
        const response = await api.get('/admin/provincias', { params });
        return response.data;
    },

    /**
     * Obtiene una provincia por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/provincias/${id}`);
        return response.data;
    },

    /**
     * Crea una nueva provincia.
     */
    create: async (data) => {
        const response = await api.post('/admin/provincias', data);
        return response.data;
    },

    /**
     * Actualiza una provincia existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/provincias/${id}`, data);
        return response.data;
    },

    /**
     * Elimina una provincia.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/provincias/${id}`);
        return response.data;
    }
};

export default provinciaService;
