import api from './api';

const cupofService = {
    /**
     * List all CUPOFs with optional filters.
     */
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/cupofs?${params}`);
        return response.data;
    },

    /**
     * Create a new CUPOF slot.
     */
    create: async (data) => {
        const response = await api.post('/admin/cupofs', data);
        return response.data;
    },

    /**
     * Assign an agent to a CUPOF slot.
     */
    assign: async (cupofId, data) => {
        const response = await api.post(`/admin/cupofs/${cupofId}/assign`, data);
        return response.data;
    },

    /**
     * Release a CUPOF slot (unassign agent or close section).
     */
    release: async (cupofId, data = {}) => {
        const response = await api.post(`/admin/cupofs/${cupofId}/release`, data);
        return response.data;
    }
};

export default cupofService;
