import api from './api';

const puestoTipoService = {
    getAll: async () => {
        const response = await api.get('/admin/puesto-tipos');
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/admin/puesto-tipos/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/admin/puesto-tipos', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/puesto-tipos/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/admin/puesto-tipos/${id}`);
        return response.data;
    }
};

export default puestoTipoService;
