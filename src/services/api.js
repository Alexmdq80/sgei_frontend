import axios from 'axios';

// Usamos las variables del .env que apuntan a api.sgei.local
const actualViteUrl = import.meta.env.VITE_API_URL;

// Si no hay variable, lanzamos un error en consola para saber que el .env falló
if (!actualViteUrl) {
    console.error("VITE_API_URL no está definida. Revisa tu archivo .env");
}

export const BACKEND_URL = actualViteUrl ? actualViteUrl.replace('/api/v1', '') : '';

const api = axios.create({
    baseURL: actualViteUrl,
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
});

// Interceptor para asegurar que el token CSRF se envíe en peticiones cross-subdomain
api.interceptors.request.use(config => {
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

    if (token) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
    }
    return config;
});

export default api;
