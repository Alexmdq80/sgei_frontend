import api from './api';

const asignaturaService = {
  /**
   * Obtiene las asignaturas de un AnioPlan específico.
   */
  getByAnioPlan: async (anioPlanId) => {
    const response = await api.get(`/anio-plan/${anioPlanId}/asignaturas`);
    return response.data;
  },

  /**
   * Crea una nueva asignatura.
   */
  create: async (data) => {
    const response = await api.post('/asignaturas', data);
    return response.data;
  },

  /**
   * Actualiza una asignatura existente.
   */
  update: async (id, data) => {
    const response = await api.put(`/asignaturas/${id}`, data);
    return response.data;
  },

  /**
   * Elimina una asignatura.
   */
  delete: async (id) => {
    const response = await api.delete(`/asignaturas/${id}`);
    return response.data;
  }
};

export default asignaturaService;
