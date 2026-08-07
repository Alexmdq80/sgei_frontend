import { describe, it, expect, vi, beforeEach } from "vitest";
import userService from "../userService";
import api from "../api";

vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("confirmPersona", () => {
    it("envía force=false por defecto", async () => {
      api.post.mockResolvedValue({ data: { message: "ok" } });

      await userService.confirmPersona(1);

      expect(api.post).toHaveBeenCalledWith(
        "/admin/usuarios/1/confirm-persona",
        { force: false },
      );
    });

    it("envía force=true cuando se pasa explícitamente", async () => {
      api.post.mockResolvedValue({ data: { message: "ok" } });

      await userService.confirmPersona(1, true);

      expect(api.post).toHaveBeenCalledWith(
        "/admin/usuarios/1/confirm-persona",
        { force: true },
      );
    });

    it("retorna la respuesta del API", async () => {
      const mockResponse = { data: { message: "Vinculación confirmada" } };
      api.post.mockResolvedValue(mockResponse);

      const result = await userService.confirmPersona(1, true);

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("getCandidatosPersona", () => {
    it("llama al endpoint correcto", async () => {
      api.get.mockResolvedValue({ data: { data: [] } });

      await userService.getCandidatosPersona(5);

      expect(api.get).toHaveBeenCalledWith(
        "/admin/usuarios/5/candidatos-persona",
      );
    });
  });

  describe("vincularPersona", () => {
    it("llama al endpoint correcto", async () => {
      api.post.mockResolvedValue({ data: { message: "ok" } });

      await userService.vincularPersona(1, 2);

      expect(api.post).toHaveBeenCalledWith(
        "/admin/usuarios/1/vincular-persona/2",
      );
    });
  });

  describe("desvincularPersona", () => {
    it("llama al endpoint correcto", async () => {
      api.post.mockResolvedValue({ data: { message: "ok" } });

      await userService.desvincularPersona(1);

      expect(api.post).toHaveBeenCalledWith(
        "/admin/usuarios/1/desvincular-persona",
      );
    });
  });
});