import api from './api';

/**
 * Servicio para la gestión de Escuelas y vinculación de usuarios.
 */
const escuelaService = {
    /**
     * Busca escuelas por término y filtros geográficos.
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
    async cancelJoin() {
        const response = await api.post('/auth/escuelas/cancel-join');
        return response.data;
    }
};

export default escuelaService;
