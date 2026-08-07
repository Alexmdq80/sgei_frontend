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
    getCandidatosPersona: vi.fn(),
    vincularPersona: vi.fn(),
    desvincularPersona: vi.fn(),
  },
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

vi.mock("../../../components/ConfirmationModal", () => ({
  default: () => <div data-testid="confirmation-modal" />,
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
});