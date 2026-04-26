import api from './api';

/**
 * Servicio para la gestión de Tipos de Escuela.
 */
const escuelaTipoService = {
    /**
     * Obtiene todos los tipos de escuela.
     */
    getAll: async () => {
        const response = await api.get('/admin/escuela-tipos');
        return response.data;
    },

    /**
     * Obtiene un tipo de escuela por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/escuela-tipos/${id}`);
        return response.data;
    },

    /**
     * Crea un nuevo tipo de escuela.
     */
    create: async (data) => {
        const response = await api.post('/admin/escuela-tipos', data);
        return response.data;
    },

    /**
     * Actualiza un tipo de escuela existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/escuela-tipos/${id}`, data);
        return response.data;
    },

    /**
     * Elimina un tipo de escuela.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/escuela-tipos/${id}`);
        return response.data;
    }
};

export default escuelaTipoService;
