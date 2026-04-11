import api from './api';

const agenteService = {
    /**
     * List agents or search by criteria.
     */
    getAll: async (params = {}) => {
        const response = await api.get('/admin/agentes', { params });
        return response.data;
    },

    /**
     * Create a new agent from an existing person.
     */
    create: async (personaId, data = {}) => {
        const response = await api.post('/admin/agentes', { persona_id: personaId, ...data });
        return response.data;
    }
};

export default agenteService;
