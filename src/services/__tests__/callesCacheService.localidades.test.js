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
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

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
    const clearCatalogoSpy = vi
      .spyOn(callesCacheService, "clearCatalogoLocalidades")
      .mockResolvedValue();

    await callesCacheService.checkLocalidadesVersion("v1");
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(clearCatalogoSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("sgei_localidades_version")).toBe("v1");

    await callesCacheService.checkLocalidadesVersion("v1");
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(clearCatalogoSpy).toHaveBeenCalledTimes(1);

    await callesCacheService.checkLocalidadesVersion("v2");
    expect(clearSpy).toHaveBeenCalledTimes(2);
    expect(clearCatalogoSpy).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("sgei_localidades_version")).toBe("v2");

    await callesCacheService.checkLocalidadesVersion(null);
    expect(clearSpy).toHaveBeenCalledTimes(2);
  });

  it("purge limpia todos los almacenes y reinicia las versiones", async () => {
    const callesSpy = vi
      .spyOn(callesCacheService, "clearAllCalles")
      .mockResolvedValue();
    const locsSpy = vi
      .spyOn(callesCacheService, "clearAllLocalidades")
      .mockResolvedValue();
    const catalogoSpy = vi
      .spyOn(callesCacheService, "clearCatalogoLocalidades")
      .mockResolvedValue();

    localStorage.setItem("sgei_calles_version", "v1");
    localStorage.setItem("sgei_localidades_version", "v2");

    await callesCacheService.purge();

    expect(callesSpy).toHaveBeenCalledTimes(1);
    expect(locsSpy).toHaveBeenCalledTimes(1);
    expect(catalogoSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("sgei_calles_version")).toBeNull();
    expect(localStorage.getItem("sgei_localidades_version")).toBeNull();
  });
  it("getCatalogoLocalidades devuelve null (nunca lanza) sin IndexedDB", async () => {
    await expect(callesCacheService.getCatalogoLocalidades()).resolves.toBeNull();
  });

  it("saveCatalogoLocalidades degrada con warning, sin lanzar", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

    await expect(
      callesCacheService.saveCatalogoLocalidades([{ id: 1, nombre: "X" }]),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("saveCatalogoLocalidades ignora valores que no son arrays", async () => {
    await expect(
      callesCacheService.saveCatalogoLocalidades({ data: [] }),
    ).resolves.toBeUndefined();
    await expect(
      callesCacheService.saveCatalogoLocalidades([]),
    ).resolves.toBeUndefined();
  });

  it("clearCatalogoLocalidades no lanza sin IndexedDB", async () => {
    await expect(
      callesCacheService.clearCatalogoLocalidades(),
    ).resolves.toBeUndefined();
  });

});
