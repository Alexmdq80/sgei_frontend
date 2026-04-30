import api from './api';

/**
 * Servicio para la gestión de Categorías Georef.
 */
const georefCategoriaService = {
    /**
     * Obtener todas las categorías.
     */
    getAll: async (params) => {
        const response = await api.get('/admin/georef-categorias', { params });
        return response.data;
    },

    /**
     * Obtener una categoría por ID.
     */
    getById: async (id) => {
        const response = await api.get(`/admin/georef-categorias/${id}`);
        return response.data;
    },

    /**
     * Crear una nueva categoría.
     */
    create: async (data) => {
        const response = await api.post('/admin/georef-categorias', data);
        return response.data;
    },

    /**
     * Actualizar una categoría existente.
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/georef-categorias/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar una categoría.
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/georef-categorias/${id}`);
        return response.data;
    }
};

export default georefCategoriaService;
