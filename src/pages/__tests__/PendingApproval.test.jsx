import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PendingApproval from '../PendingApproval';
import { useAuth } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import escuelaService from '../../services/escuelaService';

// Mock de hooks y servicios
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../services/escuelaService', () => ({
    default: {
        cancelJoin: vi.fn()
    }
}));

// Mock de useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('PendingApproval Component', () => {
    const mockCheckAuth = vi.fn();
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe mostrar el mensaje de no hay solicitudes si el usuario no tiene ninguna', () => {
        useAuth.mockReturnValue({
            user: { nombre: 'Alex', escuela_usuarios: [] },
            logout: mockLogout,
            checkAuth: mockCheckAuth
        });

        render(
            <BrowserRouter>
                <PendingApproval />
            </BrowserRouter>
        );

        expect(screen.getByText(/Hola/i)).toBeInTheDocument();
        expect(screen.getByText(/Alex/i)).toBeInTheDocument();
        expect(screen.getByText(/No tienes solicitudes pendientes/i)).toBeInTheDocument();
    });

    it('debe mostrar la lista de escuelas pendientes correctamente', () => {
        const mockUser = {
            nombre: 'Alex',
            escuela_usuarios: [
                {
                    id: '1',
                    escuela_id: 101,
                    verified_at: null,
                    created_at: '2026-04-02T10:00:00Z',
                    escuela: { nombre: 'Escuela Técnica N°1' },
                    rol_escolar: { nombre: 'Docente' }
                }
            ]
        };

        useAuth.mockReturnValue({
            user: mockUser,
            logout: mockLogout,
            checkAuth: mockCheckAuth
        });

        render(
            <BrowserRouter>
                <PendingApproval />
            </BrowserRouter>
        );

        expect(screen.getByText('Escuela Técnica N°1')).toBeInTheDocument();
        expect(screen.getByText(/Rol: Docente/i)).toBeInTheDocument();
    });

    it('debe llamar a cancelJoin y checkAuth al hacer clic en cancelar', async () => {
        const mockUser = {
            nombre: 'Alex',
            escuela_usuarios: [
                {
                    id: '1',
                    escuela_id: 101,
                    verified_at: null,
                    created_at: '2026-04-02T10:00:00Z',
                    escuela: { nombre: 'Escuela Técnica N°1' },
                    rol_escolar: { nombre: 'Docente' }
                }
            ]
        };

        useAuth.mockReturnValue({
            user: mockUser,
            logout: mockLogout,
            checkAuth: mockCheckAuth
        });

        // Mock del window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <BrowserRouter>
                <PendingApproval />
            </BrowserRouter>
        );

        const cancelButton = screen.getByTitle('Cancelar esta solicitud');
        fireEvent.click(cancelButton);

        expect(escuelaService.cancelJoin).toHaveBeenCalledWith(101);
        await waitFor(() => {
            expect(mockCheckAuth).toHaveBeenCalled();
        });
    });
});
