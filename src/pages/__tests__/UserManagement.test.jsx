import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserManagement from "../Admin/UserManagement";
import escuelaService from "../../services/escuelaService";
import userService from "../../services/userService";
import roleService from "../../services/roleService";
import documentoTipoService from "../../services/documentoTipoService";
import { useAuth } from "../../context/AuthContext";

// Mock de hooks y servicios
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/escuelaService", () => ({
  default: {
    getPendingRequests: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
    updateLink: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../services/userService", () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock("../../services/roleService", () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([
      { id: 5, name: "Docente" },
      { id: 10, name: "Directivo" },
      { id: 15, name: "supervisor_curricular" },
    ]),
  },
}));

vi.mock("../../services/documentoTipoService", () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([{ id: 1, nombre: "DNI" }]),
  },
}));

vi.mock("../../services/geografiaService", () => ({
  default: {
    getProvincias: vi.fn().mockResolvedValue([]),
    getRegiones: vi.fn().mockResolvedValue([]),
    getDepartamentos: vi.fn().mockResolvedValue([]),
  },
}));

describe("UserManagement Component", () => {
  const mockUsers = [
    {
      id: "1",
      nombre: "Juan Perez",
      email: "juan@example.com",
      documento_numero: "123",
      es_administrador: false,
      roles: [],
    },
    {
      id: "2",
      nombre: "Admin User",
      email: "admin@example.com",
      documento_numero: "456",
      es_administrador: true,
      roles: [],
    },
  ];

  const mockRequests = [
    {
      id: "req-1",
      usuario: { nombre: "Maria Solicitante", email: "maria@example.com" },
      escuela: { nombre: "Escuela 1", cue_anexo: "123" },
      role: { id: 5, name: "Docente" },
    },
  ];

  const mockShowNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useAuth.mockReturnValue({
      user: { id: "admin-id", es_administrador: true, nombre: "Admin" },
      showNotification: mockShowNotification,
      hasPermission: vi.fn().mockReturnValue(true),
    });

    userService.getAll.mockResolvedValue({
      data: mockUsers,
      meta: { current_page: 1, last_page: 1, total: 2 },
    });

    escuelaService.getPendingRequests.mockResolvedValue({
      data: mockRequests,
    });
  });

  it("debe renderizar el listado de usuarios por defecto", async () => {
    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("Juan Perez")).toBeInTheDocument();
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });
  });

  it("debe abrir el modal de detalle del usuario al hacer clic en Ver", async () => {
    const detailResponse = {
      data: {
        id: "1",
        nombre: "Juan Perez",
        email: "juan@example.com",
        documento_numero: "123",
        es_administrador: false,
        roles: [],
        estado: "activo",
        email_verified_at: "2026-01-15T14:30:00.000000Z",
        persona: {
          id: "p-1",
          nombre_completo: "PEREZ, JUAN",
          cuil: "20-30111222-3",
          contacto: {
            telefono_fijo: "4222-3333",
            telefono_movil: "155-555-5555",
            email: "juan@example.com",
          },
        },
      },
    };
    userService.getById.mockResolvedValue(detailResponse);

    render(<UserManagement />);

    await waitFor(() => screen.getByText("Juan Perez"));

    const viewBtn = screen.getAllByTitle("Ver Información del Usuario")[0];
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(userService.getById).toHaveBeenCalledWith("1");
      expect(screen.getByText("PEREZ, JUAN")).toBeInTheDocument();
      expect(screen.getByText("20-30111222-3")).toBeInTheDocument();
      expect(screen.getByText("Activo")).toBeInTheDocument();
    });
  });

  it("debe abrir el modal de edición de usuario", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Juan Perez"));

    const editBtns = screen.getAllByTitle("Editar Información");
    fireEvent.click(editBtns[0]);

    expect(
      screen.getByText("Editar Información del Usuario", { selector: "h2" }),
    ).toBeInTheDocument();
    // El nombre y email están en los inputs del formulario
    expect(screen.getByDisplayValue("Juan Perez")).toBeInTheDocument();
    expect(screen.getByDisplayValue("juan@example.com")).toBeInTheDocument();
  });

  it("debe llamar a userService.delete al confirmar la eliminación", async () => {
    userService.delete.mockResolvedValue({ message: "Success" });

    render(<UserManagement />);

    await waitFor(() => screen.getByText("Juan Perez"));

    const deleteBtn = screen.getAllByTitle("Eliminar Cuenta")[0];
    fireEvent.click(deleteBtn);

    // Interactuar con el modal de confirmación
    const confirmBtns = await screen.findAllByRole("button", {
      name: /^Eliminar$/i,
    });
    // Seleccionamos el último botón con ese nombre, que suele ser el del modal (que se monta al final)
    // O mejor aún, buscamos el que NO tiene el title "Eliminar" (que son los de la tabla)
    const modalConfirmBtn = confirmBtns.find(
      (btn) => !btn.hasAttribute("title"),
    );
    fireEvent.click(modalConfirmBtn);

    await waitFor(() => {
      expect(userService.delete).toHaveBeenCalledWith("1");
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Usuario eliminado con éxito.",
        "success",
      );
    });
  });
  it("debe renderizar el selector de filtro por rol con las opciones correctas", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Juan Perez"));

    //const roleSelect = screen.getByRole("combobox", { name: "" });
    // Buscar el select por su valor
    const selects = screen.getAllByRole("combobox");
    //const roleSelectEl = selects.find((s) => s.value === "");

    // Verificar que existe el select de rol con las opciones
    expect(screen.getByText("Todos los Roles")).toBeInTheDocument();
    expect(screen.getByText("SuperUsuarios")).toBeInTheDocument();
    expect(screen.getByText("Jefes Provinciales")).toBeInTheDocument();
    expect(screen.getByText("Jefes Regionales")).toBeInTheDocument();
    expect(screen.getByText("Jefes Distritales")).toBeInTheDocument();
    expect(screen.getByText("Equipos Directivos")).toBeInTheDocument();
    expect(screen.getByText("Profesores / Docentes")).toBeInTheDocument();
    expect(screen.getByText("Preceptores")).toBeInTheDocument();
  });
  it("debe llamar a userService.getAll con el parámetro role al cambiar el filtro", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Juan Perez"));

    // Encontrar el select de rol por su opción "Todos los Roles"
    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects.find((s) =>
      Array.from(s.options).some((o) => o.text === "Todos los Roles"),
    );

    fireEvent.change(roleSelect, { target: { value: "profesor" } });

    await waitFor(() => {
      expect(userService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "profesor",
          page: 1,
        }),
      );
    });
  });
  it("debe resetear a la página 1 al cambiar el filtro de rol", async () => {
    render(<UserManagement />);

    await waitFor(() => screen.getByText("Juan Perez"));

    // Simular que estamos en la página 2
    userService.getAll.mockResolvedValue({
      data: mockUsers,
      meta: { current_page: 2, last_page: 3, total: 25 },
    });

    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects.find((s) =>
      Array.from(s.options).some((o) => o.text === "Todos los Roles"),
    );


    fireEvent.change(roleSelect, { target: { value: "superuser" } });

    await waitFor(() => {
      // Verificar que se llama con page: 1
      const calls = userService.getAll.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.page).toBe(1);
      expect(lastCall.role).toBe("superuser");
    });
  });
});
