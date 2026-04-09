import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsignaturasManager from '../AsignaturasManager';
import planService from '../../../services/planService';
import asignaturaService from '../../../services/asignaturaService';

// Mocks de Servicios
vi.mock('../../../services/planService', () => ({
  default: {
    getPlanById: vi.fn(),
  }
}));

vi.mock('../../../services/asignaturaService', () => ({
  default: {
    getByAnioPlan: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}));

// Mock de AuthContext
vi.mock('../../../context/AuthContext', async () => {
  return {
    useAuth: () => ({
      showNotification: vi.fn(),
    })
  };
});

describe('AsignaturasManager Component', () => {
  const mockPlan = {
    id: 1,
    nombre: 'Plan Test',
    anio_planes: [
      { id: 10, anio: { nombre: '1° Año' } },
      { id: 11, anio: { nombre: '2° Año' } }
    ]
  };

  const mockAsignaturas = [
    { id: 100, nombre: 'Matemática', horas_semanales: 4, orden: 1 },
    { id: 101, nombre: 'Lengua', horas_semanales: 4, orden: 2 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    planService.getPlanById.mockResolvedValue(mockPlan);
    asignaturaService.getByAnioPlan.mockResolvedValue(mockAsignaturas);
  });

  it('debe cargar el plan y mostrar el año seleccionado', async () => {
    await act(async () => {
      render(<AsignaturasManager planId={1} onClose={vi.fn()} />);
    });

    expect(screen.getByText('Plan Test')).toBeInTheDocument();
    
    // Verificamos que "1° Año" aparezca (usamos getAll ya que aparece en aside y header)
    const elements = screen.getAllByText('1° Año');
    expect(elements.length).toBeGreaterThan(0);
    
    await waitFor(() => {
      expect(screen.getByText('Matemática')).toBeInTheDocument();
    });
  });

  it('debe cambiar de año al hacer click en la lista lateral', async () => {
    await act(async () => {
      render(<AsignaturasManager planId={1} onClose={vi.fn()} />);
    });

    const btnSegundoAnio = screen.getByText('2° Año');
    await act(async () => {
      fireEvent.click(btnSegundoAnio);
    });

    expect(asignaturaService.getByAnioPlan).toHaveBeenCalledWith(11);
  });

  it('debe permitir abrir el formulario para agregar una nueva asignatura', async () => {
    await act(async () => {
      render(<AsignaturasManager planId={1} onClose={vi.fn()} />);
    });

    const btnAgregar = screen.getByText('Agregar');
    await act(async () => {
      fireEvent.click(btnAgregar);
    });

    expect(screen.getByText('Nueva Asignatura')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });

  it('debe llamar a asignaturaService.create al guardar una nueva materia', async () => {
    await act(async () => {
      render(<AsignaturasManager planId={1} onClose={vi.fn()} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Agregar'));
    });

    const inputNombre = screen.getByLabelText('Nombre');
    const inputHoras = screen.getByLabelText('Horas Semanales');

    await act(async () => {
      fireEvent.change(inputNombre, { target: { value: 'Historia' } });
      fireEvent.change(inputHoras, { target: { value: '3' } });
    });

    const btnGuardar = screen.getByText('Guardar');
    await act(async () => {
      fireEvent.click(btnGuardar);
    });

    expect(asignaturaService.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Historia',
      horas_semanales: 3,
      anio_plan_id: 10
    }));
  });
});
