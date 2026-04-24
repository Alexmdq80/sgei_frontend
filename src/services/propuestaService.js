import api from './api';

const propuestaService = {
  getAll: async (filters = {}) => {
    const response = await api.get('/propuestas', { params: filters });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/propuestas/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/propuestas', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/propuestas/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/propuestas/${id}`);
    return response.data;
  },

  getAuthorizedSchools: async () => {
    const response = await api.get('/propuestas/escuelas-autorizadas');
    return response.data;
  },

  // Catalog methods
  getTurnos: async () => {
    const response = await api.get('/turnos');
    return response.data;
  },

  getJornadas: async () => {
    const response = await api.get('/jornadas');
    return response.data;
  },

  getLectivos: async () => {
    const response = await api.get('/lectivos');
    return response.data;
  },

  getAnioPlanes: async () => {
    const response = await api.get('/anio-planes');
    return response.data;
  }
};

export default propuestaService;
