import api from './api';

/**
 * Servicio para la gestión de Condiciones de Inscripción.
 */
const condicionService = {
    /**
     * Obtener todas las condiciones.
     */
    getAll: async () => {
        const response = await api.get('/admin/condiciones');
        return response.data;
    },

    /**
     * Crear una nueva condición.
     */
    create: async (data) => {
        const response = await api.post('/admin/condiciones', data);
        return response.data;
    },

    /**
     * Actualizar una condición existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/condiciones/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar una condición.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/condiciones/${id}`);
        return response.data;
    }
};

export default condicionService;
