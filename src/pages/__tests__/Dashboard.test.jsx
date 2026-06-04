import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { useAuth } from '../../context/AuthContext';

// Mock de useAuth
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

describe('Dashboard Component', () => {
    it('debe mostrar el nombre del usuario en la bienvenida', () => {
        useAuth.mockReturnValue({
            user: { nombre: 'Alex' }
        });

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText(/Panel de Invitado/i)).toBeInTheDocument();
        expect(screen.getByText(/Alex/i)).toBeInTheDocument();
    });

    it('debe mostrar las tarjetas de estadísticas básicas', () => {
        useAuth.mockReturnValue({
            user: { nombre: 'Alex', es_administrador: true }
        });

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Estudiantes')).toBeInTheDocument();
        expect(screen.getByText('Docentes')).toBeInTheDocument();
        expect(screen.getByText('Cursos Activos')).toBeInTheDocument();
    });
});
