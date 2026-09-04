/** Calcula la edad (años) a partir de una fecha ISO "YYYY-MM-DD". Devuelve null si la fecha es inválida. */
export function calcularEdad(fechaStr) {
  if (!fechaStr) return null;
  const cumple = new Date(fechaStr + "T00:00:00");
  if (isNaN(cumple.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
  return edad >= 0 ? edad : null;
}

/** Edad máxima admisible (años) que se acepta para una persona. */
export const EDAD_MAXIMA_ADMISIBLE = 100;
