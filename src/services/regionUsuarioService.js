import api from './api';

const regionUsuarioService = {
    async getAll() {
        const response = await api.get('/admin/regiones-usuarios');
        return response.data;
    },
    async assign(data) {
        const response = await api.post('/admin/regiones-usuarios', data);
        return response.data;
    },
    async delete(id) {
        const response = await api.delete(`/admin/regiones-usuarios/${id}`);
        return response.data;
    }
};

export default regionUsuarioService;
