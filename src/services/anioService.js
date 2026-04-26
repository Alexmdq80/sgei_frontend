import api from './api';

/**
 * Servicio para la gestión de Años Académicos.
 */
const anioService = {
    /**
     * Obtener todos los años (Vista administrativa).
     */
    getAll: async () => {
        const response = await api.get('/admin/anios');
        return response.data;
    },

    /**
     * Obtener un año por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/anios/${id}`);
        return response.data;
    },

    /**
     * Crear un nuevo año.
     */
    create: async (data) => {
        const response = await api.post('/admin/anios', data);
        return response.data;
    },

    /**
     * Actualizar un año existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/anios/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar un año (Soft Delete).
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/anios/${id}`);
        return response.data;
    }
};

export default anioService;
