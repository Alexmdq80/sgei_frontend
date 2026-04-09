import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const planService = {
  /**
   * Obtiene todos los planes de estudio.
   */
  getAllPlans: async () => {
    const response = await axios.get(`${API_URL}/planes`, { withCredentials: true });
    return response.data;
  },

  /**
   * Obtiene un plan por ID.
   */
  getPlanById: async (id) => {
    const response = await axios.get(`${API_URL}/planes/${id}`, { withCredentials: true });
    return response.data;
  },

  /**
   * Obtiene los ciclos disponibles para los planes.
   */
  getPlanCiclos: async () => {
    const response = await axios.get(`${API_URL}/planes-ciclos`, { withCredentials: true });
    return response.data;
  },

  /**
   * Crea un nuevo plan de estudio.
   */
  createPlan: async (data) => {
    const response = await axios.post(`${API_URL}/planes`, data, { withCredentials: true });
    return response.data;
  },

  /**
   * Actualiza un plan existente.
   */
  updatePlan: async (id, data) => {
    const response = await axios.put(`${API_URL}/planes/${id}`, data, { withCredentials: true });
    return response.data;
  },

  /**
   * Elimina un plan de estudio.
   */
  deletePlan: async (id) => {
    const response = await axios.delete(`${API_URL}/planes/${id}`, { withCredentials: true });
    return response.data;
  }
};

export default planService;
