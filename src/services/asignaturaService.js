import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const asignaturaService = {
  /**
   * Obtiene las asignaturas de un AnioPlan específico.
   */
  getByAnioPlan: async (anioPlanId) => {
    const response = await axios.get(`${API_URL}/anio-plan/${anioPlanId}/asignaturas`, { withCredentials: true });
    return response.data;
  },

  /**
   * Crea una nueva asignatura.
   */
  create: async (data) => {
    const response = await axios.post(`${API_URL}/asignaturas`, data, { withCredentials: true });
    return response.data;
  },

  /**
   * Actualiza una asignatura existente.
   */
  update: async (id, data) => {
    const response = await axios.put(`${API_URL}/asignaturas/${id}`, data, { withCredentials: true });
    return response.data;
  },

  /**
   * Elimina una asignatura.
   */
  delete: async (id) => {
    const response = await axios.delete(`${API_URL}/asignaturas/${id}`, { withCredentials: true });
    return response.data;
  }
};

export default asignaturaService;
