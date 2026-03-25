import axios from 'axios';
import api, { BACKEND_URL } from './api';

/**
 * Servicio de Autenticación para SGEI.
 */
const authService = {
    /**
     * Intenta iniciar sesión con las credenciales proporcionadas.
     * @param {Object} credentials { email, password }
     */
    async login(credentials) {
        // 1. Llamada a la ruta absoluta para el CSRF usando la instancia 'api'
        // para asegurar que se envíen los mismos headers (X-Requested-With, etc.)
        await api.get(`${BACKEND_URL}/sanctum/csrf-cookie`);

        // 2. Realizar login usando la instancia 'api' (que ya tiene el baseURL /api/v1)
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    /**
     * Cierra la sesión del usuario actual.
     */
    async logout() {
        const response = await api.post('/auth/logout');
        return response.data;
    },

    /**
     * Obtiene la información del usuario autenticado.
     */
    async me() {
        const response = await api.get('/auth/me');
        return response.data;
    }
};

export default authService;
