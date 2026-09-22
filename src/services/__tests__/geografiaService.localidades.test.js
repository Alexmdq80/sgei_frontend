import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api", () => ({ default: { get: vi.fn() } }));
vi.mock("../callesCacheService", () => ({
  default: {
    getLocalidades: vi.fn(),
    saveLocalidades: vi.fn(),
    purge: vi.fn().mockResolvedValue(undefined),
  },
}));

import api from "../api";
import callesCacheService from "../callesCacheService";
import geografiaService from "../geografiaService";

const LOCS = [
  { id: 1, nombre: "SAN JUSTO", departamento_id: 64 },
  { id: 2, nombre: "GONZALEZ CATAN", departamento_id: 64 },
];

describe("geografiaService.getLocalidades (IndexedDB cache-first)", () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    callesCacheService.getLocalidades.mockReset();
    callesCacheService.saveLocalidades.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve el caché de IndexedDB sin llamar a la API", async () => {
    callesCacheService.getLocalidades.mockResolvedValue(LOCS);

    const result = await geografiaService.getLocalidades(64);

    expect(result).toEqual(LOCS);
    expect(api.get).not.toHaveBeenCalled();
    expect(callesCacheService.saveLocalidades).not.toHaveBeenCalled();
  });

  it("en cache miss descarga, persiste y devuelve el array", async () => {
    callesCacheService.getLocalidades.mockResolvedValue(null);
    callesCacheService.saveLocalidades.mockResolvedValue();
    api.get.mockResolvedValue({ data: LOCS });

    const result = await geografiaService.getLocalidades("64");

    expect(api.get).toHaveBeenCalledWith("/localidades", {
      params: { departamento_id: 64 },
    });
    expect(callesCacheService.saveLocalidades).toHaveBeenCalledWith(64, LOCS);
    expect(result).toEqual(LOCS);
  });

  it("si IndexedDB falla, degrada a la red sin romper", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    callesCacheService.getLocalidades.mockRejectedValue(new Error("blocked"));
    api.get.mockResolvedValue({ data: LOCS });

    await expect(geografiaService.getLocalidades(64)).resolves.toEqual(LOCS);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("no persiste listas vacías", async () => {
    callesCacheService.getLocalidades.mockResolvedValue(null);
    api.get.mockResolvedValue({ data: [] });

    await expect(geografiaService.getLocalidades(64)).resolves.toEqual([]);
    expect(callesCacheService.saveLocalidades).not.toHaveBeenCalled();
  });

  it("con params custom no toca IndexedDB", async () => {
    api.get.mockResolvedValue({ data: LOCS });

    await geografiaService.getLocalidades(64, { region_id: 3 });

    expect(callesCacheService.getLocalidades).not.toHaveBeenCalled();
    expect(callesCacheService.saveLocalidades).not.toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith("/localidades", {
      params: { region_id: 3, departamento_id: 64 },
    });
  });

  it("con departamento_id no numérico conserva el request legacy", async () => {
    api.get.mockResolvedValue({ data: [] });

    await geografiaService.getLocalidades("abc");

    expect(callesCacheService.getLocalidades).not.toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith("/localidades", {
      params: { departamento_id: "abc" },
    });
  });

  it("sin departamento_id devuelve [] sin ninguna llamada", async () => {
    await expect(geografiaService.getLocalidades("")).resolves.toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });
});
