import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from "../api";
import regionService from "../regionService";
import catalogCache from "../catalogCacheService";

const paginador = (rows) => ({
  data: rows,
  total: rows.length,
  per_page: 500,
  current_page: 1,
  last_page: 1,
});

describe("regionService (caché de catálogos)", () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
    api.delete.mockReset();
  });

  it("usa caché y NO contamina la caché de geografía (regiones_todas)", async () => {
    const rows = [{ id: 1, numero: "1", provincia: { id: 1 } }];
    api.get.mockResolvedValue({ data: paginador(rows) });

    const result = await regionService.getAll({ per_page: 500 });

    expect(result.data).toEqual(rows);
    expect(catalogCache.get("regiones_admin").data).toEqual(rows);
    expect(catalogCache.get("regiones_todas")).toBeNull();
    expect(catalogCache.get("regiones")).toBeNull();
  });

  it("va directo a la API cuando el ABM envía page o search", async () => {
    const response = paginador([{ id: 1 }]);
    api.get.mockResolvedValue({ data: response });

    const result = await regionService.getAll({
      search: "1",
      page: 2,
      per_page: 15,
    });

    expect(result).toEqual(response);
    expect(api.get).toHaveBeenCalledWith("/admin/regiones", {
      params: { search: "1", page: 2, per_page: 15 },
    });
    expect(catalogCache.get("regiones_admin")).toBeNull();
  });

  it("las mutaciones invalidan el prefijo regiones (ABM y cascadas geográficas)", async () => {
    api.delete.mockResolvedValue({ data: true });

    catalogCache.set("regiones_admin", [{ id: 1 }], "hash-admin");
    catalogCache.set("regiones_todas", [{ id: 1 }], "hash-geo");

    await regionService.delete(1);

    expect(catalogCache.get("regiones_admin")).toBeNull();
    expect(catalogCache.get("regiones_todas")).toBeNull();
  });
});
