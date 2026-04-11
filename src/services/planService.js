import api from './api';

const planService = {
  /**
   * Obtiene todos los planes de estudio.
   */
  getAllPlans: async () => {
    const response = await api.get('/planes');
    return response.data;
  },

  /**
   * Obtiene un plan por ID.
   */
  getPlanById: async (id) => {
    const response = await api.get(`/planes/${id}`);
    return response.data;
  },

  /**
   * Obtiene los ciclos disponibles para los planes.
   */
  getPlanCiclos: async () => {
    const response = await api.get('/planes-ciclos');
    return response.data;
  },

  /**
   * Crea un nuevo plan de estudio.
   */
  createPlan: async (data) => {
    const response = await api.post('/planes', data);
    return response.data;
  },

  /**
   * Actualiza un plan existente.
   */
  updatePlan: async (id, data) => {
    const response = await api.put(`/planes/${id}`, data);
    return response.data;
  },

  /**
   * Elimina un plan de estudio.
   */
  deletePlan: async (id) => {
    const response = await api.delete(`/planes/${id}`);
    return response.data;
  }
};

export default planService;
