import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Layout from "../Layout";
import { useAuth } from "../../context/AuthContext";
import { BrowserRouter, MemoryRouter } from "react-router-dom";

// Mock de useAuth
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Layout Component", () => {
  const mockLogout = vi.fn();
  const mockClearNotification = vi.fn();
  const mockUser = {
    nombre: "Alex",
    email: "alex@example.com",
    avatar_url: null,
  };
  const renderLayoutAt = (path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Layout>Hijo</Layout>
      </MemoryRouter>,
    );

  const mockSuperUser = () => {
    useAuth.mockReturnValue({
      user: { ...mockUser, es_administrador: true },
      logout: mockLogout,
      notification: null,
      clearNotification: mockClearNotification,
      hasPermission: vi.fn().mockReturnValue(false),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      notification: null,
      clearNotification: mockClearNotification,
      hasPermission: vi.fn().mockReturnValue(false),
    });
  });

  it("debe renderizar el nombre del usuario y el contenido hijo", () => {
    render(
      <BrowserRouter>
        <Layout>
          <div data-testid="child">Contenido Hijo</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("debe permitir colapsar y expandir el sidebar", () => {
    render(
      <BrowserRouter>
        <Layout>Hijo</Layout>
      </BrowserRouter>,
    );

    const toggleButton = screen.getAllByRole("button")[0]; // El primer botón suele ser el toggle del sidebar

    // Buscamos el Dashboard dentro de la navegación (el span del sidebar)
    const dashboardLinks = screen.getAllByText("Dashboard");
    const sidebarLink = dashboardLinks.find((el) => el.tagName === "SPAN");
    expect(sidebarLink).toBeInTheDocument();

    fireEvent.click(toggleButton);

    // Al colapsar, el span con "Dashboard" ya no debería estar (según {isSidebarOpen && ...})
    expect(
      screen.queryByText(
        (content, element) =>
          element.tagName === "SPAN" && content === "Dashboard",
      ),
    ).not.toBeInTheDocument();
  });

  it("debe mostrar el menú de usuario al hacer clic en el perfil", () => {
    render(
      <BrowserRouter>
        <Layout>Hijo</Layout>
      </BrowserRouter>,
    );

    // Buscar el botón que contiene el nombre del usuario
    const userButton = screen.getByText("Alex").closest("button");
    fireEvent.click(userButton);

    expect(screen.getByText("Mi Perfil")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cerrar Sesión/i }),
    ).toBeInTheDocument();
  });

  it("debe llamar a logout al hacer clic en cerrar sesión", async () => {
    render(
      <BrowserRouter>
        <Layout>Hijo</Layout>
      </BrowserRouter>,
    );

    const userButton = screen.getByText("Alex").closest("button");
    fireEvent.click(userButton);

    const logoutButton = screen.getByRole("button", { name: /Cerrar Sesión/i });
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("debe limpiar la caché local desde el menú de usuario", () => {
    const mockClearCatalogCache = vi.fn();
    const mockShowNotification = vi.fn();
    useAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      notification: null,
      clearNotification: mockClearNotification,
      hasPermission: vi.fn().mockReturnValue(false),
      clearCatalogCache: mockClearCatalogCache,
      showNotification: mockShowNotification,
    });

    render(
      <BrowserRouter>
        <Layout>Hijo</Layout>
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByText("Alex").closest("button"));
    fireEvent.click(
      screen.getByRole("button", { name: /Limpiar caché local/i }),
    );

    expect(mockClearCatalogCache).toHaveBeenCalledTimes(1);
    expect(mockShowNotification).toHaveBeenCalledWith(
      "Caché local de catálogos limpiado con éxito.",
      "success",
    );
    // El menú desplegable debe cerrarse
    expect(screen.queryByText("Mi Perfil")).not.toBeInTheDocument();
  });

  it("debe mostrar notificaciones si existen", () => {
    useAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      notification: { type: "success", message: "Operación exitosa" },
      clearNotification: mockClearNotification,
      hasPermission: vi.fn().mockReturnValue(false),
    });

    render(
      <BrowserRouter>
        <Layout>Hijo</Layout>
      </BrowserRouter>,
    );

    expect(screen.getByText("Éxito")).toBeInTheDocument();
    expect(screen.getByText("Operación exitosa")).toBeInTheDocument();

    // Buscar el botón de cerrar de la notificación (es el primero en el DOM dentro de la notificación)
    const closeBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.innerHTML.includes("svg"));
    fireEvent.click(closeBtn);
    expect(mockClearNotification).toHaveBeenCalled();
  });

  it("abre automáticamente los grupos del menú correspondientes a la ruta (deep link)", () => {
    mockSuperUser();
    renderLayoutAt("/admin/general/naciones");

    // Panel General > Geografía abiertos por la ruta
    expect(screen.getByText("Naciones")).toBeInTheDocument();
    // Un grupo ajeno permanece cerrado
    expect(screen.queryByText("Dependencias")).not.toBeInTheDocument();
  });

  it("permite abrir y cerrar manualmente los grupos del menú", () => {
    mockSuperUser();
    renderLayoutAt("/admin/general/naciones");

    // "Instituciones" arranca cerrado: abrimos
    fireEvent.click(screen.getByText("Instituciones"));
    expect(screen.getByText("Dependencias")).toBeInTheDocument();

    // "Geografía" arranca abierta por la ruta: cerramos
    fireEvent.click(screen.getByText("Geografía"));
    expect(screen.queryByText("Naciones")).not.toBeInTheDocument();
  });

  it("mantiene abierto un grupo abierto manualmente al navegar a otra ruta", () => {
    mockSuperUser();
    renderLayoutAt("/admin/general/naciones");

    fireEvent.click(screen.getByText("Operativos")); // abrimos manualmente
    expect(screen.getByText("Cargos")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Provincias")); // navegamos dentro de Geografía
    expect(screen.getByText("Cargos")).toBeInTheDocument(); // sigue abierto (acumulación)
    expect(screen.getByText("Naciones")).toBeInTheDocument();
  });
});
