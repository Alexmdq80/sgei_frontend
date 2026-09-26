import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    // Precalentado del índice MiniSearch (Fase 6)
    prefetchLocalidadesBuscador: vi.fn(),
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

const buildModal = (overrides = {}) => (
  <PersonaDomicilioModal
    persona={{ id: 1, apellido: "Pérez", nombre: "Juan" }}
    personaId={1}
    isOpen
    nacions={[{ id: 1, nombre: "Argentina" }]}
    onClose={vi.fn()}
    onOmit={vi.fn()}
    onSaved={vi.fn()}
    {...overrides}
  />
);

const renderModal = (overrides = {}) => render(buildModal(overrides));

const DOMICILIO_EXISTENTE = {
  nacion_id: 1,
  provincia_id: 10,
  provincia_nombre: "Córdoba",
  departamento_id: 20,
  departamento_nombre: "Capital",
  localidad_id: 30,
  localidad_nombre: "Villa María",
  calle_nombre: "San Martín",
  numero: "123",
  observaciones: "Portero eléctrico",
};

const DOMICILIO_DESCONOCIDO = {
  nacion_id: "",
  observaciones: "No aportó datos",
};

describe("PersonaDomicilioModal · guardado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guarda el domicilio existente sin perder los datos hidratados", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: DOMICILIO_EXISTENTE,
    });
    personaService.saveDomicilio.mockResolvedValue({ data: {} });
    const onSaved = vi.fn();
    renderModal({ onSaved });

    fireEvent.click(
      await screen.findByRole("button", { name: /Modificar Domicilio/i }),
    );
    // El Paso 2 es alcanzable (hay localidad) → el Paso 3 ofrece Guardar
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    fireEvent.click(screen.getByRole("button", { name: /Guardar Domicilio/i }));

    await waitFor(() =>
      expect(personaService.saveDomicilio).toHaveBeenCalledTimes(1),
    );
    const [id, payload] = personaService.saveDomicilio.mock.calls[0];
    expect(id).toBe(1);
    expect(payload).toMatchObject({
      localidad_id: 30,
      calle_nombre: "San Martín",
      numero: "123",
      observaciones: "Portero eléctrico",
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("Domicilio Desconocido: lectura con aviso y edición en Paso 3 con blanquear", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: DOMICILIO_DESCONOCIDO,
    });
    personaService.saveDomicilio.mockResolvedValue({ data: {} });
    const onSaved = vi.fn();
    renderModal({ onSaved });

    expect(
      await screen.findByText(/Domicilio Desconocido/i),
    ).toBeInTheDocument();
    expect(screen.getByText("No aportó datos")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Modificar Domicilio/i }),
    );

    // Arranca en el Paso 3 y sin cascada (no hay jerarquía cargada)
    expect(
      await screen.findByRole("button", { name: /Guardar Domicilio/i }),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Seleccionar provincia")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Guardar Domicilio/i }));
    await waitFor(() =>
      expect(personaService.saveDomicilio).toHaveBeenCalledTimes(1),
    );
    expect(personaService.saveDomicilio.mock.calls[0][1]).toEqual({
      blanquear: true,
      observaciones: "No aportó datos",
    });
    expect(onSaved).toHaveBeenCalled();
  });
});

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

