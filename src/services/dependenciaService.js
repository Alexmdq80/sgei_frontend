import api from './api';

/**
 * Servicio para la gestión de Dependencias (Pública, Privada, etc).
 */
const dependenciaService = {
    /**
     * Obtener todas las dependencias.
     */
    getAll: async () => {
        const response = await api.get('/admin/dependencias');
        return response.data;
    },

    /**
     * Crear una nueva dependencia.
     */
    create: async (data) => {
        const response = await api.post('/admin/dependencias', data);
        return response.data;
    },

    /**
     * Actualizar una dependencia existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/dependencias/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar una dependencia.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/dependencias/${id}`);
        return response.data;
    }
};

export default dependenciaService;
