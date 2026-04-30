import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Profile from '../Profile';
import { useAuth } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import userService from '../../services/userService';

// Mock de hooks y servicios
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../services/userService', () => ({
    default: {
        updateProfile: vi.fn(),
        updateAvatar: vi.fn(),
        deleteAvatar: vi.fn(),
        updatePassword: vi.fn()
    }
}));

vi.mock('../../services/documentoTipoService', () => ({
    default: {
        getAll: vi.fn().mockResolvedValue([{ id: 1, nombre: 'DNI' }])
    }
}));

// Mock de URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

describe('Profile Component', () => {
    const mockCheckAuth = vi.fn();
    const mockShowNotification = vi.fn();
    const mockUser = {
        id: '1',
        nombre: 'Alex',
        email: 'alex@example.com',
        email_verified_at: '2026-04-02T10:00:00Z',
        avatar_url: null,
        escuela_usuarios: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({
            user: mockUser,
            checkAuth: mockCheckAuth,
            showNotification: mockShowNotification
        });
    });

    it('debe renderizar la información del perfil correctamente', async () => {
        await act(async () => {
            render(
                <BrowserRouter>
                    <Profile />
                </BrowserRouter>
            );
        });

        expect(screen.getByDisplayValue('Alex')).toBeInTheDocument();
        expect(screen.getByDisplayValue('alex@example.com')).toBeInTheDocument();
    });

    it('debe llamar a updateProfile al enviar el formulario de perfil', async () => {
        userService.updateProfile.mockResolvedValue({ message: 'Success' });

        await act(async () => {
            render(
                <BrowserRouter>
                    <Profile />
                </BrowserRouter>
            );
        });

        const nombreInput = screen.getByDisplayValue('Alex');
        await act(async () => {
            fireEvent.change(nombreInput, { target: { value: 'AlexUpdated', name: 'nombre' } });
        });

        const updateButton = screen.getByRole('button', { name: /Actualizar Perfil/i });
        await act(async () => {
            fireEvent.click(updateButton);
        });

        expect(userService.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
            nombre: 'AlexUpdated',
            email: 'alex@example.com'
        }));

        await waitFor(() => {
            expect(mockShowNotification).toHaveBeenCalledWith('Perfil actualizado con éxito.', 'success');
            expect(mockCheckAuth).toHaveBeenCalled();
        });
    });

    it('debe mostrar advertencia si el email no está verificado', async () => {
        useAuth.mockReturnValue({
            user: { ...mockUser, email_verified_at: null },
            checkAuth: mockCheckAuth,
            showNotification: mockShowNotification
        });

        await act(async () => {
            render(
                <BrowserRouter>
                    <Profile />
                </BrowserRouter>
            );
        });

        expect(screen.getByText(/Correo Electrónico No Verificado/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reenviar Verificación/i })).toBeInTheDocument();
    });

    it('debe deshabilitar campos de nombre y contraseña si el email no está verificado', async () => {
        useAuth.mockReturnValue({
            user: { ...mockUser, email_verified_at: null },
            checkAuth: mockCheckAuth,
            showNotification: mockShowNotification
        });

        const { container } = render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        // El campo nombre debe estar deshabilitado
        const nombreInput = screen.getByDisplayValue('Alex');
        expect(nombreInput).toBeDisabled();

        // El campo email debe estar habilitado para correcciones
        const emailInput = screen.getByDisplayValue('alex@example.com');
        expect(emailInput).not.toBeDisabled();

        // Los campos de contraseña deben estar deshabilitados
        const currentPassInput = container.querySelector('input[name="current_password"]');
        expect(currentPassInput).toBeDisabled();

        // El botón de actualizar debe estar presente
        expect(screen.getByRole('button', { name: /Actualizar Perfil/i })).toBeInTheDocument();
    });

    it('debe llamar a updatePassword al enviar el formulario de contraseña', async () => {
        userService.updatePassword.mockResolvedValue({ message: 'Success' });

        let container;
        await act(async () => {
            const result = render(
                <BrowserRouter>
                    <Profile />
                </BrowserRouter>
            );
            container = result.container;
        });

        const currentPassInput = container.querySelector('input[name="current_password"]');
        const newPassInput = container.querySelector('input[name="password"]');
        const confirmPassInput = container.querySelector('input[name="password_confirmation"]');
        const submitPassBtn = screen.getByRole('button', { name: /Cambiar Contraseña/i });

        await act(async () => {
            fireEvent.change(currentPassInput, { target: { value: 'password123', name: 'current_password' } });
            fireEvent.change(newPassInput, { target: { value: 'newpassword123', name: 'password' } });
            fireEvent.change(confirmPassInput, { target: { value: 'newpassword123', name: 'password_confirmation' } });
        });

        await act(async () => {
            fireEvent.click(submitPassBtn);
        });

        expect(userService.updatePassword).toHaveBeenCalledWith({
            current_password: 'password123',
            password: 'newpassword123',
            password_confirmation: 'newpassword123'
        });

        await waitFor(() => {
            expect(mockShowNotification).toHaveBeenCalledWith('Contraseña cambiada con éxito.', 'success');
        });
    });

    it('debe manejar la subida de avatar', async () => {
        userService.updateAvatar.mockResolvedValue({ 
            message: 'Foto de perfil actualizada.',
            user: { ...mockUser, avatar_url: 'new-avatar.jpg' }
        });

        const { container } = render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        const input = container.querySelector('input[type="file"]');

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        const submitBtn = screen.getByRole('button', { name: /Subir Nueva Foto/i });
        await act(async () => {
            fireEvent.click(submitBtn);
        });

        await waitFor(() => {
            expect(userService.updateAvatar).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(mockShowNotification).toHaveBeenCalledWith('Foto de perfil actualizada.', 'success');
            expect(mockCheckAuth).toHaveBeenCalled();
        });
    });
});
