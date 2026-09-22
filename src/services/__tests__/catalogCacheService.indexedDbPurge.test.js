import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api", () => ({ default: { get: vi.fn() } }));
vi.mock("../callesCacheService", () => ({
  default: {
    checkGlobalVersion: vi.fn(),
    checkLocalidadesVersion: vi.fn(),
    purge: vi.fn().mockResolvedValue(undefined),
  },
}));

import callesCacheService from "../callesCacheService";
import catalogCache from "../catalogCacheService";

describe("catalogCacheService: purga de IndexedDB al invalidar el caché", () => {
  beforeEach(() => {
    localStorage.clear();
    // El singleton se construye al importar el módulo y ese primer `checkVersion()`
    // ya pudo haber purgado: reseteamos el contador para medir sólo lo del test.
    callesCacheService.purge.mockReset();
    callesCacheService.purge.mockResolvedValue(undefined);
  });

  it("purga localStorage e IndexedDB cuando la versión estructural cambia", () => {
    localStorage.setItem("sgei_cat_version", "version-vieja");
    localStorage.setItem(
      "sgei_cat_sexos",
      JSON.stringify({ data: [{ id: 1 }], hash: "h" }),
    );

    catalogCache.checkVersion(); // el constructor delega en este método

    expect(callesCacheService.purge).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("sgei_cat_sexos")).toBeNull();
    expect(localStorage.getItem("sgei_cat_version")).toBeTruthy();
    expect(localStorage.getItem("sgei_cat_version")).not.toBe("version-vieja");
  });

  it("no purga nada si la versión estructural coincide", () => {
    catalogCache.checkVersion(); // primera pasada: registra la versión vigente
    callesCacheService.purge.mockClear(); // descartamos la purga de esa pasada

    localStorage.setItem(
      "sgei_cat_sexos",
      JSON.stringify({ data: [{ id: 1 }], hash: "h" }),
    );

    catalogCache.checkVersion(); // misma versión: no debe purgar ni perder datos

    expect(callesCacheService.purge).not.toHaveBeenCalled();
    expect(localStorage.getItem("sgei_cat_sexos")).not.toBeNull();
  });
});
