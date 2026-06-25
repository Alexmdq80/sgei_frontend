import api from './api';

const provinciaUsuarioService = {
    async getAll() {
        const response = await api.get('/admin/provincias-usuarios');
        return response.data;
    },
    async assign(data) {
        const response = await api.post('/admin/provincias-usuarios', data);
        return response.data;
    },
    async delete(id) {
        const response = await api.delete(`/admin/provincias-usuarios/${id}`);
        return response.data;
    }
};

export default provinciaUsuarioService;
