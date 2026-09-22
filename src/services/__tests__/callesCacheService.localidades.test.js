import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import callesCacheService from "../callesCacheService";

describe("callesCacheService - localidades por departamento", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getLocalidades devuelve null (nunca lanza) sin IndexedDB", async () => {
    expect(window.indexedDB).toBeUndefined(); // jsdom no implementa IndexedDB

    await expect(callesCacheService.getLocalidades(64)).resolves.toBeNull();
  });

  it("saveLocalidades degrada con warning, sin lanzar", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      callesCacheService.saveLocalidades(64, [{ id: 1, nombre: "X" }]),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("ignora claves no numéricas y valores que no son arrays", async () => {
    await expect(callesCacheService.getLocalidades("abc")).resolves.toBeNull();
    await expect(
      callesCacheService.saveLocalidades("abc", []),
    ).resolves.toBeUndefined();
    await expect(
      callesCacheService.saveLocalidades(64, { data: [] }),
    ).resolves.toBeUndefined();
  });

  it("checkLocalidadesVersion purga y persiste sólo cuando la versión cambia", async () => {
    const clearSpy = vi
      .spyOn(callesCacheService, "clearAllLocalidades")
      .mockResolvedValue();

    await callesCacheService.checkLocalidadesVersion("v1");
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("sgei_localidades_version")).toBe("v1");

    await callesCacheService.checkLocalidadesVersion("v1");
    expect(clearSpy).toHaveBeenCalledTimes(1);

    await callesCacheService.checkLocalidadesVersion("v2");
    expect(clearSpy).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("sgei_localidades_version")).toBe("v2");

    await callesCacheService.checkLocalidadesVersion(null);
    expect(clearSpy).toHaveBeenCalledTimes(2);
  });
});
