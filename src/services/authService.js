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
     * Registra un nuevo usuario en el sistema.
     * @param {Object} userData { nombre, email, documento_tipo_id, documento_numero, password, password_confirmation }
     */
    async register(userData) {
        // Asegurar CSRF antes de registrar
        await api.get(`${BACKEND_URL}/sanctum/csrf-cookie`);
        
        const response = await api.post('/auth/register', userData);
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
    },

    /**
     * Solicita el reenvío del correo de verificación.
     * @param {string} email
     */
    async resendVerification(email) {
        const response = await api.post('/auth/verify/resend', { email });
        return response.data;
    },

    /**
     * Verifica la dirección de correo electrónico con el token proporcionado.
     * @param {string} email
     * @param {string} token
     */
    async verifyEmail(email, token) {
        const response = await api.get('/auth/verify', {
            params: { email, token }
        });
        return response.data;
    },

    /**
     * Solicita un enlace de restablecimiento de contraseña.
     * @param {string} email 
     */
    async forgotPassword(email) {
        await api.get(`${BACKEND_URL}/sanctum/csrf-cookie`);
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    /**
     * Restablece la contraseña con el token proporcionado.
     * @param {Object} data { email, token, password, password_confirmation }
     */
    async resetPassword(data) {
        await api.get(`${BACKEND_URL}/sanctum/csrf-cookie`);
        const response = await api.post('/auth/reset-password', data);
        return response.data;
    }
};

export default authService;
