import axios from "axios";

// Usamos las variables del .env que apuntan a api.sgei.local
const actualViteUrl = import.meta.env.VITE_API_URL;

// Si no hay variable, lanzamos una advertencia clara
if (!actualViteUrl) {
  console.warn("⚠️ VITE_API_URL no está definida. Revisa tu archivo .env");
}

export const BACKEND_URL = actualViteUrl
  ? actualViteUrl.replace("/api/v1", "")
  : "";

const api = axios.create({
  baseURL: actualViteUrl,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
});

// 1️⃣ Interceptor de Solicitudes: Inyectar token CSRF para peticiones cross-subdomain
api.interceptors.request.use((config) => {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  if (token) {
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(token);
  }
  return config;
});

// 2️⃣ 🛡️ Interceptor de Respuestas: Consola limpia y manejo de errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Errores graves (500 = Error de servidor, sin status = Caída de conexión/CORS)
    if (!status || status >= 500) {
      console.error(
        "🔥 Error de servidor o conexión:",
        error.response?.data?.message || error.message,
      );
    }

    // Sesión o token CSRF expirado en Laravel (419)
    if (status === 419) {
      console.warn(
        "⚠️ Sesión CSRF expirada. Es posible que debas recargar la página.",
      );
    }

    // Los errores 422 (validación), 403 (prohibido) y 404 (no encontrado)
    // pasan limpios al catch del componente para mostrar la notificación visual.
    return Promise.reject(error);
  },
);

export default api;
