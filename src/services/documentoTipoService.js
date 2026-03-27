import api from './api';

/**
 * Servicio para gestionar catálogos de tipos de documento.
 */
const documentoTipoService = {
    /**
     * Obtiene el listado de tipos de documento vigentes desde el backend.
     * @returns {Promise<Array>}
     */
    async getAll() {
        const response = await api.get('/documento-tipos');
        // El backend devuelve { data: [...] }
        return response.data.data;
    }
};

export default documentoTipoService;
