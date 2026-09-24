import MiniSearch from "minisearch";
import { normalizeToken } from "./searchText";

/** Cantidad máxima de resultados que se entregan a la UI. */
export const MAX_RESULTADOS = 10;
/** Mínimo de caracteres para disparar una búsqueda. */
export const MIN_CARACTERES = 2;

/**
 * `fuzzy` como FUNCIÓN (no como fracción). Verificado contra minisearch@7.2.0:
 *
 *   - Con `fuzzy < 1` la librería calcula `Math.round(term.length * fuzzy)` y
 *     topa el resultado con `maxFuzzy` (default 6).
 *   - Con `fuzzy >= 1` la distancia es ABSOLUTA (no se fracciona ni se topa).
 *   - El motor usa distancia de **Levenshtein**, que NO implementa Damerau:
 *     una transposición de letras adyacentes cuesta **2**.
 *
 * Consecuencia medida con `fuzzy: 0.2`: "tandli" (6 letras) -> round(1.2) = 1
 * -> NUNCA encontraba "TANDIL", mientras que "rivadvaia" (9 letras) ->
 * round(1.8) = 2 -> sí encontraba "RIVADAVIA". Misma clase de error, resultado
 * distinto según el largo de la palabra: tolerancia impredecible.
 *
 * Por eso: distancia absoluta 2 (cubre sustitución/borrado/inserción = 1, y
 * transposición = 2) y desactivada en términos de <4 letras, donde
 * `prefix: true` ya entrega resultados y la fuzzy sólo agrega ruido.
 *
 * Efecto lateral asumido: con distancia 2, una query de 4 letras puede
 * fuzzy-matchear tokens cortos ("tand" ~ "san"). El prefijo puntúa más alto
 * (MiniSearch decrece el peso según la distancia) y la UI corta con
 * `slice(0, MAX_RESULTADOS)`.
 */
export const fuzzyPorLargo = (term) => (term.length >= 4 ? 2 : null);

/** Opciones comunes a todos los índices del proyecto. */
const BASE = {
  idField: "id",
  processTerm: (term) => normalizeToken(term),
  searchOptions: {
    prefix: true, // autocompletado en tiempo real
    fuzzy: fuzzyPorLargo,
    combineWith: "AND", // multi-token estricto: "san mar" exige ambos prefijos
  },
};

/**
 * Opciones de MiniSearch para el catálogo de localidades.
 * Es un objeto de opciones de MiniSearch "puro" (fields/idField/processTerm/
 * searchOptions), así que sirve tanto para `new MiniSearch(...)` como para la
 * factory `crearBuscador`.
 */
export const OPCIONES_LOCALIDADES = {
  ...BASE,
  fields: ["nombre", "contexto"],
  searchOptions: {
    ...BASE.searchOptions,
    boost: { nombre: 3, contexto: 1 }, // el nombre pesa más que depto/provincia
  },
};

/** Opciones de MiniSearch para las calles de una localidad. */
export const OPCIONES_CALLES = {
  ...BASE,
  fields: ["nombre"],
  searchOptions: { ...BASE.searchOptions, boost: { nombre: 1 } },
};

/* ========================================================
 * Proyecciones: qué se indexa de cada registro
 * ======================================================== */

/** Proyecta una localidad del catálogo a un documento indexable. */
export const toIndexDocLocalidad = (loc) => ({
  id: loc.id,
  nombre: loc.nombre || "",
  contexto: `${loc.departamento?.nombre || ""} ${
    loc.departamento?.provincia?.nombre || ""
  }`.trim(),
});

/** Proyecta una calle (listado compacto) a un documento indexable. */
export const toIndexDocCalle = (calle) => ({
  id: calle.id,
  nombre: calle.nombre || "",
});

/** Bundles listos para pasar a la factory: `crearBuscador(catalogo, BUSCADOR_X)`. */
export const BUSCADOR_LOCALIDADES = {
  opciones: OPCIONES_LOCALIDADES,
  toIndexDoc: toIndexDocLocalidad,
};
export const BUSCADOR_CALLES = {
  opciones: OPCIONES_CALLES,
  toIndexDoc: toIndexDocCalle,
};

/* ========================================================
 * Factory
 * ======================================================== */

/**
 * Envuelve un índice ya construido. Los resultados devuelven los OBJETOS
 * ORIGINALES (no la proyección indexada), para preservar el contrato de la UI
 * (p.ej. `loc.departamento.provincia.id` en el omnibox del domicilio).
 */
const envolver = (index, documents, maxResultados) => {
  const porId = new Map(documents.map((d) => [String(d.id), d]));

  return {
    size: documents.length,
    search(consulta, limite = maxResultados) {
      const term = (consulta || "").trim();
      if (term.length < MIN_CARACTERES) return [];

      return index
        .search(term)
        .slice(0, limite)
        .map((resultado) => porId.get(String(resultado.id)))
        .filter(Boolean);
    },
  };
};

/**
 * Crea un buscador en memoria de forma SÍNCRONA (para pools chicos: calles de
 * una localidad).
 *
 * @param {Array<object>} documents  Registros originales.
 * @param {object}   bundle          `{ opciones, toIndexDoc }` (ver BUSCADOR_*).
 * @param {number}  [bundle.maxResultados]
 */
export function crearBuscador(
  documents,
  { opciones, toIndexDoc, maxResultados = MAX_RESULTADOS },
) {
  const index = new MiniSearch(opciones);
  index.addAll(documents.map(toIndexDoc));
  return envolver(index, documents, maxResultados);
}

/**
 * Variante que CEDE EL CONTROL entre lotes (`addAllAsync`), para catálogos
 * grandes (14.431 localidades) sin bloquear el hilo principal.
 */
export async function crearBuscadorAsync(
  documents,
  { opciones, toIndexDoc, maxResultados = MAX_RESULTADOS, batchSize = 500 },
) {
  const index = new MiniSearch(opciones);
  await index.addAllAsync(documents.map(toIndexDoc), { batchSize });
  return envolver(index, documents, maxResultados);
}

/**
 * Programa trabajo en tiempo ocioso, degradando en entornos sin
 * `requestIdleCallback` (jsdom no lo implementa → los tests usarían el fallback).
 */
export const enIdle = (fn) =>
  typeof window !== "undefined" &&
  typeof window.requestIdleCallback === "function"
    ? window.requestIdleCallback(fn, { timeout: 800 })
    : setTimeout(fn, 1);
