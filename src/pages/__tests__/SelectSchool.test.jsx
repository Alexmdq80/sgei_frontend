import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SelectSchool from '../SelectSchool';
import { useAuth } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import escuelaService from '../../services/escuelaService';
import geografiaService from '../../services/geografiaService';

// Mock de hooks y servicios
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../services/escuelaService', () => ({
    default: {
        getNiveles: vi.fn(),
        getSectores: vi.fn(),
        search: vi.fn(),
        requestJoin: vi.fn()
    }
}));

vi.mock('../../services/geografiaService', () => ({
    default: {
        getProvincias: vi.fn(),
        getDepartamentos: vi.fn(),
        getLocalidades: vi.fn()
    }
}));

// Mock de SearchableSelect para simplificar
vi.mock('../../components/SearchableSelect', () => ({
    default: ({ label, name, options, value, onChange, placeholder, disabled }) => (
        <div data-testid={`select-${name}`}>
            <label>{label}</label>
            <select 
                name={name} 
                value={value} 
                onChange={onChange} 
                disabled={disabled}
                placeholder={placeholder}
            >
                <option value="">Seleccionar...</option>
                {options.map(opt => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
            </select>
        </div>
    )
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
    const mockCheckAuth = vi.fn();
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({
            logout: mockLogout,
            checkAuth: mockCheckAuth
        });

        geografiaService.getProvincias.mockResolvedValue([{ id: 1, nombre: 'Buenos Aires' }]);
        escuelaService.getNiveles.mockResolvedValue([{ id: 1, nombre: 'Primario' }]);
        escuelaService.getSectores.mockResolvedValue([{ id: 1, nombre: 'Estatal' }]);
        escuelaService.search.mockResolvedValue([]);
    });

    it('debe cargar catálogos iniciales al montar', async () => {
        render(
            <BrowserRouter>
                <SelectSchool />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(geografiaService.getProvincias).toHaveBeenCalled();
            expect(escuelaService.getNiveles).toHaveBeenCalled();
            expect(escuelaService.getSectores).toHaveBeenCalled();
        });

        expect(screen.getByText('Buenos Aires')).toBeInTheDocument();
        expect(screen.getByText('Primario')).toBeInTheDocument();
    });

    it('debe cargar departamentos al seleccionar una provincia', async () => {
        geografiaService.getDepartamentos.mockResolvedValue([{ id: 10, nombre: 'La Plata' }]);

        render(
            <BrowserRouter>
                <SelectSchool />
            </BrowserRouter>
        );

        const provinciaSelect = await screen.findByTestId('select-provincia_id');
        fireEvent.change(provinciaSelect.querySelector('select'), { target: { value: '1', name: 'provincia_id' } });

        await waitFor(() => {
            expect(geografiaService.getDepartamentos).toHaveBeenCalledWith('1');
        });
    });

    it('debe buscar escuelas al escribir en el buscador', async () => {
        const mockEscuelas = [
            { id: 1, nombre: 'Escuela 1', numero: '123', cue_anexo: '101', localidad: { nombre: 'La Plata' }, sector: { id: 1, nombre: 'Estatal' } }
        ];
        escuelaService.search.mockResolvedValue(mockEscuelas);

        render(
            <BrowserRouter>
                <SelectSchool />
            </BrowserRouter>
        );

        const searchInput = screen.getByPlaceholderText(/Nombre, N° de escuela o CUE.../i);
        fireEvent.change(searchInput, { target: { value: 'Escuela' } });

        await waitFor(() => {
            expect(escuelaService.search).toHaveBeenCalledWith('Escuela', expect.any(Object));
        });

        expect(await screen.findByText('Escuela 1 N° 123')).toBeInTheDocument();
    });

    it('debe llamar a requestJoin y redirigir al unirse a una escuela', async () => {
        const mockEscuelas = [
            { id: 1, nombre: 'Escuela 1', numero: '123', cue_anexo: '101', localidad: { nombre: 'La Plata' }, sector: { id: 1, nombre: 'Estatal' } }
        ];
        escuelaService.search.mockResolvedValue(mockEscuelas);
        escuelaService.requestJoin.mockResolvedValue({ message: 'Success' });
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <BrowserRouter>
                <SelectSchool />
            </BrowserRouter>
        );

        const searchInput = screen.getByPlaceholderText(/Nombre, N° de escuela o CUE.../i);
        fireEvent.change(searchInput, { target: { value: 'Escuela' } });

        const joinButton = await screen.findByRole('button', { name: /Vincularme/i });
        fireEvent.click(joinButton);

        expect(escuelaService.requestJoin).toHaveBeenCalledWith(1);
        await waitFor(() => {
            expect(mockCheckAuth).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/pending-approval');
        });
    });
});
