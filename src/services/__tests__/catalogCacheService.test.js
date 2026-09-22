import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../callesCacheService", () => ({
  default: {
    checkGlobalVersion: vi.fn(),
    checkLocalidadesVersion: vi.fn(),
    purge: vi.fn().mockResolvedValue(undefined),
  },
}));

import api from "../api";
import catalogCache from "../catalogCacheService";

describe("catalogCacheService", () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
  });

  afterEach(() => {
    // Garantiza que los spies de console.warn no se filtren a otros tests
    vi.restoreAllMocks();
  });

  it("get/set guardan y recuperan un catálogo con su hash", () => {
    catalogCache.set("sexos", [{ id: 1, nombre: "MASCULINO" }], "hash-1");

    const cached = catalogCache.get("sexos");

    expect(cached.data).toEqual([{ id: 1, nombre: "MASCULINO" }]);
    expect(cached.hash).toBe("hash-1");
  });

  it("set ignora valores que no son arrays y get purga estructuras inválidas", () => {
    // Este test provoca a propósito la degradación defensiva del servicio:
    // silenciamos el warning y lo verificamos como aserción.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    catalogCache.set("sexos", { data: [] }, "hash-1");
    expect(catalogCache.get("sexos")).toBeNull();

    localStorage.setItem("sgei_cat_sexos", "no-es-json");
    expect(catalogCache.get("sexos")).toBeNull();

    // El servicio degradó avisando por consola y purgando la clave corrupta
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain(
      "Error al leer caché de sexos",
    );
  });

  it("getOrFetch devuelve el caché sin llamar a la API", async () => {
    catalogCache.set("generos", [{ id: 1 }], "initial");
    const fetcher = vi.fn();

    const result = await catalogCache.getOrFetch("generos", fetcher);

    expect(result).toEqual([{ id: 1 }]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("getOrFetch con forceFresh=true ignora el caché y luego lo actualiza", async () => {
    catalogCache.set("generos", [{ id: 1, nombre: "VIEJO" }], "initial");
    const fetcher = vi.fn().mockResolvedValue([{ id: 2, nombre: "NUEVO" }]);

    const result = await catalogCache.getOrFetch("generos", fetcher, true);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 2, nombre: "NUEVO" }]);
    expect(catalogCache.get("generos").data).toEqual([
      { id: 2, nombre: "NUEVO" },
    ]);
  });

  it("invalidate borra por prefijo (incluye claves compuestas)", () => {
    catalogCache.set("regiones", [{ id: 1 }], "a");
    catalogCache.set("regiones_todas", [{ id: 2 }], "b");
    catalogCache.set("regiones_prov_5", [{ id: 3 }], "c");
    catalogCache.set("generos", [{ id: 4 }], "d");

    catalogCache.invalidate("regiones");

    expect(catalogCache.get("regiones")).toBeNull();
    expect(catalogCache.get("regiones_todas")).toBeNull();
    expect(catalogCache.get("regiones_prov_5")).toBeNull();
    expect(catalogCache.get("generos").data).toEqual([{ id: 4 }]);
  });

  it("syncWithManifest invalida el caché viejo ANTES de llamar al fetcher", async () => {
    catalogCache.set(
      "documento_tipos",
      [{ id: 1, nombre: "VIEJO" }],
      "hash-viejo",
    );
    api.get.mockResolvedValue({ data: { documento_tipos: "hash-nuevo" } });

    // Simula un servicio que internamente usa getOrFetch: sin el invalidate previo,
    // leería el dato viejo y lo guardaría con el hash nuevo (caché envenenado).
    const fetcher = vi
      .fn()
      .mockImplementation(() =>
        catalogCache.getOrFetch("documento_tipos", () =>
          Promise.resolve([{ id: 2, nombre: "NUEVO" }]),
        ),
      );

    await catalogCache.syncWithManifest({ documento_tipos: fetcher });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(catalogCache.get("documento_tipos").data).toEqual([
      { id: 2, nombre: "NUEVO" },
    ]);
    expect(catalogCache.get("documento_tipos").hash).toBe("hash-nuevo");
  });

  it("syncWithManifest no refresca si el hash coincide", async () => {
    catalogCache.set("sexos", [{ id: 1 }], "hash-igual");
    api.get.mockResolvedValue({ data: { sexos: "hash-igual" } });

    const fetcher = vi.fn();
    await catalogCache.syncWithManifest({ sexos: fetcher });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("syncWithManifest tolera fallos de red sin romper la app", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    api.get.mockRejectedValue(new Error("network"));

    const fetcher = vi.fn();
    await expect(
      catalogCache.syncWithManifest({ sexos: fetcher }),
    ).resolves.toBeUndefined();

    // El fallo se absorbe: no se propaga, no se invoca el fetcher y sólo se avisa
    expect(fetcher).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain(
      "No se pudo verificar el manifiesto",
    );
  });
});