describe("PersonaDomicilioModal · modo lectura / edición", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre en modo lectura cuando la persona ya tiene domicilio", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: DOMICILIO_EXISTENTE,
    });
    renderModal();

    expect(
      await screen.findByText(/Datos del Domicilio Registrado/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Solo Lectura")).toBeInTheDocument();
    // El stepper no se renderiza en modo lectura
    expect(screen.queryByRole("button", { name: /Ir al paso 1/i })).toBeNull();
    expect(screen.getByText("San Martín")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    // Cada nombre cae en su fila; sin catálogo geográfico cae al fallback
    // de ubicacionSeleccion (el hook está mockeado vacío)
    expect(screen.getByText("Localidad").closest("div")).toHaveTextContent(
      "Villa María",
    );
    expect(screen.getByText("Provincia").closest("div")).toHaveTextContent(
      "Córdoba",
    );
    expect(screen.getByText("Departamento").closest("div")).toHaveTextContent(
      "Capital",
    );
  });

  it("pasa a edición y al cancelar restaura el snapshot", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: DOMICILIO_EXISTENTE,
    });
    renderModal();

    fireEvent.click(
      await screen.findByRole("button", { name: /Modificar Domicilio/i }),
    );

    // Stepper visible
    expect(
      await screen.findByRole("button", { name: /Ir al paso 1: Ubicación/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Editando")).toBeInTheDocument();

    // Con jerarquía cargada entra en CASCADA (no en el omnibox)
    expect(
      screen.getByPlaceholderText("Seleccionar provincia"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Seleccionar departamento"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Seleccionar localidad"),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Escribí tu localidad/i)).toBeNull();

    // conActual muestra los nombres actuales aunque el catálogo geográfico
    // esté vacío (el hook está mockeado sin listas)
    expect(screen.getByDisplayValue("Córdoba")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Capital")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Villa María")).toBeInTheDocument();

    // El toggle manual sigue disponible: vuelve al buscador rápido
    fireEvent.click(
      screen.getByRole("button", { name: /Volver al buscador rápido/i }),
    );
    expect(screen.queryByPlaceholderText("Seleccionar localidad")).toBeNull();
    expect(screen.getByDisplayValue("Villa María")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cancelar Edición/i }));

    expect(
      await screen.findByText(/Datos del Domicilio Registrado/i),
    ).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("abre directo en edición si la persona no tiene domicilio", async () => {
    personaService.getDomicilio.mockResolvedValue({ data: null });
    renderModal();

    expect(
      await screen.findByRole("button", { name: /Ir al paso 1: Ubicación/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Solo Lectura")).toBeNull();
    expect(screen.queryByText(/Datos del Domicilio Registrado/i)).toBeNull();
  });

  it("en modo lectura el footer sólo ofrece Cerrar y Modificar", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: DOMICILIO_EXISTENTE,
    });
    const onClose = vi.fn();
    renderModal({ onClose });

    await screen.findByText(/Datos del Domicilio Registrado/i);
    expect(screen.queryByRole("button", { name: /Omitir/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Limpiar/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Guardar Domicilio/i }),
    ).toBeNull();

    // El botón X del header también tiene aria-label="Cerrar" → se ubica por texto
    fireEvent.click(screen.getByText("Cerrar").closest("button"));
    expect(onClose).toHaveBeenCalled();
  });

  it("cancelar edición descarta los cambios del formulario", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: DOMICILIO_EXISTENTE,
    });
    renderModal();

    fireEvent.click(
      await screen.findByRole("button", { name: /Modificar Domicilio/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Volver al buscador rápido/i }),
    );
    fireEvent.change(screen.getByDisplayValue("Villa María"), {
      target: { value: "Rosario" },
    });
    expect(screen.getByDisplayValue("Rosario")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cancelar Edición/i }));

    expect(
      await screen.findByText(/Datos del Domicilio Registrado/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Villa María")).toBeInTheDocument();
    expect(screen.queryByText("Rosario")).toBeNull();
  });

  it("el botón del header alterna lectura y edición", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: DOMICILIO_EXISTENTE,
    });
    renderModal();

    fireEvent.click(
      await screen.findByRole("button", { name: /Editar Domicilio/i }),
    );
    expect(
      await screen.findByRole("button", { name: /Modo Lectura/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Editando")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Modo Lectura/i }));
    expect(
      await screen.findByText(/Datos del Domicilio Registrado/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Solo Lectura")).toBeInTheDocument();
  });

  it("con domicilio en el extranjero muestra el aviso y no ofrece cascada", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: { nacion_id: 999, calle_nombre: "Rue de Rivoli", numero: "10" },
    });
    renderModal();

    expect(
      await screen.findByText(/Domicilio en el extranjero/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Modificar Domicilio/i }),
    );
    expect(
      await screen.findByRole("button", { name: /Ir al paso 1: Ubicación/i }),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Seleccionar provincia")).toBeNull();
  });

  it("recalcula el modo de ubicación al abrir otra persona", async () => {
    personaService.getDomicilio.mockResolvedValueOnce({
      data: DOMICILIO_EXISTENTE,
    });
    const { rerender } = renderModal();

    fireEvent.click(
      await screen.findByRole("button", { name: /Modificar Domicilio/i }),
    );
    expect(
      screen.getByPlaceholderText("Seleccionar provincia"),
    ).toBeInTheDocument();

    personaService.getDomicilio.mockResolvedValueOnce({ data: null });
    rerender(
      buildModal({
        persona: { id: 2, apellido: "Gómez", nombre: "Ana" },
        personaId: 2,
      }),
    );

    // Sin jerarquía vuelve al buscador rápido (el Caso 1 resetea el modo)
    expect(
      await screen.findByPlaceholderText(/Escribí tu localidad/i),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Seleccionar provincia")).toBeNull();
  });
});
describe("PersonaDomicilioModal · errores y accesibilidad", () => {
  let errorSpy;
  beforeEach(() => {
    vi.clearAllMocks();
    // El modal loguea el error además de mostrarlo: se captura para que la
    // salida del test quede limpia y para poder asertar que se logueó.
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("Escape cierra el modal", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: DOMICILIO_EXISTENTE,
    });
    const onClose = vi.fn();
    renderModal({ onClose });

    // Espera a que termine la carga (si no, el listener está pero el modal
    // todavía muestra el loader)
    await screen.findByText(/Datos del Domicilio Registrado/i);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("muestra un banner de error si falla la carga del domicilio", async () => {
    personaService.getDomicilio.mockRejectedValue(new Error("boom"));
    renderModal();

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(/No se pudieron cargar/i);
    expect(errorSpy).toHaveBeenCalledWith(
      "Error al cargar domicilio:", // ← el catch de getDomicilio
      expect.any(Error),
    );
    // El loader se apaga igual (el finally marca la persona como cargada)
    expect(screen.queryByText(/Cargando datos del domicilio/i)).toBeNull();
  });

  it("descarta el banner al hacer click en la X", async () => {
    personaService.getDomicilio.mockRejectedValue(new Error("boom"));
    renderModal();

    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: /Descartar error/i }));

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("muestra un banner de error si falla el guardado", async () => {
    personaService.getDomicilio.mockResolvedValue({ data: null });
    personaService.saveDomicilio.mockRejectedValue(new Error("boom"));
    renderModal();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Ir al paso 3: Resumen y Observaciones/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Guardar Domicilio/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /No se pudo guardar/i,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "Error al guardar domicilio:", // ← el catch de handleSave
      expect.any(Error),
    );
    // El botón vuelve a estar disponible (saving = false en el finally)
    expect(
      screen.getByRole("button", { name: /Guardar Domicilio/i }),
    ).not.toBeDisabled();
  });

  it("el Paso 3 muestra las entrecalles hidratadas de la ficha", async () => {
    personaService.getDomicilio.mockResolvedValue({
      data: {
        ...DOMICILIO_EXISTENTE,
        calle_entre_1_nombre: "Mitre",
        calle_entre_2_nombre: "Belgrano",
      },
    });
    renderModal();

    fireEvent.click(
      await screen.findByRole("button", { name: /Modificar Domicilio/i }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Ir al paso 3: Resumen y Observaciones/i,
      }),
    );

    expect(await screen.findByText("Mitre y Belgrano")).toBeInTheDocument();
  });
});
