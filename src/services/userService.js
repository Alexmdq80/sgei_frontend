import api from './api';

/**
 * Servicio para la gestión de datos del usuario autenticado (Perfil).
 */
const userService = {
    /**
     * Actualiza la información básica del perfil (nombre, email).
     * @param {Object} data { name, email }
     */
    async updateProfile(data) {
        const response = await api.put('/auth/profile', data);
        return response.data;
    },

    /**
     * Actualiza el avatar del usuario.
     * @param {FormData} formData Objeto FormData con el archivo 'avatar'.
     */
    async updateAvatar(formData) {
        const response = await api.post('/auth/avatar', formData);
        return response.data;
    },

    /**
     * Elimina el avatar del usuario.
     */
    async deleteAvatar() {
        const response = await api.delete('/auth/avatar');
        return response.data;
    },

    /**
     * Actualiza la contraseña del usuario.
     * @param {Object} data { current_password, password, password_confirmation }
     */
    async updatePassword(data) {
        const response = await api.put('/auth/password', data);
        return response.data;
    },

    // --- MÉTODOS ADMINISTRATIVOS ---

    /**
     * Obtiene todos los usuarios (paginado).
     */
    async getAll(params = {}) {
        const response = await api.get('/admin/usuarios', { params });
        return response.data;
    },

    /**
     * Crea un nuevo usuario desde el panel administrativo.
     */
    async create(data) {
        const response = await api.post('/admin/usuarios', data);
        return response.data;
    },

    /**
     * Actualiza un usuario específico.
     */
    async update(id, data) {
        const response = await api.put(`/admin/usuarios/${id}`, data);
        return response.data;
    },

    /**
     * Elimina (soft delete) un usuario.
     */
    async delete(id) {
        const response = await api.delete(`/admin/usuarios/${id}`);
        return response.data;
    },

    /**
     * Alterna el rol de Supervisor Curricular para un usuario.
     */
    async toggleSupervisorRole(id) {
        const response = await api.post(`/admin/usuarios/${id}/toggle-supervisor`);
        return response.data;
    }
};

export default userService;
