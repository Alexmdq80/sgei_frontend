import api from './api';

const cargoService = {
    /**
     * Obtener lista de cargos activos.
     */
    getAll: async () => {
        try {
            const response = await api.get('/cargos');
            return response.data;
        } catch (error) {
            console.error('Error al obtener cargos:', error);
            throw error;
        }
    },

    /**
     * Crear un nuevo cargo (Admin).
     */
    create: async (data) => {
        const response = await api.post('/admin/cargos', data);
        return response.data;
    },

    /**
     * Actualizar un cargo existente (Admin).
     */
    update: async (id, data) => {
        const response = await api.put(`/admin/cargos/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar un cargo (Admin).
     */
    delete: async (id) => {
        const response = await api.delete(`/admin/cargos/${id}`);
        return response.data;
    }
};

export default cargoService;
