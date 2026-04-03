import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '../Login';
import { useAuth } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import documentoTipoService from '../../services/documentoTipoService';
import authService from '../../services/authService';

// Mock de hooks y servicios
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../services/documentoTipoService', () => ({
    default: {
        getAll: vi.fn()
    }
}));

vi.mock('../../services/authService', () => ({
    default: {
        resendVerification: vi.fn()
    }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('Login Component', () => {
    const mockLogin = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({
            login: mockLogin
        });
        documentoTipoService.getAll.mockResolvedValue([
            { id: 1, nombre: 'DNI' },
            { id: 2, nombre: 'Pasaporte' }
        ]);
    });

    it('debe renderizar el formulario de login por defecto con email', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        expect(screen.getByText('SGEI')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('ejemplo@correo.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entrar al SGEI/i })).toBeInTheDocument();
    });

    it('debe cambiar al método de login por documento', async () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        const docButton = screen.getByRole('button', { name: /Documento/i });
        fireEvent.click(docButton);

        await waitFor(() => {
            expect(documentoTipoService.getAll).toHaveBeenCalled();
            expect(screen.getByText(/Tipo de Documento/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/DNI \(solo números\)/i)).toBeInTheDocument();
        });
    });

    it('debe llamar a login con credenciales de email al enviar el formulario', async () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('ejemplo@correo.com'), {
            target: { value: 'test@example.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Entrar al SGEI/i }));

        expect(mockLogin).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('debe mostrar error si el login falla', async () => {
        mockLogin.mockRejectedValue({
            response: {
                data: { error: 'Credenciales inválidas' }
            }
        });

        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('ejemplo@correo.com'), {
            target: { value: 'wrong@example.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'wrongpass' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Entrar al SGEI/i }));

        await waitFor(() => {
            expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
        });
    });

    it('debe permitir reenviar verificación si el email no está verificado', async () => {
        mockLogin.mockRejectedValue({
            response: {
                data: { 
                    errors: { email_unverified: true },
                    error: 'Tu cuenta no está verificada'
                }
            }
        });

        authService.resendVerification.mockResolvedValue({ message: 'Success' });

        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('ejemplo@correo.com'), {
            target: { value: 'unverified@example.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Entrar al SGEI/i }));

        const resendButton = await screen.findByText(/Reenviar enlace de verificación/i);
        fireEvent.click(resendButton);

        expect(authService.resendVerification).toHaveBeenCalledWith('unverified@example.com');
        
        await waitFor(() => {
            expect(screen.getByText(/Se ha enviado un nuevo enlace de verificación/i)).toBeInTheDocument();
        });
    });
});
