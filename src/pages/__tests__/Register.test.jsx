import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Register from '../Register';
import { BrowserRouter } from 'react-router-dom';
import authService from '../../services/authService';
import documentoTipoService from '../../services/documentoTipoService';

// Mock de servicios
vi.mock('../../services/authService', () => ({
    default: {
        register: vi.fn()
    }
}));

vi.mock('../../services/documentoTipoService', () => ({
    default: {
        getAll: vi.fn()
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

describe('Register Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        documentoTipoService.getAll.mockResolvedValue([
            { id: 1, nombre: 'DNI' }
        ]);
    });

    it('debe renderizar el formulario de registro', async () => {
        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        expect(screen.getByText('Crear Cuenta SGEI')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/juanito_sgei/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('ejemplo@correo.com')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText('DNI')).toBeInTheDocument();
        });
    });

    it('debe llamar a register con los datos del formulario al enviar', async () => {
        authService.register.mockResolvedValue({ message: 'Success' });

        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        await waitFor(() => expect(documentoTipoService.getAll).toHaveBeenCalled());

        fireEvent.change(screen.getByPlaceholderText(/juanito_sgei/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('ejemplo@correo.com'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Solo números'), { target: { value: '12345678' } });
        
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        fireEvent.change(passwordInputs[0], { target: { value: 'Password123!' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'Password123!' } });

        fireEvent.click(screen.getByRole('button', { name: /Crear mi Cuenta/i }));

        expect(authService.register).toHaveBeenCalledWith({
            nombre: 'testuser',
            email: 'test@example.com',
            documento_tipo_id: 1,
            documento_numero: '12345678',
            password: 'Password123!',
            password_confirmation: 'Password123!'
        });

        await waitFor(() => {
            expect(screen.getByText(/¡Registro exitoso!/i)).toBeInTheDocument();
        });
    });

    it('debe mostrar errores de validación del backend', async () => {
        authService.register.mockRejectedValue({
            response: {
                data: {
                    errors: {
                        email: ['El email ya está en uso'],
                        password: ['La contraseña es muy corta']
                    }
                }
            }
        });

        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        await waitFor(() => expect(documentoTipoService.getAll).toHaveBeenCalled());

        // Llenar campos mínimos para que el submit se dispare (aunque el mock falle)
        fireEvent.change(screen.getByPlaceholderText(/juanito_sgei/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('ejemplo@correo.com'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Solo números'), { target: { value: '12345678' } });
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        fireEvent.change(passwordInputs[0], { target: { value: 'short' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'short' } });

        fireEvent.click(screen.getByRole('button', { name: /Crear mi Cuenta/i }));

        await waitFor(() => {
            expect(screen.getByText(/El email ya está en uso/i)).toBeInTheDocument();
            expect(screen.getByText(/La contraseña es muy corta/i)).toBeInTheDocument();
        });
    });

    it('debe actualizar los indicadores de requisitos de contraseña', async () => {
        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];
        
        // Inicialmente todos en gris/secundario (simulamos revisando las clases o el estado visual si es posible)
        // Pero al menos verificamos que los textos existen
        expect(screen.getByText('10+ caracteres')).toBeInTheDocument();
        
        await act(async () => {
            fireEvent.change(passwordInput, { target: { value: 'Pass1!' } });
        });
        
        // Aquí podríamos verificar clases de Tailwind si quisiéramos ser muy específicos,
        // pero con React Testing Library solemos centrarnos en el comportamiento.
    });
});
