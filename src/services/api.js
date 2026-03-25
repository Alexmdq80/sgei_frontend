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
/*import axios from 'axios';

// Forzamos el uso de la IP 127.0.0.1 para evitar conflictos de resolución localhost
const fallbackUrl = 'http://127.0.0.1:8000/api/v1';
const actualViteUrl = import.meta.env.VITE_API_URL;

export const BACKEND_URL = (actualViteUrl || fallbackUrl).replace('/api/v1', '');

const api = axios.create({
    // Si VITE_API_URL no está cargado, usamos el fallback explícito
    baseURL: actualViteUrl || fallbackUrl,
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
});

export default api;*/

/*
import axios from 'axios';

// Extraemos la URL base del backend (ej: http://localhost:8000) eliminando el prefijo de la API
export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '');
//export const BACKEND_URL = 'http://localhost:8000';

/*const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    withCredentials: true,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
});*//*
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN', // Nombre de la cookie que envía Laravel
    xsrfHeaderName: 'X-XSRF-TOKEN', // Nombre del encabezado que espera Laravel
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
});

export default api;*/
