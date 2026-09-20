import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from "../api";
import provinciaService from "../provinciaService";
import catalogCache from "../catalogCacheService";

const paginador = (rows) => ({
  data: rows,
  total: rows.length,
  per_page: 500,
  current_page: 1,
  last_page: 1,
});

describe("provinciaService (caché de catálogos)", () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
    api.delete.mockReset();
  });

  it("usa caché bajo la clave provincias_admin y devuelve forma compatible", async () => {
    const rows = [{ id: 1, nombre: "BUENOS AIRES", nacion: { id: 1 } }];
    api.get.mockResolvedValue({ data: paginador(rows) });

    const primera = await provinciaService.getAll({ per_page: 500 });

    expect(primera.data).toEqual(rows);
    expect(api.get).toHaveBeenCalledWith("/admin/provincias", {
      params: { per_page: 500 },
    });

    const segunda = await provinciaService.getAll({ per_page: 500 });

    expect(segunda.data).toEqual(rows);
    expect(api.get).toHaveBeenCalledTimes(1); // segunda llamada desde caché
    expect(catalogCache.get("provincias_admin").data).toEqual(rows);
  });

  it("va directo a la API cuando el ABM envía page o search", async () => {
    const response = paginador([{ id: 1 }]);
    api.get.mockResolvedValue({ data: response });

    const result = await provinciaService.getAll({
      search: "",
      page: 1,
      per_page: 15,
    });

    expect(result).toEqual(response);
    expect(catalogCache.get("provincias_admin")).toBeNull();
  });

  it("las mutaciones invalidan por prefijo: limpian provincias y provincias_admin", async () => {
    api.post.mockResolvedValue({ data: { id: 2 } });

    catalogCache.set("provincias", [{ id: 1 }], "hash-publico");
    catalogCache.set("provincias_admin", [{ id: 1 }], "hash-admin");

    await provinciaService.create({});

    expect(catalogCache.get("provincias")).toBeNull();
    expect(catalogCache.get("provincias_admin")).toBeNull();
  });
});
