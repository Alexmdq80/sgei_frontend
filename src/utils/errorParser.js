/**
 * Extrae un mensaje de error legible de una respuesta del servidor (Laravel).
 * 
 * @param {Error} error - El objeto de error de Axios.
 * @param {string} defaultMsg - Mensaje por defecto si no se encuentra uno específico.
 * @returns {string} - El mensaje de error para mostrar al usuario.
 */
export const parseError = (error, defaultMsg = 'Error al procesar la solicitud.') => {
    const serverError = error.response?.data;
    
    if (serverError?.errors) {
        // Formato de validación de Laravel (objetos con arrays de mensajes)
        const firstError = Object.values(serverError.errors)[0];
        const msg = Array.isArray(firstError) ? firstError[0] : firstError;

        // Mapeo de claves técnicas comunes en caso de que el backend las devuelva sin traducir
        const technicalMappings = {
            'validation.unique': 'Este registro ya existe en el sistema y debe ser único.',
            'validation.required': 'Este campo es obligatorio.',
            'validation.exists': 'El elemento seleccionado no es válido.',
            'validation.max.string': 'El texto es demasiado largo.',
            'validation.min.string': 'El texto es demasiado corto.',
        };

        return technicalMappings[msg] || msg;
    }
    
    if (serverError?.error) return serverError.error;
    if (serverError?.message) return serverError.message;
    
    return defaultMsg;
};
