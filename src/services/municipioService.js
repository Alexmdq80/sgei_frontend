import api from './api';

/**
 * Servicio para gestionar los municipios.
 */
const municipioService = {
    /**
     * Obtiene los municipios paginados y filtrados.
     */
    getAll: async (params = {}) => {
        const response = await api.get('/admin/municipios', { params });
        return response.data;
    },

    /**
     * Obtiene un municipio por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/municipios/${id}`);
        return response.data;
    },

    /**
     * Crea un nuevo municipio.
     */
    create: async (data) => {
        const response = await api.post('/admin/municipios', data);
        return response.data;
    },

    /**
     * Actualiza un municipio existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/municipios/${id}`, data);
        return response.data;
    },

    /**
     * Elimina un municipio.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/municipios/${id}`);
        return response.data;
    }
};

export default municipioService;
