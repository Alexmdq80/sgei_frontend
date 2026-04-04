import api from './api';

/**
 * Servicio para la gestión de Roles del sistema (Spatie).
 */
const roleService = {
    /**
     * Obtiene el listado de roles institucionales.
     */
    async getAll() {
        // Mantenemos la ruta anterior para compatibilidad o la cambiamos a /roles
        const response = await api.get('/rol-escolares');
        return response.data;
    }
};

export default roleService;
