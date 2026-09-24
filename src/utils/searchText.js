/**
 * Normalización de texto para búsquedas (localidades, calles y cualquier
 * catálogo con `nombre`). Fuente ÚNICA de verdad: `geografiaService` la
 * re-exporta para no duplicar el algoritmo (evita el import circular).
 */

/** Normaliza descartando acentos, tildes, mayúsculas y espacios sobrantes. */
export function normalizeSearch(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Variante para `processTerm` de MiniSearch: devuelve `null` en vez de "" para
 * que la librería DESCARTE el token (un token vacío o compuesto sólo de
 * puntuación no debe entrar al índice).
 */
export function normalizeToken(term) {
  return normalizeSearch(term) || null;
}
