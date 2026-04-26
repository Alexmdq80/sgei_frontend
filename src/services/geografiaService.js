import api from './api';

/**
 * Servicio para obtener datos geográficos.
 */
const geografiaService = {
    /**
     * Obtiene todas las provincias.
     */
    async getProvincias() {
        const response = await api.get('/provincias');
        return response.data;
    },

    /**
     * Obtiene los departamentos de una provincia.
     */
    async getDepartamentos(provinciaId) {
        const response = await api.get('/departamentos', {
            params: { provincia_id: provinciaId }
        });
        return response.data;
    },

    /**
     * Obtiene todas las localidades (con filtros opcionales).
     */
    async getAllLocalidades(params = {}) {
        const response = await api.get('/localidades', { params });
        return response.data;
    },

    /**
     * Obtiene las localidades de un departamento.
     */
    async getLocalidades(departamentoId) {
        const response = await api.get('/localidades', {
            params: { departamento_id: departamentoId }
        });
        return response.data;
    }
};

export default geografiaService;
