import { describe, it, expect, vi, afterEach } from "vitest";
import {
  crearBuscador,
  BUSCADOR_LOCALIDADES,
  BUSCADOR_CALLES,
  MAX_RESULTADOS,
} from "../catalogSearchIndex";

/**
 * El smoke test valida el CONTRATO de MiniSearch (índice crudo). Este valida la
 * FACTORY (`crearBuscador`): saneo de documentos y reordenamiento por cercanía
 * al inicio del nombre, que es lo que arregla el caso "mar del".
 */

const loc = (
  id,
  nombre,
  depto = "General Pueyrredon",
  prov = "Buenos Aires",
) => ({
  id,
  nombre,
  departamento: { nombre: depto, provincia: { nombre: prov } },
});

const buscador = (docs, bundle = BUSCADOR_LOCALIDADES) =>
  crearBuscador(docs, bundle);

const nombres = (docs, q, bundle = BUSCADOR_LOCALIDADES) =>
  buscador(docs, bundle)
    .search(q)
    .map((d) => d.nombre);

// Catálogo que reproduce el reporte original: "Santa Clara del Mar" (cuyo
// DEPARTAMENTO es "Mar Chiquita") le ganaba a "Mar del Plata" por el contexto.
const CATALOGO_MAR = [
  loc(1, "Mar del Plata"),
  loc(2, "Santa Clara del Mar", "Mar Chiquita"),
  loc(3, "MAR DEL TUYU", "La Costa"),
  loc(4, "Villa del Mar"),
  loc(5, "Mar de Ajo", "La Costa"),
  loc(6, "Mar Azul", "Villa Gesell"),
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalogSearchIndex · ranking por inicio del nombre", () => {
  it("'mar del' pone Mar del Plata primero y relega los 'X del Mar'", () => {
    // Orden completo (determinista con este catálogo fijo): primero los que
    // empiezan con la frase, después los que sólo contienen los términos.
    expect(nombres(CATALOGO_MAR, "mar del")).toEqual([
      "Mar del Plata",
      "MAR DEL TUYU",
      "Santa Clara del Mar",
      "Villa del Mar",
    ]);
  });

  it("no se rompe el AND: 'mar del' no trae nombres sin ambos términos", () => {
    const resultado = nombres(CATALOGO_MAR, "mar del");
    expect(resultado).not.toContain("Mar de Ajo");
    expect(resultado).not.toContain("Mar Azul");
  });

  it("la coincidencia exacta va antes que las variantes más largas", () => {
    const docs = [
      loc(1, "TANDIL"),
      loc(2, "TANDIL NORTE"),
      loc(3, "Tandil Sur"),
    ];
    expect(nombres(docs, "tandil")[0]).toBe("TANDIL");
  });

  it("el match sólo por contexto (depto/provincia) queda último", () => {
    const docs = [
      loc(1, "RIO CUARTO", "RIO CUARTO", "CORDOBA"),
      loc(2, "CORDOBA", "CAPITAL", "CORDOBA"),
    ];
    expect(nombres(docs, "cordoba")[0]).toBe("CORDOBA");
  });

  it("menos de MIN_CARACTERES no busca", () => {
    expect(buscador(CATALOGO_MAR).search("m")).toEqual([]);
  });

  it("ignora puntuación en calles: 'av rivadavia' encuentra 'AV. RIVADAVIA'", () => {
    const calles = [
      { id: 1, nombre: "AV. SAN MARTIN" },
      { id: 2, nombre: "SAN MARTIN" },
      { id: 3, nombre: "AV. RIVADAVIA" },
    ];
    const b = buscador(calles, BUSCADOR_CALLES);

    expect(b.search("san martin")[0].nombre).toBe("SAN MARTIN");
    expect(b.search("av rivadavia")[0].nombre).toBe("AV. RIVADAVIA");
  });
});

describe("catalogSearchIndex · saneo y límites", () => {
  it("descarta documentos sin id o duplicados sin romper el índice", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Sin el saneo, MiniSearch abortaba el build COMPLETO:
    // "duplicate ID 1" / "document does not have ID field 'id'".
    const b = buscador([
      { id: 1, nombre: "ALFA" },
      { id: 1, nombre: "BETA" },
      { id: undefined, nombre: "GAMMA" },
      { id: null, nombre: "DELTA" },
    ]);

    expect(b.size).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(b.search("alfa")).toHaveLength(1);
  });

  it("respeta el límite explícito y MAX_RESULTADOS por defecto", () => {
    const docs = Array.from({ length: 12 }, (_, i) =>
      loc(i + 1, `San ${i + 1}`),
    );
    const b = buscador(docs);

    expect(b.search("san")).toHaveLength(MAX_RESULTADOS);
    expect(b.search("san", 3)).toHaveLength(3);
  });
});
