import { describe, it, expect, vi } from "vitest";

vi.mock("../api", () => ({ default: { get: vi.fn() } }));
vi.mock("../callesCacheService", () => ({
    default: {
        getCatalogoLocalidades: vi.fn(),
        saveCatalogoLocalidades: vi.fn(),
        clearCatalogoLocalidades: vi.fn(),
        purge: vi.fn().mockResolvedValue(undefined), // lo usa catalogCacheService en su constructor
    },
}));
vi.mock("../callesCacheService", () => ({
    default: {
        getCatalogoLocalidades: vi.fn(),
        saveCatalogoLocalidades: vi.fn(),
        clearCatalogoLocalidades: vi.fn(),
        purge: vi.fn().mockResolvedValue(undefined), // lo usa catalogCacheService en su constructor
    },
}));

// ASCII puro: evita problemas de encoding en distintos shells/terminales.
const CORDOBA = "C\u00d3RDOBA";

const LOCS = [
    {
        id: 1,
        nombre: CORDOBA,
        departamento_id: 10,
        departamento: {
            id: 10,
            nombre: "CAPITAL",
            provincia_id: 5,
            provincia: { id: 5, nombre: CORDOBA },
        },
    },
    {
        id: 2,
        nombre: "TANDIL",
        departamento_id: 20,
        departamento: {
            id: 20,
            nombre: "TANDIL",
            provincia_id: 6,
            provincia: { id: 6, nombre: "BUENOS AIRES" },
        },
    },
];

async function servicioFresco() {
    vi.resetModules();
    const apiMod = await import("../api");
    const cacheMod = await import("../callesCacheService");
    const geoMod = await import("../geografiaService");
    // Los vi.fn() de las factory de vi.mock se COMPARTEN entre importaciones:
    // vi.resetModules() re-ejecuta el modulo real, pero NO re-ejecuta la factory
    // del mock. Reseteamos historial e implementaciones one-shot para que cada
    // test parta de cero.
    apiMod.default.get.mockReset();
    for (const fn of Object.values(cacheMod.default)) {
        if (typeof fn.mockReset === "function") fn.mockReset();
    }
    return { api: apiMod.default, cache: cacheMod.default, geo: geoMod.default, normalizeSearch: geoMod.normalizeSearch };
}


describe("geografiaService - catalogo completo de localidades", () => {
    it("normalizeSearch ignora tildes y mayusculas", async () => {
        const { normalizeSearch } = await servicioFresco();
        expect(normalizeSearch(CORDOBA)).toBe("cordoba");
        expect(normalizeSearch("  San Mart\u00edn  ")).toBe("san martin");
        expect(normalizeSearch(undefined)).toBe("");
    });

    it("syncCatalogoLocalidadesCompleto descarga, preindexa y persiste", async () => {
        const { geo, api, cache } = await servicioFresco();
        api.get.mockResolvedValue({ data: LOCS });

        const resultado = await geo.syncCatalogoLocalidadesCompleto();

        expect(api.get).toHaveBeenCalledWith("/localidades/catalogo-completo");
        expect(cache.saveCatalogoLocalidades).toHaveBeenCalledWith(LOCS);
        expect(resultado).toEqual(LOCS);
    });

    it("getCatalogoLocalidades devuelve la RAM sin tocar la red", async () => {
        const { geo, api, cache } = await servicioFresco();
        api.get.mockResolvedValue({ data: LOCS });
        await geo.syncCatalogoLocalidadesCompleto();
        api.get.mockClear();

        const catalogo = await geo.getCatalogoLocalidades();

        expect(api.get).not.toHaveBeenCalled();
        expect(cache.getCatalogoLocalidades).not.toHaveBeenCalled();
        expect(catalogo).toHaveLength(2);
        expect(catalogo[0]._searchKey).toContain("cordoba");
    });

    it("getCatalogoLocalidades cae a IndexedDB cuando no hay RAM", async () => {
        const { geo, cache } = await servicioFresco();
        cache.getCatalogoLocalidades.mockResolvedValue(LOCS);

        const catalogo = await geo.getCatalogoLocalidades();

        expect(cache.getCatalogoLocalidades).toHaveBeenCalledTimes(1);
        expect(catalogo[0]._searchKey).toContain("cordoba");
    });

    it("getCatalogoLocalidades sincroniza desde la red si no hay cache (en memoria ni IndexedDB)", async () => {
        const { geo, api, cache } = await servicioFresco();
        cache.getCatalogoLocalidades.mockResolvedValue(null);
        api.get.mockResolvedValue({ data: LOCS });

        const catalogo = await geo.getCatalogoLocalidades();

        expect(api.get).toHaveBeenCalledWith("/localidades/catalogo-completo");
        expect(catalogo).toHaveLength(2);
    });

    it("searchLocalidades filtra en memoria sin tildes sin llamar a la API", async () => {
        const { geo, api, cache } = await servicioFresco();
        cache.getCatalogoLocalidades.mockResolvedValue(LOCS);

        const res = await geo.searchLocalidades("cordoba", 15);

        expect(res).toHaveLength(1);
        expect(res[0].nombre).toBe(CORDOBA);
        expect(api.get).not.toHaveBeenCalled();
    });

    it("searchLocalidades prioriza coincidencias por nombre (la ciudad primero)", async () => {
        const { geo, api, cache } = await servicioFresco();
        const catalogoMezclado = [
            { id: 1, nombre: "RIO CUARTO", departamento_id: 111, departamento: { id: 111, nombre: "RIO CUARTO", provincia_id: 5, provincia: { id: 5, nombre: "CORDOBA" } } },
            { id: 2848, nombre: "CORDOBA", departamento_id: 118, departamento: { id: 118, nombre: "CAPITAL", provincia_id: 5, provincia: { id: 5, nombre: "CORDOBA" } } },
            { id: 2, nombre: "VILLA MARIA", departamento_id: 112, departamento: { id: 112, nombre: "SAN MARTIN", provincia_id: 5, provincia: { id: 5, nombre: "CORDOBA" } } },
        ];
        cache.getCatalogoLocalidades.mockResolvedValue(catalogoMezclado);

        const res = await geo.searchLocalidades("cordoba", 15);

        expect(res).toHaveLength(3);
        expect(res[0].nombre).toBe("CORDOBA"); // la ciudad queda arriba de los matches por provincia/departamento
        expect(api.get).not.toHaveBeenCalled();
    });
    it("searchLocalidades cae a la red si el catalogo falla", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        const { geo, api, cache } = await servicioFresco();
        cache.getCatalogoLocalidades.mockRejectedValue(new Error("indexeddb roto"));
        api.get
            .mockRejectedValueOnce(new Error("catalogo-completo caido"))
            .mockResolvedValueOnce({ data: [LOCS[0]] });

        const res = await geo.searchLocalidades("tandil", 15);

        expect(api.get).toHaveBeenLastCalledWith("/localidades", {
            params: { search: "tandil", per_page: 15 },
        });
        expect(res).toEqual([LOCS[0]]);
        warnSpy.mockRestore();
    });
});
