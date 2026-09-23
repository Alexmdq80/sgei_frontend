import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PersonaDomicilioModal from "../PersonaManagement/components/PersonaDomicilioModal";
import personaService from "../../../services/personaService";

vi.mock("../../../services/personaService", () => ({
  default: {
    getDomicilio: vi.fn(),
    saveDomicilio: vi.fn(),
    // Usados por useCalleSearch cuando hay localidad seleccionada
    getCallesCompact: vi.fn().mockResolvedValue([]),
    searchCalles: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("../../../services/geografiaService", () => ({
  default: {
    getProvincias: vi.fn().mockResolvedValue([]),
    getDepartamentos: vi.fn().mockResolvedValue([]),
    getLocalidades: vi.fn().mockResolvedValue([]),
    // Precarga del catálogo completo al abrir el modal
    getCatalogoLocalidades: vi.fn().mockResolvedValue([]),
    searchLocalidades: vi.fn().mockResolvedValue([]),
    searchCalles: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../PersonaManagement/hooks/useGeografiaCascade", () => ({
  default: () => ({
    provincias: [],
    departamentos: [],
    localidades: [],
    handleNacionChange: vi.fn(),
    handleProvinciaChange: vi.fn(),
    handleDepartamentoChange: vi.fn(),
    clearGeoArgentina: vi.fn(),
    loadDepartamentos: vi.fn(),
    loadLocalidades: vi.fn(),
  }),
}));

const renderModal = (overrides = {}) =>
  render(
    <PersonaDomicilioModal
      persona={{ id: 1, apellido: "Pérez", nombre: "Juan" }}
      personaId={1}
      isOpen
      nacions={[{ id: 1, nombre: "Argentina" }]}
      onClose={vi.fn()}
      onOmit={vi.fn()}
      onSaved={vi.fn()}
      {...overrides}
    />,
  );

describe("PersonaDomicilioModal · stepper clicable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    personaService.getDomicilio.mockResolvedValue({ data: null });
  });

  it("navega al paso 3 al clickear el ícono de Resumen y Observaciones", async () => {
    renderModal();

    const btnResumen = await screen.findByRole("button", {
      name: /Ir al paso 3: Resumen y Observaciones/i,
    });
    fireEvent.click(btnResumen);

    expect(
      await screen.findByRole("button", { name: /Guardar Domicilio/i }),
    ).toBeInTheDocument();
  });

  it("no navega al paso 2 sin localidad elegida (aria-disabled)", async () => {
    renderModal();

    const btnCalles = await screen.findByRole("button", {
      name: /Ir al paso 2: Calles y Vivienda/i,
    });
    expect(btnCalles).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(btnCalles);

    expect(
      screen.queryByRole("button", { name: /Guardar Domicilio/i }),
    ).toBeNull();

    // Sigue en el Paso 1: su heading está visible y su ícono del stepper es el activo
    expect(
      await screen.findByRole("heading", { name: /Localidad \/ Ubicación/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ir al paso 1: Ubicación/i }),
    ).toHaveAttribute("aria-current", "step");
  });
});
