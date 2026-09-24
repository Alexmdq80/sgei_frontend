import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render as renderRTL,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { useCalleSearch } from "../useCalleSearch";
import personaService from "../../../../../services/personaService";
import callesCacheService from "../../../../../services/callesCacheService";
import { limpiarCacheCalles } from "../../../../../utils/calleSearchCache";

vi.mock("../../../../../services/personaService", () => ({
  default: {
    getCallesCompact: vi.fn(),
    searchCalles: vi.fn(),
  },
}));

vi.mock("../../../../../services/callesCacheService", () => ({
  default: {
    getLocalidad: vi.fn(),
    saveLocalidad: vi.fn(),
  },
}));

const POOL = [
  { id: 1, nombre: "SAN MARTÍN" },
  { id: 2, nombre: "AV. RIVADAVIA" },
  { id: 3, nombre: "BELGRANO" },
];

const render = (overrides = {}) =>
  renderHook(({ query, calleId = "" }) => useCalleSearch(99, query, calleId), {
    initialProps: { query: "", calleId: "", ...overrides },
  });

describe("useCalleSearch · índice en memoria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // La caché de índices es de MÓDULO: sobrevive entre tests. Sin esto, un
    // pool con el mismo `fingerprint` (largo + primer/último id) reutiliza el
    // índice anterior y el test mide otra cosa.
    limpiarCacheCalles();
    callesCacheService.getLocalidad.mockResolvedValue({ calles: POOL });
  });

  it("busca desde el pool cacheado sin tocar la red", async () => {
    const { result } = render({ query: "rivadavia" });

    await waitFor(() => expect(result.current.calles).toHaveLength(1));
    expect(result.current.calles[0].nombre).toBe("AV. RIVADAVIA");
    expect(personaService.searchCalles).not.toHaveBeenCalled();
    expect(personaService.getCallesCompact).not.toHaveBeenCalled();
  });

  it("es insensible a tildes y usa prefijos", async () => {
    const { result } = render({ query: "san mar" });

    await waitFor(() => expect(result.current.calles).toHaveLength(1));
    expect(result.current.calles[0].nombre).toBe("SAN MARTÍN");
  });

  it("tolera typos por transposición", async () => {
    const { result } = render({ query: "rivadvaia" });

    await waitFor(() => expect(result.current.calles).toHaveLength(1));
    expect(result.current.calles[0].id).toBe(2);
  });

  it("no busca con menos de 2 caracteres", async () => {
    const { result } = render({ query: "r" });

    await waitFor(() => expect(result.current.calles).toEqual([]));
    expect(personaService.searchCalles).not.toHaveBeenCalled();
  });

  it("no busca si ya hay una calle seleccionada", async () => {
    const { result } = render({ query: "rivadavia", calleId: 2 });

    await waitFor(() => expect(result.current.calles).toEqual([]));
  });

  it("usa el fallback HTTP con per_page cuando no hay pool", async () => {
    callesCacheService.getLocalidad.mockResolvedValue(null);
    personaService.getCallesCompact.mockResolvedValue([]);
    personaService.searchCalles.mockResolvedValue({ data: [] });

    render({ query: "riv" });

    await waitFor(() =>
      expect(personaService.searchCalles).toHaveBeenCalledWith(
        { localidad_id: 99, q: "riv", per_page: 10 },
        expect.objectContaining({ signal: expect.anything() }),
      ),
    );
  });
  // Reproduce el modal real: 3 combos sobre la MISMA localidad.
  const TresCombos = () => {
    useCalleSearch(99, "", "");
    useCalleSearch(99, "", "");
    useCalleSearch(99, "", "");
    return null;
  };

  it("deduplica la carga del pool entre los 3 combos (1 request, 1 save)", async () => {
    callesCacheService.getLocalidad.mockResolvedValue(null); // IndexedDB frío
    personaService.getCallesCompact.mockResolvedValue(POOL);

    renderRTL(<TresCombos />);

    await waitFor(() =>
      expect(personaService.getCallesCompact).toHaveBeenCalledTimes(1),
    );
    expect(callesCacheService.saveLocalidad).toHaveBeenCalledTimes(1);
  });
  it("no reutiliza índices entre tests (mismo fingerprint, contenido distinto)", async () => {
    // POOL tiene 3 ítems con ids 1..3; este pool tiene el MISMO largo y los
    // MISMOS extremos => mismo fingerprint "99:3:1:3". Sin limpiarCacheCalles()
    // en el beforeEach se devolvería el índice de POOL y "segunda" no matchearía.
    callesCacheService.getLocalidad.mockResolvedValue({
      calles: [
        { id: 1, nombre: "PRIMERA" },
        { id: 2, nombre: "SEGUNDA" },
        { id: 3, nombre: "TERCERA" },
      ],
    });

    const { result } = render({ query: "segunda" });

    await waitFor(() => expect(result.current.calles).toHaveLength(1));
    expect(result.current.calles[0].nombre).toBe("SEGUNDA");
  });
});
