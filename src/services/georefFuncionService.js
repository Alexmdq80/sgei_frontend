import api from './api';

/**
 * Servicio para la gestión de Funciones Georef.
 */
const georefFuncionService = {
    /**
     * Obtener todas las funciones.
     */
    getAll: async (params) => {
        const response = await api.get('/admin/georef-funcions', { params });
        return response.data;
    },

    /**
     * Obtener una función por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/georef-funcions/${id}`);
        return response.data;
    },

    /**
     * Crear una nueva función.
     */
    create: async (data) => {
        const response = await api.post('/admin/georef-funcions', data);
        return response.data;
    },

    /**
     * Actualizar una función existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/georef-funcions/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar una función.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/georef-funcions/${id}`);
        return response.data;
    }
};

export default georefFuncionService;
