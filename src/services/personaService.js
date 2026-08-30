import api from "./api";

/**
 * Servicio para la gestión del Padrón de Personas (Agentes).
 */
const personaService = {
  /**
   * Obtiene el listado de personas con paginación y búsqueda.
   */
  async getAll(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );
    const response = await api.get("/admin/personas", { params: cleanParams });
    return response.data;
  },

  /**
   * Obtiene los detalles de una persona específica.
   */
  async getById(id) {
    const response = await api.get(`/admin/personas/${id}`);
    return response.data;
  },

  /**
   * Crea un nuevo registro de persona.
   */
  async create(data) {
    const response = await api.post("/admin/personas", data);
    return response.data;
  },

  /**
   * Actualiza un registro de persona.
   * Si el backend responde 409 (requires_confirmation), lanza un error especial
   * marcado con isConfirmationRequired + confirmationContext para que el componente lo intercepte.
   */
  async update(id, data) {
    try {
      const response = await api.put(`/admin/personas/${id}`, data);
      return response.data;
    } catch (error) {
      const data409 = error.response?.data;
      if (
        error.response?.status === 409 &&
        data409?.requires_confirmation === true &&
        data409?.action === "CONFIRM_UNLINK_USER"
      ) {
        error.isConfirmationRequired = true;
        error.confirmationContext = data409.context;
      }
      throw error;
    }
  },

  /**
   * Elimina un registro de persona.
   */
  async delete(id) {
    const response = await api.delete(`/admin/personas/${id}`);
    return response.data;
  },

  /**
   * Intenta vincular un usuario a una persona existente por DNI.
   */
  async tryLinkUser(id) {
    const response = await api.post(`/admin/personas/${id}/link-user`);
    return response.data;
  },

  /**
   * Desvincula el usuario de una persona.
   */
  async unlinkUser(id) {
    const response = await api.post(`/admin/personas/${id}/unlink-user`);
    return response.data;
  },

  /**
   * Reenvía manualmente el email de activación a una persona.
   */
  async resendActivation(id) {
    const response = await api.post(`/admin/personas/${id}/resend-activation`);
    return response.data;
  },

  /**
   * Asigna el rol de Jefe Provincial a una persona.
   */
  async assignJefeProvincial(id, provincia_id) {
    const response = await api.post(`/admin/personas/${id}/jefe-provincial`, {
      provincia_id,
    });
    return response.data;
  },

  /**
   * Asigna el rol de Jefe Regional a una persona.
   */
  async assignJefeRegional(id, region_id) {
    const response = await api.post(`/admin/personas/${id}/jefe-regional`, {
      region_id,
    });
    return response.data;
  },

  /**
   * Asigna el rol de Jefe Distrital a una persona.
   */
  async assignJefeDistrital(id, departamento_id) {
    const response = await api.post(`/admin/personas/${id}/jefe-distrital`, {
      departamento_id,
    });
    return response.data;
  },

  /**
   * Asigna el rol de Supervisor Curricular a una persona.
   */
  async assignSupervisor(id) {
    const response = await api.post(`/admin/personas/${id}/supervisor`);
    return response.data;
  },

  /**
   * Remueve un rol administrativo de una persona.
   */
  async removeRole(id, role) {
    const response = await api.delete(`/admin/personas/${id}/roles/${role}`);
    return response.data;
  },

  /**
   * Obtiene la comunidad educativa vinculada a una escuela específica.
   */
  async getComunidad(params = {}) {
    const response = await api.get("/admin/comunidad-educativa", { params });
    return response.data;
  },

  /**
   * Sube o reemplaza la foto de perfil de una persona.
   */
  async uploadFoto(id, formData) {
    const response = await api.post(`/admin/personas/${id}/foto`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Elimina la foto de perfil de una persona.
   */
  async deleteFoto(id) {
    const response = await api.delete(`/admin/personas/${id}/foto`);
    return response.data;
  },
};

export default personaService;
