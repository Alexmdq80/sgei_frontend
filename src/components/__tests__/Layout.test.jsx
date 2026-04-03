import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Layout from '../Layout';
import { useAuth } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock de useAuth
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

describe('Layout Component', () => {
    const mockLogout = vi.fn();
    const mockClearNotification = vi.fn();
    const mockUser = {
        nombre: 'Alex',
        email: 'alex@example.com',
        avatar_url: null
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({
            user: mockUser,
            logout: mockLogout,
            notification: null,
            clearNotification: mockClearNotification,
            hasPermission: vi.fn().mockReturnValue(false)
        });
    });

    it('debe renderizar el nombre del usuario y el contenido hijo', () => {
        render(
            <BrowserRouter>
                <Layout>
                    <div data-testid="child">Contenido Hijo</div>
                </Layout>
            </BrowserRouter>
        );

        expect(screen.getByText('Alex')).toBeInTheDocument();
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('debe permitir colapsar y expandir el sidebar', () => {
        render(
            <BrowserRouter>
                <Layout>Hijo</Layout>
            </BrowserRouter>
        );

        const toggleButton = screen.getAllByRole('button')[0]; // El primer botón suele ser el toggle del sidebar
        
        // Buscamos el Dashboard dentro de la navegación (el span del sidebar)
        const dashboardLinks = screen.getAllByText('Dashboard');
        const sidebarLink = dashboardLinks.find(el => el.tagName === 'SPAN');
        expect(sidebarLink).toBeInTheDocument();

        fireEvent.click(toggleButton);
        
        // Al colapsar, el span con "Dashboard" ya no debería estar (según {isSidebarOpen && ...})
        expect(screen.queryByText((content, element) => element.tagName === 'SPAN' && content === 'Dashboard')).not.toBeInTheDocument();
    });

    it('debe mostrar el menú de usuario al hacer clic en el perfil', () => {
        render(
            <BrowserRouter>
                <Layout>Hijo</Layout>
            </BrowserRouter>
        );

        // Buscar el botón que contiene el nombre del usuario
        const userButton = screen.getByText('Alex').closest('button');
        fireEvent.click(userButton);

        expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cerrar Sesión/i })).toBeInTheDocument();
    });

    it('debe llamar a logout al hacer clic en cerrar sesión', async () => {
        render(
            <BrowserRouter>
                <Layout>Hijo</Layout>
            </BrowserRouter>
        );

        const userButton = screen.getByText('Alex').closest('button');
        fireEvent.click(userButton);

        const logoutButton = screen.getByRole('button', { name: /Cerrar Sesión/i });
        fireEvent.click(logoutButton);

        expect(mockLogout).toHaveBeenCalled();
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('debe mostrar notificaciones si existen', () => {
        useAuth.mockReturnValue({
            user: mockUser,
            logout: mockLogout,
            notification: { type: 'success', message: 'Operación exitosa' },
            clearNotification: mockClearNotification,
            hasPermission: vi.fn().mockReturnValue(false)
        });

        render(
            <BrowserRouter>
                <Layout>Hijo</Layout>
            </BrowserRouter>
        );

        expect(screen.getByText('Éxito')).toBeInTheDocument();
        expect(screen.getByText('Operación exitosa')).toBeInTheDocument();

        // Buscar el botón de cerrar de la notificación (es el primero en el DOM dentro de la notificación)
        const closeBtn = screen.getAllByRole('button').find(btn => btn.innerHTML.includes('svg')); 
        fireEvent.click(closeBtn);
        expect(mockClearNotification).toHaveBeenCalled();
    });
});
