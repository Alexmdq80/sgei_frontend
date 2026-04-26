import api from './api';

/**
 * Servicio para la gestión de Causas de Cierre.
 */
const cierreCausaService = {
    /**
     * Obtener todas las causas de cierre.
     */
    getAll: async () => {
        const response = await api.get('/admin/cierre-causas');
        return response.data;
    },

    /**
     * Crear una nueva causa de cierre.
     */
    create: async (data) => {
        const response = await api.post('/admin/cierre-causas', data);
        return response.data;
    },

    /**
     * Actualizar una causa existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/cierre-causas/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar una causa.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/cierre-causas/${id}`);
        return response.data;
    }
};

export default cierreCausaService;
