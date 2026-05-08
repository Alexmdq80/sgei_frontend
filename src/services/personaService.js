import api from './api';

/**
 * Servicio para la gestión del Padrón de Personas (Agentes).
 */
const personaService = {
    /**
     * Obtiene el listado de personas con paginación y búsqueda.
     */
    async getAll(params = {}) {
        const response = await api.get('/admin/personas', { params });
        return response.data;
    },

    /**
     * Obtiene los detalles de una persona específica.
     */
    async getById(id) {
        const response = await api.get(`/admin/personas/${id}`);
        return response.data;
    },

    /**
     * Crea un nuevo registro de persona.
     */
    async create(data) {
        const response = await api.post('/admin/personas', data);
        return response.data;
    },

    /**
     * Actualiza un registro de persona.
     */
    async update(id, data) {
        const response = await api.put(`/admin/personas/${id}`, data);
        return response.data;
    },

    /**
     * Elimina un registro de persona.
     */
    async delete(id) {
        const response = await api.delete(`/admin/personas/${id}`);
        return response.data;
    },

    /**
     * Intenta vincular un usuario a una persona existente por DNI.
     */
    async tryLinkUser(id) {
        const response = await api.post(`/admin/personas/${id}/link-user`);
        return response.data;
    },

    /**
     * Desvincula el usuario de una persona.
     */
    async unlinkUser(id) {
        const response = await api.post(`/admin/personas/${id}/unlink-user`);
        return response.data;
    },

    /**
     * Asigna el rol de Jefe Distrital a una persona.
     */
    async assignJefeDistrital(id, departamento_id) {
        const response = await api.post(`/admin/personas/${id}/jefe-distrital`, { departamento_id });
        return response.data;
    },

    /**
     * Asigna el rol de Supervisor Curricular a una persona.
     */
    async assignSupervisor(id) {
        const response = await api.post(`/admin/personas/${id}/supervisor`);
        return response.data;
    },

    /**
     * Remueve un rol administrativo de una persona.
     */
    async removeRole(id, role) {
        const response = await api.delete(`/admin/personas/${id}/roles/${role}`);
        return response.data;
    },

    /**
     * Obtiene la comunidad educativa vinculada a una escuela específica.
     */
    async getComunidad(params = {}) {
        const response = await api.get('/admin/comunidad-educativa', { params });
        return response.data;
    }
};

export default personaService;
