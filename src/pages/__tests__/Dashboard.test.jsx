import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

        render(<Dashboard />);

        expect(screen.getByText(/Bienvenido, Alex/i)).toBeInTheDocument();
        expect(screen.getByText(/resumen general/i)).toBeInTheDocument();
    });

    it('debe mostrar las tarjetas de estadísticas básicas', () => {
        useAuth.mockReturnValue({
            user: { nombre: 'Alex' }
        });

        render(<Dashboard />);

        expect(screen.getByText('Estudiantes')).toBeInTheDocument();
        expect(screen.getByText('Docentes')).toBeInTheDocument();
        expect(screen.getByText('Cursos Activos')).toBeInTheDocument();
    });
});
