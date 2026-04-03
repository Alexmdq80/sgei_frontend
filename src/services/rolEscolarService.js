import api from './api';

/**
 * Servicio para la gestión del catálogo de roles escolares.
 */
const rolEscolarService = {
    /**
     * Obtiene todos los roles escolares disponibles.
     */
    async getAll() {
        const response = await api.get('/rol-escolares');
        return response.data;
    }
};

export default rolEscolarService;
