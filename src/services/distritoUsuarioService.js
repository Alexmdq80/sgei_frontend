import api from './api';

const distritoUsuarioService = {
    async getAll() {
        const response = await api.get('/admin/distritos-usuarios');
        return response.data;
    },
    async assign(data) {
        const response = await api.post('/admin/distritos-usuarios', data);
        return response.data;
    },
    async delete(id) {
        const response = await api.delete(`/admin/distritos-usuarios/${id}`);
        return response.data;
    }
};

export default distritoUsuarioService;
