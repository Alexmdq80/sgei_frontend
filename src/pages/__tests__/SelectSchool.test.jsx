import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SelectSchool from '../SelectSchool';
import { useAuth } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock de hooks y servicios
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('SelectSchool Component', () => {
    const mockLogout = vi.fn();
    const mockSelectProfile = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe redirigir a dashboard si el usuario es administrador', async () => {
        useAuth.mockReturnValue({
            user: { es_administrador: true },
            logout: mockLogout,
            selectProfile: mockSelectProfile
        });

        render(
            <BrowserRouter>
                <SelectSchool />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('debe redirigir automáticamente si solo hay un cargo verificado', async () => {
        const mockLink = { id: 1, verified_at: '2026-01-01', escuela: { nombre: 'Escuela 1' } };
        useAuth.mockReturnValue({
            user: { escuela_usuarios: [mockLink] },
            logout: mockLogout,
            selectProfile: mockSelectProfile
        });

        render(
            <BrowserRouter>
                <SelectSchool />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(mockSelectProfile).toHaveBeenCalledWith(mockLink);
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('debe permitir seleccionar entre múltiples cargos verificados', async () => {
        const mockLinks = [
            { id: 1, verified_at: '2026-01-01', escuela: { nombre: 'Escuela 1', cue_anexo: '101' }, role: { name: 'Director' } },
            { id: 2, verified_at: '2026-01-01', escuela: { nombre: 'Escuela 2', cue_anexo: '202' }, role: { name: 'Secretario' } }
        ];
        useAuth.mockReturnValue({
            user: { escuela_usuarios: mockLinks },
            logout: mockLogout,
            selectProfile: mockSelectProfile
        });

        render(
            <BrowserRouter>
                <SelectSchool />
            </BrowserRouter>
        );

        expect(screen.getByText('Escuela 1')).toBeInTheDocument();
        expect(screen.getByText('Escuela 2')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Escuela 1'));

        expect(mockSelectProfile).toHaveBeenCalledWith(mockLinks[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('debe mostrar mensaje si no hay cargos asignados', () => {
        useAuth.mockReturnValue({
            user: { escuela_usuarios: [] },
            logout: mockLogout,
            selectProfile: mockSelectProfile
        });

        render(
            <BrowserRouter>
                <SelectSchool />
            </BrowserRouter>
        );

        expect(screen.getByText(/Sin Cargos Asignados/i)).toBeInTheDocument();
        const logoutBtn = screen.getByRole('button', { name: /Cerrar Sesión/i });
        fireEvent.click(logoutBtn);
        expect(mockLogout).toHaveBeenCalled();
    });
});
