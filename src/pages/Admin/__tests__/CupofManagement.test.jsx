import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CupofManagement from '../CupofManagement';
import cupofService from '../../../services/cupofService';
import cargoService from '../../../services/cargoService';
import escuelaService from '../../../services/escuelaService';
import personaService from '../../../services/personaService';
import escalafonService from '../../../services/escalafonService';
import puestoTipoService from '../../../services/puestoTipoService';

// Mocks de Servicios
vi.mock('../../../services/cupofService', () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
  }
}));

vi.mock('../../../services/cargoService', () => ({
  default: {
    getAll: vi.fn(),
  }
}));

vi.mock('../../../services/escuelaService', () => ({
  default: {
    search: vi.fn(),
  }
}));

vi.mock('../../../services/personaService', () => ({
  default: {
    getAll: vi.fn(),
  }
}));

vi.mock('../../../services/escalafonService', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../../../services/puestoTipoService', () => ({
  default: {
    getAll: vi.fn().mockResolvedValue([]),
  }
}));

// Mock de AuthContext
vi.mock('../../../context/AuthContext', async () => {
  return {
    useAuth: () => ({
      user: { nombre: 'Admin Test', es_administrador: true, roles: [{ name: 'superuser' }] },
      showNotification: vi.fn(),
    })
  };
});

// Mock de ConfirmationModal
vi.mock('../../../components/ConfirmationModal', () => ({
  default: ({ isOpen, title }) => isOpen ? (
    <div data-testid="confirmation-modal">
      <h1>{title}</h1>
    </div>
  ) : null
}));

describe('CupofManagement Component', () => {
  const mockCargos = [
    { id: 1, nombre: 'PRECEPTOR/A', requiere_cursos: true },
    { id: 2, nombre: 'DIRECTOR/A', requiere_cursos: false },
  ];

  const mockEscuelas = [
    { id: 1, nombre: 'Escuela 1', cue_anexo: '061495100' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    cupofService.getAll.mockResolvedValue([]);
    cargoService.getAll.mockResolvedValue(mockCargos);
    escuelaService.search.mockResolvedValue(mockEscuelas);
    personaService.getAll.mockResolvedValue({ data: [] });
    escalafonService.getAll.mockResolvedValue([{ id: 1, nombre: 'DOCENTE' }]);
    puestoTipoService.getAll.mockResolvedValue([{ id: 1, nombre: 'CARGO' }]);
  });

  it('debe cargar los cargos dinámicamente al montar el componente', async () => {
    await act(async () => {
      render(<CupofManagement />);
    });
    
    expect(cargoService.getAll).toHaveBeenCalled();
  });

  it('debe mostrar los cargos en el select del modal de creación de CUPOF', async () => {
    await act(async () => {
      render(<CupofManagement />);
    });
    
    // Abrir modal de creación
    const btnNuevo = screen.getByText(/Nuevo Puesto/i);
    await act(async () => {
      fireEvent.click(btnNuevo);
    });

    // Seleccionar Escalafón para que aparezca el campo de Cargo
    const selectEscalafon = screen.getByLabelText(/Escalafón/i);
    fireEvent.change(selectEscalafon, { target: { value: '1' } });
    
    // Verificar que el select de cargos tiene las opciones de la API
    const selectCargo = screen.getByLabelText(/Nombre del Cargo/i);
    expect(selectCargo).toBeInTheDocument();
    
    expect(screen.getByText('PRECEPTOR/A')).toBeInTheDocument();
    expect(screen.getByText('DIRECTOR/A')).toBeInTheDocument();
  });
});
