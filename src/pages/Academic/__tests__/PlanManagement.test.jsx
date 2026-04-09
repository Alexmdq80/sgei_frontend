import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlanManagement from '../PlanManagement';
import planService from '../../../services/planService';

// Mock de planService
vi.mock('../../../services/planService', () => ({
  default: {
    getAllPlans: vi.fn(),
    getPlanCiclos: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
  }
}));

// Mock de AuthContext
vi.mock('../../../context/AuthContext', async () => {
  return {
    useAuth: () => ({
      user: { nombre: 'Admin Test' },
      showNotification: vi.fn(),
      hasPermission: () => true
    })
  };
});

// Mock de ConfirmationModal
vi.mock('../../../components/ConfirmationModal', () => ({
  default: ({ isOpen, title, onConfirm, onClose }) => isOpen ? (
    <div data-testid="confirmation-modal">
      <h1>{title}</h1>
      <button onClick={onConfirm}>Confirmar</button>
      <button onClick={onClose}>Cancelar</button>
    </div>
  ) : null
}));

describe('PlanManagement Component', () => {
  const mockPlans = [
    { id: 1, nombre: 'Plan A', nombre_completo: 'Plan A Completo', duracion_anios: 3, resolucion: 'R1', plan_ciclo: { nombre: 'Ciclo 1' } },
  ];

  const mockCiclos = [
    { id: 1, nombre: 'Ciclo 1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    planService.getAllPlans.mockResolvedValue(mockPlans);
    planService.getPlanCiclos.mockResolvedValue(mockCiclos);
  });

  it('debe renderizar el título y el listado de planes', async () => {
    await act(async () => {
      render(<PlanManagement />);
    });
    
    expect(screen.getByText('Gestión de Planes de Estudio')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Plan A')).toBeInTheDocument();
    });
  });

  it('debe abrir el modal al hacer click en "Nuevo Plan"', async () => {
    await act(async () => {
      render(<PlanManagement />);
    });
    
    const btnNuevo = screen.getByText('Nuevo Plan');
    await act(async () => {
      fireEvent.click(btnNuevo);
    });
    
    expect(screen.getByText('Nuevo Plan de Estudio')).toBeInTheDocument();
  });

  it('debe filtrar los planes según la búsqueda', async () => {
    planService.getAllPlans.mockResolvedValue([
      ...mockPlans,
      { id: 2, nombre: 'Plan B', nombre_completo: 'Plan B Completo', duracion_anios: 2, plan_ciclo: { nombre: 'Ciclo 1' } }
    ]);

    await act(async () => {
      render(<PlanManagement />);
    });
    
    await waitFor(() => expect(screen.getByText('Plan B')).toBeInTheDocument());

    const inputBusqueda = screen.getByPlaceholderText(/Buscar por nombre o resolución/i);
    await act(async () => {
      fireEvent.change(inputBusqueda, { target: { value: 'Plan A' } });
    });

    expect(screen.getByText('Plan A')).toBeInTheDocument();
    expect(screen.queryByText('Plan B')).not.toBeInTheDocument();
  });

  it('debe llamar a createPlan al enviar el formulario de nuevo plan', async () => {
    planService.createPlan.mockResolvedValue({ id: 3, nombre: 'Nuevo' });
    
    await act(async () => {
      render(<PlanManagement />);
    });
    
    const btnNuevo = screen.getByText('Nuevo Plan');
    await act(async () => {
      fireEvent.click(btnNuevo);
    });
    
    // Esperar a que el modal sea visible
    await waitFor(() => expect(screen.getByText('Nuevo Plan de Estudio')).toBeInTheDocument());
    
    const inputNombre = screen.getByLabelText('Nombre Corto');
    const inputNombreCompleto = screen.getByLabelText('Nombre Completo');
    const selectCiclo = screen.getByLabelText('Ciclo');
    
    await act(async () => {
      fireEvent.change(inputNombre, { target: { value: 'Nuevo Plan Test' } });
      fireEvent.change(inputNombreCompleto, { target: { value: 'Nombre Completo Test' } });
      fireEvent.change(selectCiclo, { target: { value: '1' } });
    });
    
    const btnGuardar = screen.getByText('Guardar');
    await act(async () => {
      fireEvent.click(btnGuardar);
    });
    
    await waitFor(() => {
      expect(planService.createPlan).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Nuevo Plan Test'
      }));
    });
  });
});
