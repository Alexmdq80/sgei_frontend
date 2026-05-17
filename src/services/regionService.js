import api from './api';

/**
 * Servicio para la gestión de Regiones Educativas.
 */
const regionService = {
    /**
     * Obtiene todas las regiones con paginación y búsqueda.
     */
    async getAll(params = {}) {
        const response = await api.get('/admin/regiones', { params });
        return response.data;
    },

    /**
     * Obtiene una región por ID.
     */
    async getById(id) {
        const response = await api.get(`/admin/regiones/${id}`);
        return response.data;
    },

    /**
     * Crea una nueva región.
     */
    async create(data) {
        const response = await api.post('/admin/regiones', data);
        return response.data;
    },

    /**
     * Actualiza una región existente.
     */
    async update(id, data) {
        const response = await api.put(`/admin/regiones/${id}`, data);
        return response.data;
    },

    /**
     * Elimina una región.
     */
    async delete(id) {
        const response = await api.delete(`/admin/regiones/${id}`);
        return response.data;
    }
};

export default regionService;
