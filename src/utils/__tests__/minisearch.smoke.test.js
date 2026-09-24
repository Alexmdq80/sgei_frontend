import { describe, it, expect } from "vitest";
import MiniSearch from "minisearch";
import { OPCIONES_LOCALIDADES } from "../catalogSearchIndex";
/**
 * Smoke test de la dependencia MiniSearch (Fase 2).
 * Objetivo: probar que la librería funciona en el entorno real del proyecto
 * (ESM + jsdom + vitest) y que las opciones que vamos a usar en producción
 * producen los resultados que exige el criterio de éxito #1.
 *
 * DECISIÓN DE FUZZY (verificada contra minisearch@7.2.0):
 *   MiniSearch calcula `maxDistance = Math.round(term.length * fuzzy)` cuando
 *   `fuzzy < 1` (fraccionario) y usa distancia de **Levenshtein**, que NO
 *   implementa Damerau: una transposición de letras adyacentes cuesta 2.
 *   Con `fuzzy: 0.2`, "tandli" (6 letras) -> round(1.2) = 1 -> NUNCA matchea
 *   "TANDIL", mientras que "rivadvaia" (9 letras) -> round(1.8) = 2 -> sí
 *   matchea "RIVADAVIA". Misma clase de error, resultado según el largo.
 *   => Se usa distancia ABSOLUTA (`>= 1` no se fracciona ni se topa con
 *   `maxFuzzy`), desactivada en términos de <4 letras, donde `prefix: true`
 *   ya entrega resultados.
 *   Efecto lateral medido: con distancia 2, un query de 4 letras puede
 *   fuzzy-matchear tokens cortos ("tand" ~ "san"); el prefijo puntúa más alto
 *   y la UI corta con slice(0, 10).
 *
 * NO es código productivo: valida el CONTRATO de la dependencia. Importa las
 * constantes REALES (`OPCIONES_LOCALIDADES` de catalogSearchIndex.js) para que
 * el test se rompa si alguien "arregla" la configuración de búsqueda, p.ej.
 * volviendo a `fuzzy: 0.2`.
 */

const DOCS = [
  { id: 1, nombre: "SAN MARTÍN", contexto: "SAN MARTÍN BUENOS AIRES" },
  { id: 2, nombre: "CÓRDOBA", contexto: "CAPITAL CÓRDOBA" },
  { id: 3, nombre: "TANDIL", contexto: "TANDIL BUENOS AIRES" },
  { id: 4, nombre: "VILLA MARÍA", contexto: "SAN MARTÍN CÓRDOBA" },
  { id: 5, nombre: "RIO CUARTO", contexto: "RIO CUARTO CÓRDOBA" }, // sólo matchea "cordoba" por contexto
];

const nuevoIndice = () => {
  const index = new MiniSearch(OPCIONES_LOCALIDADES);
  index.addAll(DOCS);
  return index;
};

const ids = (index, q) => index.search(q).map((r) => r.id);

describe("MiniSearch (dependencia) · smoke", () => {
  it("se importa como ESM y expone la API que vamos a usar", () => {
    expect(typeof MiniSearch).toBe("function");
    expect(typeof MiniSearch.loadJSON).toBe("function");
    expect(typeof MiniSearch.getDefault).toBe("function");
    expect(MiniSearch.getDefault("tokenize")).toBeInstanceOf(Function);
    expect(MiniSearch.getDefault("processTerm")).toBeInstanceOf(Function);
  });

  it("indexa y cuenta documentos", () => {
    expect(nuevoIndice().documentCount).toBe(DOCS.length);
  });

  it("prefijo multi-token: 'san mar' encuentra SAN MARTÍN (criterio de éxito #1)", () => {
    const resultado = ids(nuevoIndice(), "san mar");
    expect(resultado).toContain(1); // SAN MARTÍN
    expect(resultado).toContain(4); // VILLA MARÍA (contexto SAN MARTÍN)
  });

  it("ignora tildes y mayúsculas: 'cordoba' encuentra CÓRDOBA", () => {
    expect(ids(nuevoIndice(), "cordoba")).toContain(2);
    expect(ids(nuevoIndice(), "CÓRDOBA")).toContain(2);
  });

  it("tolera typos de distancia 1 (borrado, sustitución, letra extra)", () => {
    expect(ids(nuevoIndice(), "tandl")).toContain(3); // borrado de la 'i' (tampoco es prefijo)
    expect(ids(nuevoIndice(), "tandul")).toContain(3); // sustitución i->u
    expect(ids(nuevoIndice(), "cuartoo")).toContain(5); // letra extra al final
  });

  it("cubre transposiciones adyacentes (lev=2): lo que fuzzy 0.2 NO cubría", () => {
    // Levenshtein('tandli','tandil') === 2 (una transposición no cuesta 1).
    // Con el modo fraccionario esto devolvía [] porque round(6 * 0.2) === 1.
    expect(ids(nuevoIndice(), "tandli")).toContain(3);
    expect(ids(nuevoIndice(), "cordboa")).toContain(2);
    expect(ids(nuevoIndice(), "cordba")).toContain(2);
  });

  it("fuzzy desactivado en términos de <4 letras (guardia de la decisión)", () => {
    expect(ids(nuevoIndice(), "xan")).toEqual([]); // 3 letras: ni prefijo ni fuzzy -> sin ruido
    expect(ids(nuevoIndice(), "sann")).toContain(1); // 4 letras: el mismo typo ahora sí entra
    expect(ids(nuevoIndice(), "tan")).toContain(3); // 3 letras: el prefijo sigue funcionando
  });

  it("prefijo parcial: 'tand' trae TANDIL primero, con el ruido de distancia 2 detrás", () => {
    const resultado = ids(nuevoIndice(), "tand");
    expect(resultado).toContain(3);
    expect(resultado[0]).toBe(3); // el prefijo puntúa más alto que el fuzzy
    // Con distancia 2, "tand" queda a 2 de "san" y arrastra SAN MARTÍN / VILLA MARÍA.
    // Es el motivo por el que la UI limita a MAX_RESULTADOS (10) y no confía en el orden solo.
    expect(resultado).toContain(1);
  });

  it("boost de nombre: en 'cordoba' la ciudad precede al match por contexto", () => {
    const resultado = ids(nuevoIndice(), "cordoba");
    expect(resultado).toContain(5); // RIO CUARTO matchea por contexto (provincia CÓRDOBA)
    expect(resultado[0]).toBe(2); // CÓRDOBA gana por boost de `nombre`
  });

  it("combineWith AND: 'san mar' NO arrastra documentos sin todos los términos", () => {
    expect(ids(nuevoIndice(), "san mar")).not.toContain(5); // RIO CUARTO
    expect(ids(nuevoIndice(), "san mar")).not.toContain(3); // TANDIL
  });

  it("addAllAsync indexa por lotes sin bloquear (lo usa la Fase 4)", async () => {
    const index = new MiniSearch(OPCIONES_LOCALIDADES);
    await index.addAllAsync(DOCS, { batchSize: 2 });
    expect(index.documentCount).toBe(DOCS.length);
    expect(ids(index, "tand")).toContain(3);
  });

  it("round-trip toJSON/loadJSON y NO restaura los documentos (insumo de la Fase 8)", () => {
    const json = JSON.stringify(nuevoIndice());
    const restaurado = MiniSearch.loadJSON(json, OPCIONES_LOCALIDADES);

    expect(ids(restaurado, "tand")).toContain(3); // el índice sobrevive
    expect(restaurado.search("tand")[0].nombre).toBeUndefined(); // los docs NO: hay que re-mapear por id
  });
});
