import { useState, useEffect, useRef } from 'react';

/**
 * Componente de selección con búsqueda integrada y autocompletado (Ghost Text).
 */
const SearchableSelect = ({ options, value, onChange, name, placeholder = "Seleccionar...", disabled = false, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState([]);
    const [suggestion, setSuggestion] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Sincronizar el término de búsqueda con la opción seleccionada externamente
    useEffect(() => {
        if (value && options.length > 0) {
            const selected = options.find(opt => String(opt.id) === String(value));
            if (selected) {
                setSearchTerm(selected.nombre);
                setSuggestion('');
            }
        } else if (!value) {
            setSearchTerm('');
            setSuggestion('');
        }
    }, [value, options]);

    // Filtrar opciones y generar sugerencia de autocompletado
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredOptions(options);
            setSuggestion('');
            setActiveIndex(0);
            return;
        }

        const filtered = options.filter(opt => 
            opt.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOptions(filtered);
        setActiveIndex(0);

        // Lógica de sugerencia (solo si el término coincide con el inicio de alguna opción)
        const bestMatch = options.find(opt => 
            opt.nombre.toLowerCase().startsWith(searchTerm.toLowerCase())
        );

        if (bestMatch && searchTerm.length > 0 && bestMatch.nombre.toLowerCase() !== searchTerm.toLowerCase()) {
            // Mantener el casing original del usuario pero mostrar el resto de la sugerencia
            setSuggestion(searchTerm + bestMatch.nombre.slice(searchTerm.length));
        } else {
            setSuggestion('');
        }
    }, [searchTerm, options]);

    // Cerrar al hacer click afuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                const selected = options.find(opt => String(opt.id) === String(value));
                setSearchTerm(selected ? selected.nombre : '');
                setSuggestion('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options]);

    const handleSelect = (option) => {
        setSearchTerm(option.nombre);
        setSuggestion('');
        setIsOpen(false);
        onChange({ target: { name, value: option.id } });
    };

    const handleKeyDown = (e) => {
        if (disabled) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isOpen && filteredOptions[activeIndex]) {
                handleSelect(filteredOptions[activeIndex]);
            } else if (suggestion) {
                const bestMatch = options.find(opt => opt.nombre.toLowerCase() === suggestion.toLowerCase());
                if (bestMatch) handleSelect(bestMatch);
            }
        } else if (e.key === 'Tab') {
            // Al presionar Tab, cerramos el menú
            setIsOpen(false);
            // Si hay una sugerencia, la aceptamos antes de que el foco cambie
            if (suggestion && searchTerm !== suggestion) {
                const bestMatch = options.find(opt => opt.nombre.toLowerCase() === suggestion.toLowerCase());
                if (bestMatch) handleSelect(bestMatch);
            }
        } else if (e.key === 'ArrowRight') {
            if (suggestion && searchTerm !== suggestion) {
                e.preventDefault();
                const bestMatch = options.find(opt => opt.nombre.toLowerCase() === suggestion.toLowerCase());
                if (bestMatch) handleSelect(bestMatch);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (!isOpen) setIsOpen(true);
        if (val === '') {
            onChange({ target: { name, value: '' } });
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2 ml-1">
                    {label}
                </label>
            )}
            
            <div className="relative flex items-center">
                {/* Sugerencia (Ghost Text) */}
                {!disabled && suggestion && (
                    <div className="absolute inset-y-0 left-0 pl-4 py-3 border border-transparent text-secondary-300 pointer-events-none font-medium whitespace-pre">
                        {suggestion}
                    </div>
                )}
                
                <input
                    ref={inputRef}
                    type="text"
                    className={`w-full px-4 py-3 border border-secondary-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium pr-10 z-10 ${disabled ? 'opacity-50 cursor-not-allowed bg-secondary-50' : 'bg-transparent'}`}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                    autoComplete="off"
                />
                
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-20">
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect({ id: '', nombre: '' });
                            }}
                            className="p-1 hover:bg-secondary-100 rounded-full text-secondary-400 hover:text-red-500 transition-colors mr-1"
                            title="Limpiar"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <svg className={`w-5 h-5 text-secondary-400 transition-transform ${isOpen ? 'rotate-180' : ''} pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-secondary-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-fadeInUp animate-duration-200">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={option.id}
                                className={`px-4 py-3 cursor-pointer transition-colors font-medium border-b border-secondary-50 last:border-none 
                                    ${index === activeIndex ? 'bg-primary-50 text-primary-700' : 'text-secondary-900 hover:bg-secondary-50'}
                                    ${String(value) === String(option.id) ? 'bg-primary-100 text-primary-800 font-bold' : ''}`}
                                onClick={() => handleSelect(option)}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                {option.nombre}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-secondary-400 italic text-sm text-center">
                            No hay coincidencias
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
