import MiniSearch from "minisearch";
import { normalizeSearch, normalizeToken } from "./searchText";

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
 * Saneo: MiniSearch aborta el build COMPLETO si un documento
 * no tiene id ("document does not have ID field") o lo repite
 * ("duplicate ID"), así que se filtran antes de indexar.
 * ======================================================== */
const sanear = (documents) => {
  const vistos = new Set();
  const limpios = [];
  for (const d of documents) {
    if (d?.id == null) continue;
    const key = String(d.id);
    if (vistos.has(key)) continue;
    vistos.add(key);
    limpios.push(d);
  }
  const descartados = documents.length - limpios.length;
  if (descartados > 0) {
    console.warn(
      `catalogSearchIndex: ${descartados} documentos descartados (id ausente o duplicado)`,
    );
  }
  return limpios;
};

/* ========================================================
 * Ranking por cercanía al inicio del nombre.
 *
 * BM25 (MiniSearch) ignora la POSICIÓN de la coincidencia y el orden de las
 * palabras: "mar del plata" y "villa del mar" pueden empatar exactamente, y el
 * campo `contexto` (depto/provincia) puede empujar arriba a una localidad cuyo
 * NOMBRE no coincide con lo tipeado. Para un autocompletado hay que premiar
 * "el nombre empieza con lo que escribí" y usar el score sólo como desempate.
 * ======================================================== */
const EXACTO = 0;
const INICIO_FRASE = 1;
const INICIO_PRIMER_TERMINO = 2;
const CONTIENE_FRASE = 3;
const RESTO = 4;

/** Clave comparable: sin acentos, sin mayúsculas y sin puntuación ("AV. X" ~ "av x"). */
const clave = (s) =>
  normalizeSearch(s)
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const crearRanker = (consulta, clavesPorId) => {
  const q = clave(consulta);
  const primero = q.split(" ")[0];
  return (id) => {
    const n = clavesPorId.get(String(id)) || "";
    if (n === q) return EXACTO;
    if (n.startsWith(q)) return INICIO_FRASE;
    if (n.startsWith(primero)) return INICIO_PRIMER_TERMINO;
    if (n.includes(q)) return CONTIENE_FRASE;
    return RESTO; // matchea sólo por `contexto` (depto/provincia)
  };
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
  // Claves normalizadas UNA sola vez (en el build del índice, no en cada tecla).
  const clavesPorId = new Map(
    documents.map((d) => [String(d.id), clave(d.nombre || "")]),
  );

  return {
    size: documents.length,
    search(consulta, limite = maxResultados) {
      const term = (consulta || "").trim();
      if (term.length < MIN_CARACTERES) return [];

      const resultados = index.search(term);
      if (resultados.length <= 1) {
        return resultados
          .slice(0, limite)
          .map((r) => porId.get(String(r.id)))
          .filter(Boolean);
      }

      const posicion = crearRanker(term, clavesPorId);
      return resultados
        .map((r, i) => ({
          r,
          i,
          p: posicion(r.id),
          k: clavesPorId.get(String(r.id)) || "",
        }))
        .sort(
          (a, b) =>
            a.p - b.p || // 1) cercanía al inicio del NOMBRE
            (a.k < b.k ? -1 : a.k > b.k ? 1 : 0) || // 2) alfabético por NOMBRE
            b.r.score - a.r.score || // 3) nombres idénticos: desempata el contexto
            a.i - b.i, // 4) orden de inserción (estable)
        )
        .slice(0, limite)
        .map(({ r }) => porId.get(String(r.id)))
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
  const docs = sanear(documents);
  const index = new MiniSearch(opciones);
  index.addAll(docs.map(toIndexDoc));
  return envolver(index, docs, maxResultados);
}

/**
 * Variante que CEDE EL CONTROL entre lotes (`addAllAsync`), para catálogos
 * grandes (14.431 localidades) sin bloquear el hilo principal.
 */
export async function crearBuscadorAsync(
  documents,
  { opciones, toIndexDoc, maxResultados = MAX_RESULTADOS, batchSize = 500 },
) {
  const docs = sanear(documents);
  const index = new MiniSearch(opciones);
  await index.addAllAsync(docs.map(toIndexDoc), { batchSize });
  return envolver(index, docs, maxResultados);
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
