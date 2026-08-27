import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useEffect } from "react";
import Profile from "../Profile";
import { useAuth } from "../../context/AuthContext";
import { BrowserRouter } from "react-router-dom";
import userService from "../../services/userService";

// 1. Mock de react-easy-crop que dispara onCropComplete con coordenadas válidas
vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete }) => {
    useEffect(() => {
      onCropComplete?.(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 512, height: 512 },
      );
    }, [onCropComplete]);
    return <div data-testid="mock-cropper" />;
  },
}));

// Mock de hooks y servicios
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/userService", () => ({
  default: {
    updateProfile: vi.fn(),
    updateAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

vi.mock("../../services/documentoTipoService", () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([{ id: 1, nombre: "DNI" }]),
  },
}));

// Mock de URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-url");

// Mocks para Canvas e Image requeridos por getCroppedImg en JSDOM
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
}));

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(["mock-blob"], { type: "image/jpeg" }));
});

global.Image = class {
  constructor() {
    setTimeout(() => {
      this.onload?.();
      this.dispatchEvent?.(new Event("load"));
    }, 0);
  }
  addEventListener(event, handler) {
    if (event === "load") {
      setTimeout(handler, 0);
    }
  }
  removeEventListener() {}
};

describe("Profile Component", () => {
  const mockCheckAuth = vi.fn();
  const mockShowNotification = vi.fn();
  const mockUser = {
    id: "1",
    nombre: "Alex",
    email: "alex@example.com",
    email_verified_at: "2026-04-02T10:00:00Z",
    avatar_url: null,
    escuela_usuarios: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: mockUser,
      checkAuth: mockCheckAuth,
      showNotification: mockShowNotification,
    });
  });

  it("debe renderizar la información del perfil correctamente", async () => {
    let container;
    await act(async () => {
      const result = render(
        <BrowserRouter>
          <Profile />
        </BrowserRouter>,
      );
      container = result.container;
    });

    const nombreInput = container.querySelector('input[name="nombre"]');
    const emailInput = container.querySelector('input[name="email"]');

    expect(nombreInput).toHaveValue("Alex");
    expect(emailInput).toHaveValue("alex@example.com");
  });

  it("debe llamar a updateProfile al enviar el formulario de perfil", async () => {
    userService.updateProfile.mockResolvedValue({ message: "Success" });

    let container;
    await act(async () => {
      const result = render(
        <BrowserRouter>
          <Profile />
        </BrowserRouter>,
      );
      container = result.container;
    });

    const nombreInput = container.querySelector('input[name="nombre"]');
    await act(async () => {
      fireEvent.change(nombreInput, {
        target: { value: "AlexUpdated", name: "nombre" },
      });
    });

    const updateButton = screen.getByRole("button", {
      name: /Actualizar Perfil/i,
    });
    await act(async () => {
      fireEvent.click(updateButton);
    });

    expect(userService.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "AlexUpdated",
        email: "alex@example.com",
      }),
    );

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Perfil actualizado con éxito.",
        "success",
      );
      expect(mockCheckAuth).toHaveBeenCalled();
    });
  });

  it("debe mostrar advertencia si el email no está verificado", async () => {
    useAuth.mockReturnValue({
      user: { ...mockUser, email_verified_at: null },
      checkAuth: mockCheckAuth,
      showNotification: mockShowNotification,
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Profile />
        </BrowserRouter>,
      );
    });

    expect(
      screen.getByText(/Correo Electrónico No Verificado/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reenviar Verificación/i }),
    ).toBeInTheDocument();
  });

  it("debe deshabilitar campos de nombre y contraseña si el email no está verificado", async () => {
    useAuth.mockReturnValue({
      user: { ...mockUser, email_verified_at: null },
      checkAuth: mockCheckAuth,
      showNotification: mockShowNotification,
    });

    let container;
    await act(async () => {
      const result = render(
        <BrowserRouter>
          <Profile />
        </BrowserRouter>,
      );
      container = result.container;
    });

    const nombreInput = container.querySelector('input[name="nombre"]');
    expect(nombreInput).toBeDisabled();

    const emailInput = container.querySelector('input[name="email"]');
    expect(emailInput).not.toBeDisabled();

    const currentPassInput = container.querySelector(
      'input[name="current_password"]',
    );
    expect(currentPassInput).toBeDisabled();

    expect(
      screen.getByRole("button", { name: /Actualizar Perfil/i }),
    ).toBeInTheDocument();
  });

  it("debe llamar a updatePassword al enviar el formulario de contraseña", async () => {
    userService.updatePassword.mockResolvedValue({ message: "Success" });

    let container;
    await act(async () => {
      const result = render(
        <BrowserRouter>
          <Profile />
        </BrowserRouter>,
      );
      container = result.container;
    });

    const currentPassInput = container.querySelector(
      'input[name="current_password"]',
    );
    const newPassInput = container.querySelector('input[name="password"]');
    const confirmPassInput = container.querySelector(
      'input[name="password_confirmation"]',
    );
    const submitPassBtn = screen.getByRole("button", {
      name: /Cambiar Contraseña/i,
    });

    await act(async () => {
      fireEvent.change(currentPassInput, {
        target: { value: "password123", name: "current_password" },
      });
      fireEvent.change(newPassInput, {
        target: { value: "newpassword123", name: "password" },
      });
      fireEvent.change(confirmPassInput, {
        target: { value: "newpassword123", name: "password_confirmation" },
      });
    });

    await act(async () => {
      fireEvent.click(submitPassBtn);
    });

    expect(userService.updatePassword).toHaveBeenCalledWith({
      current_password: "password123",
      password: "newpassword123",
      password_confirmation: "newpassword123",
    });

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Contraseña cambiada con éxito.",
        "success",
      );
    });
  });

  it("debe manejar la subida de avatar", async () => {
    userService.updateAvatar.mockResolvedValue({
      message: "Foto de perfil actualizada con éxito.",
      user: { ...mockUser, avatar_url: "new-avatar.jpg" },
    });

    let container;
    await act(async () => {
      const result = render(
        <BrowserRouter>
          <Profile />
        </BrowserRouter>,
      );
      container = result.container;
    });

    const file = new File(["hello"], "hello.png", { type: "image/png" });
    const input = container.querySelector('input[type="file"]');

    // 1. Cargar archivo
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // 2. Confirmar recorte en el modal
    const cropBtn = await screen.findByRole("button", {
      name: /Recortar Foto/i,
    });
    await act(async () => {
      fireEvent.click(cropBtn);
    });

    // 3. Guardar foto
    const submitBtn = await screen.findByRole("button", {
      name: /Aplicar y Guardar Foto/i,
    });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // 4. Verificaciones
    await waitFor(() => {
      expect(userService.updateAvatar).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Foto de perfil actualizada con éxito.",
        "success",
      );
      expect(mockCheckAuth).toHaveBeenCalled();
    });
  });
});