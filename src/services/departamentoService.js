import api from './api';

/**
 * Servicio para gestionar los departamentos.
 */
const departamentoService = {
    /**
     * Obtiene los departamentos paginados y filtrados.
     */
    getAll: async (params = {}) => {
        const response = await api.get('/admin/departamentos', { params });
        return response.data;
    },

    /**
     * Obtiene un departamento por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/departamentos/${id}`);
        return response.data;
    },

    /**
     * Crea un nuevo departamento.
     */
    create: async (data) => {
        const response = await api.post('/admin/departamentos', data);
        return response.data;
    },

    /**
     * Actualiza un departamento existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/departamentos/${id}`, data);
        return response.data;
    },

    /**
     * Elimina un departamento.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/departamentos/${id}`);
        return response.data;
    }
};

export default departamentoService;
