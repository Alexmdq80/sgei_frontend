import api from './api';

/**
 * Servicio para la gestión de Ámbitos (Rural, Urbano, etc).
 */
const ambitoService = {
    /**
     * Obtener todos los ámbitos.
     */
    getAll: async () => {
        const response = await api.get('/admin/ambitos');
        return response.data;
    },

    /**
     * Crear un nuevo ámbito.
     */
    create: async (data) => {
        const response = await api.post('/admin/ambitos', data);
        return response.data;
    },

    /**
     * Actualizar un ámbito existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/ambitos/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar un ámbito.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/ambitos/${id}`);
        return response.data;
    }
};

export default ambitoService;
