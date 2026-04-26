import api from './api';

/**
 * Servicio para la gestión de Escuelas y vinculación de usuarios.
 */
const escuelaService = {
    /**
     * Busca escuelas por término y filtros.
     */
    async search(term = '', filters = {}) {
        const response = await api.get('/escuelas', {
            params: { 
                search: term,
                ...filters
            }
        });
        return response.data;
    },

    /**
     * Obtiene el catálogo de niveles educativos.
     */
    async getNiveles() {
        const response = await api.get('/niveles');
        return response.data;
    },

    /**
     * Obtiene el catálogo de sectores escolares.
     */
    async getSectores() {
        const response = await api.get('/sectores');
        return response.data;
    },

    /**
     * [ADMIN] Obtiene todas las escuelas con paginación y búsqueda.
     */
    async getAllAdmin(params = {}) {
        const response = await api.get('/admin/escuelas', { params });
        return response.data;
    },

    /**
     * [ADMIN] Obtiene una escuela por ID.
     */
    async getById(id) {
        const response = await api.get(`/admin/escuelas/${id}`);
        return response.data;
    },

    /**
     * [ADMIN] Crea una nueva escuela.
     */
    async create(data) {
        const response = await api.post('/admin/escuelas', data);
        return response.data;
    },

    /**
     * [ADMIN] Actualiza una escuela existente.
     */
    async update(id, data) {
        const response = await api.put(`/admin/escuelas/${id}`, data);
        return response.data;
    },

    /**
     * [ADMIN] Elimina una escuela.
     */
    async delete(id) {
        const response = await api.delete(`/admin/escuelas/${id}`);
        return response.data;
    },

    /**
     * [ADMIN] Obtiene la lista de vinculaciones escolares.
     */
    async getAllLinks(params = {}) {
        const response = await api.get('/admin/escuela-usuarios', { params });
        return response.data;
    },

    /**
     * [ADMIN] Asigna directamente un usuario a una escuela con un rol específico.
     */
    async assignDirect(usuarioId, escuelaId, roleId) {
        const response = await api.post('/admin/escuela-usuarios', {
            usuario_id: usuarioId,
            escuela_id: escuelaId,
            role_id: roleId
        });
        return response.data;
    },

    /**
     * [ADMIN] Actualiza el rol de una vinculación existente.
     */
    async updateLink(id, roleId) {
        const response = await api.put(`/admin/escuela-usuarios/${id}`, {
            role_id: roleId
        });
        return response.data;
    },

    /**
     * [ADMIN] Elimina una vinculación.
     */
    async deleteLink(id) {
        const response = await api.delete(`/admin/escuela-usuarios/${id}`);
        return response.data;
    }
};

export default escuelaService;
