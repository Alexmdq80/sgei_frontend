import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserManagement from "../UserManagement";

// Mocks de servicios
vi.mock("../../../services/userService", () => ({
  default: {
    getAll: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    confirmPersona: vi.fn(),
    resendActivation: vi.fn(),
    resendEmailVerification: vi.fn(),
    getCandidatosPersona: vi.fn(),
    vincularPersona: vi.fn(),
    desvincularPersona: vi.fn(),
  },
}));

vi.mock("../../../components/ConfirmationModal", () => ({
  default: ({ isOpen, onConfirm }) =>
    isOpen ? (
      <button data-testid="confirm-button" onClick={onConfirm}>
        Confirmar
      </button>
    ) : null,
}));

vi.mock("../../../services/documentoTipoService", () => ({
  default: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("../../../services/geografiaService", () => ({
  default: {
    getProvincias: vi.fn().mockResolvedValue({ data: [] }),
    getRegiones: vi.fn().mockResolvedValue({ data: [] }),
    getDepartamentos: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("../../../services/escuelaService", () => ({
  default: {},
}));

vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      es_administrador: true,
      roles: [{ name: "superuser" }],
    },
    showNotification: vi.fn(),
    hasPermission: vi.fn(() => true),
  }),
}));

vi.mock("../../../components/UserDetailModal", () => ({
  default: () => <div data-testid="user-detail-modal" />,
}));

describe("UserManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deshabilita los campos DNI y Email cuando el usuario tiene persona vinculada", async () => {
    const userService = (await import("../../../services/userService")).default;
    userService.getAll.mockResolvedValue({
      data: [
        {
          id: 1,
          nombre: "Juan Perez",
          email: "juan@example.com",
          documento_tipo_id: 1,
          documento_numero: "12345678",
          persona: { id: 10, nombre_completo: "PEREZ, JUAN" },
          roles: [],
          es_administrador: false,
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Juan Perez")).toBeInTheDocument();
    });

    const editButton = screen.getByTitle("Editar Información");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(
        screen.getByText(/campos DNI y Email están bloqueados/i),
      ).toBeInTheDocument();
    });

    const emailInput = screen.getByDisplayValue("juan@example.com");
    const docNumInput = screen.getByDisplayValue("12345678");

    expect(emailInput).toBeDisabled();
    expect(docNumInput).toBeDisabled();
  });

  it("permite editar los campos DNI y Email cuando el usuario NO tiene persona vinculada", async () => {
    const userService = (await import("../../../services/userService")).default;
    userService.getAll.mockResolvedValue({
      data: [
        {
          id: 2,
          nombre: "Maria Gomez",
          email: "maria@example.com",
          documento_tipo_id: 1,
          documento_numero: "87654321",
          persona: null,
          roles: [],
          es_administrador: false,
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Maria Gomez")).toBeInTheDocument();
    });

    const editButton = screen.getByTitle("Editar Información");
    fireEvent.click(editButton);

    await waitFor(() => {
      const emailInput = screen.getByDisplayValue("maria@example.com");
      expect(emailInput).not.toBeDisabled();
    });

    const docNumInput = screen.getByDisplayValue("87654321");

    expect(docNumInput).not.toBeDisabled();
  });

  it("muestra el botón de reenviar verificación solo si el email no está verificado", async () => {
    const userService = (await import("../../../services/userService")).default;
    userService.getAll.mockResolvedValue({
      data: [
        {
          id: 3,
          nombre: "Carlos Ruiz",
          email: "carlos@example.com",
          documento_tipo_id: 1,
          documento_numero: "11223344",
          persona: null,
          roles: [],
          es_administrador: false,
          has_password: true,
          email_verified_at: null,
          estado: "email_pendiente",
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
    });

    // El botón de reenviar verificación debe estar presente
    expect(
      screen.getByTitle("Reenviar Verificación de Email"),
    ).toBeInTheDocument();
  });

  it("llama a userService.resendEmailVerification al confirmar el reenvío", async () => {
    const userService = (await import("../../../services/userService")).default;
    userService.getAll.mockResolvedValue({
      data: [
        {
          id: 4,
          nombre: "Laura Diaz",
          email: "laura@example.com",
          documento_tipo_id: 1,
          documento_numero: "55667788",
          persona: null,
          roles: [],
          es_administrador: false,
          has_password: true,
          email_verified_at: null,
          estado: "email_pendiente",
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });
    userService.resendEmailVerification.mockResolvedValue({
      message:
        "Verificación de email reenviada con éxito al correo del usuario.",
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Laura Diaz")).toBeInTheDocument();
    });

    // Clic en el botón de reenviar verificación
    fireEvent.click(screen.getByTitle("Reenviar Verificación de Email"));

    // Esperar a que el modal de confirmación se abra (botón con data-testid)
    await waitFor(() => {
      expect(screen.getByTestId("confirm-button")).toBeInTheDocument();
    });

    // Confirmar
    fireEvent.click(screen.getByTestId("confirm-button"));

    // Verificar que el servicio fue llamado con el id del usuario
    await waitFor(() => {
      expect(userService.resendEmailVerification).toHaveBeenCalledWith(4);
    });
  });

  it("deshabilita el botón Guardar Cambios al abrir el modal sin modificaciones y lo habilita al editar un campo", async () => {
    const userService = (await import("../../../services/userService")).default;
    userService.getAll.mockResolvedValue({
      data: [
        {
          id: 5,
          nombre: "Pedro Lobo",
          email: "pedro@example.com",
          documento_tipo_id: 1,
          documento_numero: "99887766",
          persona: null,
          roles: [],
          es_administrador: false,
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Pedro Lobo")).toBeInTheDocument();
    });

    // Abrir el modal de edición
    fireEvent.click(screen.getByTitle("Editar Información"));

    await waitFor(() => {
      expect(screen.getByText("Guardar Cambios")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Guardar Cambios");

    // Al abrir el modal sin cambios, el botón debe estar deshabilitado
    expect(saveButton).toBeDisabled();

    // Modificar el nombre
    const nombreInput = screen.getByDisplayValue("Pedro Lobo");
    fireEvent.change(nombreInput, { target: { value: "Pedro Lobo Editado" } });

    // Ahora el botón debe estar habilitado
    expect(saveButton).toBeEnabled();
  });

  it("muestra confirmación al cancelar con cambios no guardados", async () => {
    const userService = (await import("../../../services/userService")).default;
    userService.getAll.mockResolvedValue({
      data: [
        {
          id: 6,
          nombre: "Ana Test",
          email: "ana@example.com",
          documento_tipo_id: 1,
          documento_numero: "11111111",
          persona: null,
          roles: [],
          es_administrador: false,
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1 },
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Ana Test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle("Editar Información"));

    await waitFor(() => {
      expect(screen.getByText("Guardar Cambios")).toBeInTheDocument();
    });

    // Modificar un campo para generar cambios
    const nombreInput = screen.getByDisplayValue("Ana Test");
    fireEvent.change(nombreInput, { target: { value: "Ana Modificada" } });

    // Hacer clic en Cancelar
    fireEvent.click(screen.getByText("Cancelar"));

    // Debe aparecer el modal de confirmación
    await waitFor(() => {
      expect(screen.getByTestId("confirm-button")).toBeInTheDocument();
    });
  });
});
