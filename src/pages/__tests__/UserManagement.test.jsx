import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManagement from '../Admin/UserManagement';
import escuelaService from '../../services/escuelaService';
import userService from '../../services/userService';
import documentoTipoService from '../../services/documentoTipoService';
import { useAuth } from '../../context/AuthContext';

// Mock de hooks y servicios
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../services/escuelaService', () => ({
    default: {
        getPendingRequests: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn()
    }
}));

vi.mock('../../services/userService', () => ({
    default: {
        getAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

vi.mock('../../services/documentoTipoService', () => ({
    default: {
        getAll: vi.fn().mockResolvedValue([{ id: 1, nombre: 'DNI' }])
    }
}));

describe('UserManagement Component', () => {
    const mockUsers = [
        { id: '1', nombre: 'Juan Perez', email: 'juan@example.com', documento_numero: '123', es_administrador: false },
        { id: '2', nombre: 'Admin User', email: 'admin@example.com', documento_numero: '456', es_administrador: true }
    ];

    const mockRequests = [
        {
            id: 'req-1',
            usuario: { nombre: 'Maria Solicitante', email: 'maria@example.com' },
            escuela: { nombre: 'Escuela 1', cue_anexo: '123' },
            rol_escolar: { nombre: 'Docente' }
        }
    ];

    const mockShowNotification = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        
        useAuth.mockReturnValue({
            user: { id: 'admin-id', es_administrador: true, nombre: 'Admin' },
            showNotification: mockShowNotification,
            hasPermission: vi.fn().mockReturnValue(true)
        });

        userService.getAll.mockResolvedValue({ 
            data: mockUsers, 
            meta: { current_page: 1, last_page: 1, total: 2 } 
        });
        
        escuelaService.getPendingRequests.mockResolvedValue({ 
            data: mockRequests 
        });
    });

    it('debe renderizar el listado de usuarios por defecto', async () => {
        render(<UserManagement />);

        await waitFor(() => {
            expect(screen.getByText('Juan Perez')).toBeInTheDocument();
            expect(screen.getByText('Admin User')).toBeInTheDocument();
            expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
        });
    });

    it('debe permitir cambiar a la pestaña de solicitudes', async () => {
        render(<UserManagement />);

        const requestsTab = await screen.findByRole('button', { name: /Solicitudes de Unión/i });
        fireEvent.click(requestsTab);

        await waitFor(() => {
            expect(screen.getByText('Maria Solicitante')).toBeInTheDocument();
            expect(screen.getByText('Escuela 1')).toBeInTheDocument();
        });
    });

    it('debe abrir el modal de creación de usuario', async () => {
        render(<UserManagement />);

        const createBtn = await screen.findByRole('button', { name: /Nuevo Usuario/i });
        fireEvent.click(createBtn);

        expect(screen.getByText('Nuevo Usuario', { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de Usuario/i)).toBeInTheDocument();
    });

    it('debe llamar a userService.create al enviar el formulario', async () => {
        userService.create.mockResolvedValue({ message: 'Success' });

        render(<UserManagement />);

        const createBtn = await screen.findByRole('button', { name: /Nuevo Usuario/i });
        fireEvent.click(createBtn);

        fireEvent.change(screen.getByLabelText(/Nombre de Usuario/i), { target: { value: 'New User' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
        fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Pass123!' } });

        const submitBtn = screen.getByRole('button', { name: /^Crear Usuario$/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(userService.create).toHaveBeenCalled();
            expect(mockShowNotification).toHaveBeenCalledWith('Usuario creado con éxito.', 'success');
        });
    });

    it('debe aprobar una solicitud de unión', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        escuelaService.approveRequest.mockResolvedValue({ message: 'Success' });

        render(<UserManagement />);

        // Cambiar a solicitudes
        const requestsTab = await screen.findByRole('button', { name: /Solicitudes de Unión/i });
        fireEvent.click(requestsTab);

        await waitFor(() => screen.getByText('Maria Solicitante'));
        
        const approveBtn = screen.getAllByRole('button', { name: /Aprobar/i })[0];
        fireEvent.click(approveBtn);

        await waitFor(() => {
            expect(escuelaService.approveRequest).toHaveBeenCalledWith('req-1');
            expect(screen.queryByText('Maria Solicitante')).not.toBeInTheDocument();
        });
    });
});
