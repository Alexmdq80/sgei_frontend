import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerifyEmailPage from '../VerifyEmailPage';
import { BrowserRouter, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

// Mock de servicios y hooks
vi.mock('../../services/authService', () => ({
    default: {
        verifyEmail: vi.fn()
    }
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useLocation: vi.fn(),
    };
});

describe('VerifyEmailPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe mostrar error si faltan parámetros en la URL', () => {
        useLocation.mockReturnValue({ search: '' });

        render(
            <BrowserRouter>
                <VerifyEmailPage />
            </BrowserRouter>
        );

        expect(screen.getByText(/Faltan parámetros de verificación/i)).toBeInTheDocument();
    });

    it('debe llamar a verifyEmail y mostrar éxito si el token es válido', async () => {
        useLocation.mockReturnValue({ search: '?token=abc&email=test@example.com' });
        authService.verifyEmail.mockResolvedValue({ message: 'Success' });

        render(
            <BrowserRouter>
                <VerifyEmailPage />
            </BrowserRouter>
        );

        expect(screen.getByText(/Verificando tu cuenta/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(authService.verifyEmail).toHaveBeenCalledWith('test@example.com', 'abc');
            expect(screen.getByText(/¡Tu correo electrónico ha sido verificado con éxito!/i)).toBeInTheDocument();
        });
    });

    it('debe mostrar mensaje de error si la verificación falla', async () => {
        useLocation.mockReturnValue({ search: '?token=wrong&email=test@example.com' });
        authService.verifyEmail.mockRejectedValue({
            response: {
                data: { message: 'Token inválido' }
            }
        });

        render(
            <BrowserRouter>
                <VerifyEmailPage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Token inválido')).toBeInTheDocument();
            expect(screen.getByText('Error de Verificación')).toBeInTheDocument();
        });
    });
});
