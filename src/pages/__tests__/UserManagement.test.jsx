import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManagement from '../Admin/UserManagement';
import escuelaService from '../../services/escuelaService';
import userService from '../../services/userService';
import roleService from '../../services/roleService';
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
        rejectRequest: vi.fn(),
        updateLink: vi.fn()
    }
}));

vi.mock('../../services/userService', () => ({
    default: {
        getAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        toggleSupervisorRole: vi.fn()
    }
}));

vi.mock('../../services/roleService', () => ({
    default: {
        getAll: vi.fn().mockResolvedValue([
            { id: 5, name: 'Docente' },
            { id: 10, name: 'Directivo' },
            { id: 15, name: 'supervisor_curricular' }
        ])
    }
}));

vi.mock('../../services/documentoTipoService', () => ({
    default: {
        getAll: vi.fn().mockResolvedValue([{ id: 1, nombre: 'DNI' }])
    }
}));

describe('UserManagement Component', () => {
    const mockUsers = [
        { id: '1', nombre: 'Juan Perez', email: 'juan@example.com', documento_numero: '123', es_administrador: false, roles: [] },
        { id: '2', nombre: 'Admin User', email: 'admin@example.com', documento_numero: '456', es_administrador: true, roles: [] }
    ];

    const mockRequests = [
        {
            id: 'req-1',
            usuario: { nombre: 'Maria Solicitante', email: 'maria@example.com' },
            escuela: { nombre: 'Escuela 1', cue_anexo: '123' },
            role: { id: 5, name: 'Docente' }
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

    it('debe abrir el modal de edición de usuario', async () => {
        render(<UserManagement />);

        await waitFor(() => screen.getByText('Juan Perez'));
        
        const editBtns = screen.getAllByTitle('Editar');
        fireEvent.click(editBtns[0]);

        expect(screen.getByText('Información del Usuario', { selector: 'h2' })).toBeInTheDocument();
        // El nombre aparece en la tabla y en el modal, usamos getAll
        expect(screen.getAllByText('Juan Perez').length).toBeGreaterThan(1);
        expect(screen.getAllByText('juan@example.com').length).toBeGreaterThan(0);
    });

    it('debe permitir cambiar el rol de supervisor curricular', async () => {
        userService.toggleSupervisorRole.mockResolvedValue({ message: 'Rol actualizado' });

        render(<UserManagement />);

        await waitFor(() => screen.getByText('Juan Perez'));
        
        const supervisorBtn = screen.getAllByTitle(/Hacer Supervisor Curricular/i)[0];
        fireEvent.click(supervisorBtn);

        await waitFor(() => {
            expect(userService.toggleSupervisorRole).toHaveBeenCalledWith('1');
            expect(mockShowNotification).toHaveBeenCalledWith('Rol actualizado', 'success');
        });
    });

    it('debe llamar a userService.delete al confirmar la eliminación', async () => {
        userService.delete.mockResolvedValue({ message: 'Success' });

        render(<UserManagement />);

        await waitFor(() => screen.getByText('Juan Perez'));
        
        const deleteBtn = screen.getAllByTitle('Eliminar')[0];
        fireEvent.click(deleteBtn);

        // Interactuar con el modal de confirmación
        const confirmBtns = await screen.findAllByRole('button', { name: /^Eliminar$/i });
        // Seleccionamos el último botón con ese nombre, que suele ser el del modal (que se monta al final)
        // O mejor aún, buscamos el que NO tiene el title "Eliminar" (que son los de la tabla)
        const modalConfirmBtn = confirmBtns.find(btn => !btn.hasAttribute('title'));
        fireEvent.click(modalConfirmBtn);

        await waitFor(() => {
            expect(userService.delete).toHaveBeenCalledWith('1');
            expect(mockShowNotification).toHaveBeenCalledWith('Usuario eliminado con éxito.', 'success');
        });
    });

    it('debe aprobar una solicitud de unión', async () => {
        escuelaService.approveRequest.mockResolvedValue({ message: 'Success' });

        render(<UserManagement />);

        // Cambiar a solicitudes
        const requestsTab = await screen.findByRole('button', { name: /Solicitudes de Unión/i });
        fireEvent.click(requestsTab);

        await waitFor(() => screen.getByText('Maria Solicitante'));
        
        const approveBtn = screen.getAllByRole('button', { name: /Aprobar/i })[0];
        fireEvent.click(approveBtn);

        // Interactuar con el modal de confirmación
        const confirmBtn = await screen.findByRole('button', { name: /^Aprobar Acceso$/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(escuelaService.approveRequest).toHaveBeenCalledWith('req-1', expect.anything());
            expect(screen.queryByText('Maria Solicitante')).not.toBeInTheDocument();
        });
    });
});
