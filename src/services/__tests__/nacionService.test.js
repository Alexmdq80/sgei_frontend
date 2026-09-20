import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from "../api";
import nacionService from "../nacionService";
import catalogCache from "../catalogCacheService";

const paginador = (rows) => ({
  data: rows,
  total: rows.length,
  per_page: 500,
  current_page: 1,
  last_page: 1,
});

describe("nacionService (caché de catálogos)", () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
    api.delete.mockReset();
  });

  it("usa caché y devuelve forma compatible cuando no hay search ni page", async () => {
    const rows = [{ id: 1, nombre: "ARGENTINA" }];
    api.get.mockResolvedValue({ data: paginador(rows) });

    const primera = await nacionService.getAll({ per_page: 1000 });

    // Forma compatible con setItems(response.data || response) y setPagination(...)
    expect(primera.data).toEqual(rows);
    expect(primera.total).toBe(1);
    expect(primera.current_page).toBe(1);
    expect(primera.last_page).toBe(1);

    // El fetch de la caché pide SIEMPRE el listado completo
    expect(api.get).toHaveBeenCalledWith("/admin/naciones", {
      params: { per_page: 1000 },
    });

    // Segunda llamada (otro consumidor con per_page distinto): sale del caché
    const segunda = await nacionService.getAll({ per_page: 500 });

    expect(segunda.data).toEqual(rows);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("va directo a la API cuando se envía page (aunque sea page=1) para no romper el ABM", async () => {
    const response = paginador([{ id: 1 }]);
    api.get.mockResolvedValue({ data: response });

    const result = await nacionService.getAll({
      search: "",
      page: 1,
      per_page: 15,
    });

    // El paginador crudo del backend, tal cual lo espera NacionManagement
    expect(result).toEqual(response);
    expect(api.get).toHaveBeenCalledWith("/admin/naciones", {
      params: { search: "", page: 1, per_page: 15 },
    });
    expect(catalogCache.get("naciones")).toBeNull(); // las consultas de ABM no se cachean
  });

  it("va directo a la API cuando hay search con texto", async () => {
    api.get.mockResolvedValue({ data: paginador([]) });

    await nacionService.getAll({ search: "arg" });

    expect(api.get).toHaveBeenCalledWith("/admin/naciones", {
      params: { search: "arg" },
    });
    expect(catalogCache.get("naciones")).toBeNull();
  });

  it("create/update/delete invalidan el caché de naciones", async () => {
    api.post.mockResolvedValue({ data: { id: 2 } });
    api.put.mockResolvedValue({ data: { id: 1 } });
    api.delete.mockResolvedValue({ data: true });

    catalogCache.set("naciones", [{ id: 1 }], "hash");
    await nacionService.create({});
    expect(catalogCache.get("naciones")).toBeNull();

    catalogCache.set("naciones", [{ id: 1 }], "hash");
    await nacionService.update(1, {});
    expect(catalogCache.get("naciones")).toBeNull();

    catalogCache.set("naciones", [{ id: 1 }], "hash");
    await nacionService.delete(1);
    expect(catalogCache.get("naciones")).toBeNull();
  });
});
