import { crearBuscador, BUSCADOR_CALLES } from "./catalogSearchIndex";

/**
 * Caché de índices MiniSearch de calles, uno por localidad.
 *
 * Motivo: `PersonaDomicilioModal` instancia `useCalleSearch` TRES veces
 * (calle principal + 2 entrecalles) sobre el MISMO pool. Sin esta caché se
 * construirían 3 índices idénticos de la misma lista.
 *
 * La clave incluye un "fingerprint" del pool (largo + primer/último id) para
 * que un pool refrescado (tras purgar la caché por cambio de versión del
 * catálogo) genere un índice nuevo sin invalidación manual.
 */
const MAX_LOCALIDADES = 4; // LRU: se visitan pocas localidades por sesión
const cache = new Map();

const fingerprint = (localidadId, pool) =>
  `${localidadId}:${pool.length}:${pool[0]?.id ?? "x"}:${pool[pool.length - 1]?.id ?? "x"}`;

/** Devuelve (y memoiza) el buscador de calles de la localidad, o null si no hay pool. */
export function getBuscadorCalles(localidadId, pool) {
  if (!localidadId || !Array.isArray(pool) || pool.length === 0) return null;

  const key = fingerprint(localidadId, pool);

  const existente = cache.get(key);
  if (existente) {
    cache.delete(key); // LRU: mover al final
    cache.set(key, existente);
    return existente;
  }

  const buscador = crearBuscador(pool, BUSCADOR_CALLES);
  cache.set(key, buscador);
  if (cache.size > MAX_LOCALIDADES) cache.delete(cache.keys().next().value);

  return buscador;
}

/** Limpia la caché de índices (para purgas explícitas de la caché local). */
export function limpiarCacheCalles() {
  cache.clear();
}

/**
 * Deduplica la carga del pool de calles de una localidad.
 *
 * `PersonaDomicilioModal` monta TRES `useCalleSearch` (calle principal + 2
 * entrecalles) sobre la misma localidad: sin esto, con IndexedDB frío se
 * disparan 3 `GET /admin/calles?compact=true` idénticos (respuestas de cientos
 * o miles de filas). Reemplaza al `fetchingRef` del hook, que era por instancia
 * y bloqueaba la carga de una localidad nueva si la anterior seguía en vuelo.
 *
 * La entrada se libera sola al resolverse (o rechazarse), así que un fallo
 * permite reintentar en el próximo cambio de localidad.
 */
const poolsEnVuelo = new Map(); // localidadId -> Promise<pool>

export function cargarPoolCalles(localidadId, fetcher) {
  const key = String(localidadId);

  if (poolsEnVuelo.has(key)) return poolsEnVuelo.get(key);

  const promesa = fetcher().finally(() => poolsEnVuelo.delete(key));
  poolsEnVuelo.set(key, promesa);
  return promesa;
}
