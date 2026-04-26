import api from './api';

/**
 * Servicio para la gestión de Ubicaciones de Escuela (Ubicación Geográfica).
 */
const escuelaUbicacionService = {
    getAll: async () => {
        const response = await api.get('/admin/escuela-ubicaciones');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/escuela-ubicaciones/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/escuela-ubicaciones', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/escuela-ubicaciones/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/escuela-ubicaciones/${id}`);
        return response.data;
    }
};

export default escuelaUbicacionService;
