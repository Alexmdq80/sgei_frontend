import { NACION_ARGENTINA } from "./constants";

/**
 * Devuelve la nación seleccionada por id.
 * Acepta id numérico o string.
 */
export function findNacionById(nacions, nacionId) {
  return nacions.find((n) => String(n.id) === String(nacionId)) || null;
}

/**
 * Determina si la nación (por su id) es Argentina.
 * Usa el nombre normalizado (mayúsculas y sin espacios extra) para ser robusto.
 */
export function esNacionArgentina(nacions, nacionId) {
  const nacion = findNacionById(nacions, nacionId);
  return (
    !!nacion && String(nacion.nombre).trim().toUpperCase() === NACION_ARGENTINA
  );
}
