import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchableSelect from '../SearchableSelect';

describe('SearchableSelect Component', () => {
    const mockOptions = [
        { id: 1, nombre: 'Opción A' },
        { id: 2, nombre: 'Opción B' },
        { id: 3, nombre: 'Otra Cosa' }
    ];
    const mockOnChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar con el label y placeholder correctos', () => {
        render(
            <SearchableSelect 
                label="Mi Select" 
                placeholder="Escribe algo..." 
                options={mockOptions} 
                onChange={mockOnChange}
            />
        );

        expect(screen.getByText('Mi Select')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Escribe algo...')).toBeInTheDocument();
    });

    it('debe filtrar opciones al escribir', () => {
        render(
            <SearchableSelect 
                options={mockOptions} 
                onChange={mockOnChange}
            />
        );

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Opción' } });

        // Buscamos todas las ocurrencias ya que puede estar en el ghost text y en la lista
        const optionsA = screen.getAllByText('Opción A');
        expect(optionsA.length).toBeGreaterThan(0);
        
        const optionsB = screen.getAllByText('Opción B');
        expect(optionsB.length).toBeGreaterThan(0);

        expect(screen.queryByText('Otra Cosa')).not.toBeInTheDocument();
    });

    it('debe llamar a onChange al seleccionar una opción', () => {
        render(
            <SearchableSelect 
                options={mockOptions} 
                onChange={mockOnChange}
                name="mi-select"
            />
        );

        const input = screen.getByRole('textbox');
        fireEvent.focus(input);
        
        const option = screen.getByText('Opción A');
        fireEvent.click(option);

        expect(mockOnChange).toHaveBeenCalledWith({
            target: { name: 'mi-select', value: 1 }
        });
        expect(input).toHaveValue('Opción A');
    });

    it('debe navegar por las opciones con el teclado', () => {
        render(
            <SearchableSelect 
                options={mockOptions} 
                onChange={mockOnChange}
            />
        );

        const input = screen.getByRole('textbox');
        fireEvent.focus(input);

        // ArrowDown para la segunda (índice 1)
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        // ArrowDown para la tercera (índice 2)
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        // Enter para seleccionar la tercera (id 3: 'Otra Cosa')
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockOnChange).toHaveBeenCalledWith({
            target: { name: undefined, value: 3 }
        });
    });

    it('debe aceptar sugerencias con la tecla Tab', () => {
        render(
            <SearchableSelect 
                options={mockOptions} 
                onChange={mockOnChange}
            />
        );

        const input = screen.getByRole('textbox');
        // Escribimos "Op" y debería sugerir "Opción A" (la primera que empieza con Op)
        fireEvent.change(input, { target: { value: 'Op' } });
        
        fireEvent.keyDown(input, { key: 'Tab' });

        expect(mockOnChange).toHaveBeenCalledWith({
            target: { name: undefined, value: 1 }
        });
    });

    it('debe deshabilitarse correctamente', () => {
        render(
            <SearchableSelect 
                options={mockOptions} 
                onChange={mockOnChange}
                disabled={true}
            />
        );

        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
        
        fireEvent.focus(input);
        expect(screen.queryByText('Opción A')).not.toBeInTheDocument();
    });
});
