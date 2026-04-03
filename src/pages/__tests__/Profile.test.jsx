import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    it('debe renderizar la información del perfil correctamente', () => {
        render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        expect(screen.getByDisplayValue('Alex')).toBeInTheDocument();
        expect(screen.getByDisplayValue('alex@example.com')).toBeInTheDocument();
    });

    it('debe llamar a updateProfile al enviar el formulario de perfil', async () => {
        userService.updateProfile.mockResolvedValue({ message: 'Success' });

        render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        const nombreInput = screen.getByDisplayValue('Alex');
        fireEvent.change(nombreInput, { target: { value: 'AlexUpdated', name: 'nombre' } });

        const updateButton = screen.getByRole('button', { name: /Actualizar/i });
        fireEvent.click(updateButton);

        expect(userService.updateProfile).toHaveBeenCalledWith({
            nombre: 'AlexUpdated',
            email: 'alex@example.com'
        });

        await waitFor(() => {
            expect(mockShowNotification).toHaveBeenCalledWith('Perfil actualizado con éxito.', 'success');
            expect(mockCheckAuth).toHaveBeenCalled();
        });
    });

    it('debe mostrar advertencia si el email no está verificado', () => {
        useAuth.mockReturnValue({
            user: { ...mockUser, email_verified_at: null },
            checkAuth: mockCheckAuth,
            showNotification: mockShowNotification
        });

        render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        expect(screen.getByText(/Correo Electrónico No Verificado/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reenviar Verificación/i })).toBeInTheDocument();
    });

    it('debe llamar a updatePassword al enviar el formulario de contraseña', async () => {
        userService.updatePassword.mockResolvedValue({ message: 'Success' });

        const { container } = render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        const currentPassInput = container.querySelector('input[name="current_password"]');
        const newPassInput = container.querySelector('input[name="password"]');
        const confirmPassInput = container.querySelector('input[name="password_confirmation"]');

        fireEvent.change(currentPassInput, { target: { value: 'oldpassword', name: 'current_password' } });
        fireEvent.change(newPassInput, { target: { value: 'NewPassword123!', name: 'password' } });
        fireEvent.change(confirmPassInput, { target: { value: 'NewPassword123!', name: 'password_confirmation' } });

        const changePassButton = screen.getByRole('button', { name: /Cambiar Contraseña/i });
        fireEvent.click(changePassButton);

        expect(userService.updatePassword).toHaveBeenCalledWith({
            current_password: 'oldpassword',
            password: 'NewPassword123!',
            password_confirmation: 'NewPassword123!'
        });

        await waitFor(() => {
            expect(mockShowNotification).toHaveBeenCalledWith('Contraseña cambiada con éxito.', 'success');
        });
    });

    it('debe manejar la subida de avatar', async () => {
        userService.updateAvatar.mockResolvedValue({ message: 'Success' });

        render(
            <BrowserRouter>
                <Profile />
            </BrowserRouter>
        );

        // Simulamos la selección de un archivo
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
        
        fireEvent.change(input, { target: { files: [file] } });

        const uploadButton = screen.getByRole('button', { name: /Subir Nueva Foto/i });
        fireEvent.click(uploadButton);

        expect(userService.updateAvatar).toHaveBeenCalled();
        await waitFor(() => {
            expect(mockShowNotification).toHaveBeenCalledWith('Foto de perfil actualizada.', 'success');
            expect(mockCheckAuth).toHaveBeenCalled();
        });
    });
});
