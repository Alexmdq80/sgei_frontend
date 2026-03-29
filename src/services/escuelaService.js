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
                ...filters // Esto ahora incluye sector_id si está presente
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
     * Envía solicitud para unirse a una escuela.
     */
    async requestJoin(escuelaId, rolEscolarId = 1) {
        const response = await api.post('/auth/escuelas/join', {
            escuela_id: escuelaId,
            rol_escolar_id: rolEscolarId
        });
        return response.data;
    },

    /**
     * Cancela la solicitud actual de unión a escuela.
     */
    async cancelJoin(escuelaId = null) {
        const response = await api.post('/auth/escuelas/cancel-join', {
            escuela_id: escuelaId
        });
        return response.data;
    }
};

export default escuelaService;

