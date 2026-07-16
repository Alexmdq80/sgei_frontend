import { useState, useEffect, useRef } from 'react';
import { Search, X, UserPlus, ArrowLeft, Loader2, User } from 'lucide-react';
import personaService from '../services/personaService';
import documentoTipoService from '../services/documentoTipoService';
import { parseError } from '../utils/errorParser';

/**
 * Combobox reutilizable para selección de personas con búsqueda server-side.
 * Props:
 *   - value: objeto persona seleccionada | null
 *   - onChange: callback(persona | null)
 *   - disabled: bool
 */
const PersonaCombobox = ({ value, onChange, disabled = false }) => {
    const [query, setQuery]           = useState('');
    const [results, setResults]       = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [step, setStep]             = useState('search'); // 'search' | 'create'
    const [documentoTipos, setDocumentoTipos] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [newPersona, setNewPersona] = useState({
        apellido: '',
        nombre: '',
        documento_tipo_id: '',
        documento_numero: '',
        email: '',
    });

    const containerRef = useRef(null);
    const debounceRef  = useRef(null);

    // Cargar tipos de documento una sola vez
    useEffect(() => {
        documentoTipoService.getAll()
            .then(data => setDocumentoTipos(Array.isArray(data) ? data : (data.data || [])))
            .catch(() => {});
    }, []);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Búsqueda con debounce
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await personaService.getAll({ search: query, per_page: 10 });
                setResults(res.data || []);
                setShowDropdown(true);
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const handleSelect = (persona) => {
        onChange(persona);
        setShowDropdown(false);
        setQuery('');
    };

    const handleClear = () => {
        onChange(null);
        setQuery('');
        setResults([]);
    };

    const handleCreate = async () => {
        setIsCreating(true);
        setCreateError('');
        try {
            const payload = { ...newPersona };
            if (!payload.email) delete payload.email;
            const res = await personaService.create(payload);
            const created = res.data || res;
            onChange(created);
            setStep('search');
            setNewPersona({ apellido: '', nombre: '', documento_tipo_id: '', documento_numero: '', email: '' });
        } catch (err) {
            setCreateError(parseError(err, 'Error al crear la persona.'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleBackToSearch = () => {
        setStep('search');
        setCreateError('');
    };

    const isCreateFormValid =
        newPersona.apellido.trim() &&
        newPersona.nombre.trim() &&
        newPersona.documento_tipo_id &&
        newPersona.documento_numero.trim();

    // ── CHIP: persona ya seleccionada ──────────────────────────────────────────
    if (value) {
        return (
            <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-xl transition-all">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 flex-shrink-0 border border-primary-200">
                    <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-secondary-900 uppercase truncate">
                        {value.apellido}, {value.nombre}
                    </p>
                    <p className="text-xs text-secondary-500 font-bold">DNI {value.documento_numero}</p>
                </div>
                {!disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        title="Cambiar persona"
                        className="p-1.5 text-secondary-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    }

    // ── PASO: búsqueda ─────────────────────────────────────────────────────────
    if (step === 'search') {
        return (
            <div ref={containerRef} className="relative">
                {/* Input de búsqueda */}
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400 pointer-events-none">
                        {isSearching
                            ? <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                            : <Search className="w-4 h-4" />}
                    </span>
                    <input
                        type="text"
                        placeholder="Escribí nombre o DNI..."
                        autoComplete="off"
                        disabled={disabled}
                        className="w-full pl-9 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        value={query}
                        onChange={e => setQuery(e.target.value.toUpperCase())}
                        onFocus={() => results.length > 0 && setShowDropdown(true)}
                    />
                </div>

                {/* Hint de mínimo de caracteres */}
                {query.length > 0 && query.length < 2 && (
                    <p className="text-[10px] text-secondary-400 font-bold mt-1 ml-1">
                        Escribí al menos 2 caracteres
                    </p>
                )}

                {/* Dropdown de resultados */}
                {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-secondary-200 rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
                        {results.length > 0 ? (
                            <>
                                <ul className="max-h-48 overflow-y-auto divide-y divide-secondary-100">
                                    {results.map(p => (
                                        <li key={p.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelect(p)}
                                                className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-600 flex-shrink-0">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-secondary-900 uppercase">
                                                        {p.apellido}, {p.nombre}
                                                    </p>
                                                    <p className="text-xs text-secondary-500 font-bold">
                                                        DNI {p.documento_numero}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="px-4 py-2.5 border-t border-secondary-100 bg-secondary-50">
                                    <button
                                        type="button"
                                        onClick={() => { setStep('create'); setShowDropdown(false); }}
                                        className="flex items-center gap-1.5 text-xs font-black text-primary-600 hover:text-primary-800 uppercase tracking-wide transition-colors"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        ¿No la encontrás? Dar de alta
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="px-4 py-5 text-center space-y-2">
                                <p className="text-sm text-secondary-500 font-bold">
                                    Sin resultados para "<span className="text-secondary-700">{query}</span>"
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setStep('create'); setShowDropdown(false); }}
                                    className="inline-flex items-center gap-1.5 text-xs font-black text-primary-600 hover:text-primary-800 uppercase tracking-wide transition-colors"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Dar de alta nueva persona
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ── PASO: alta rápida ──────────────────────────────────────────────────────
    return (
        <div className="border border-secondary-200 rounded-xl overflow-hidden">
            {/* Header del mini-form */}
            <div className="px-4 py-2.5 bg-primary-50 border-b border-primary-100 flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleBackToSearch}
                    className="p-1 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded-md transition-colors"
                    title="Volver a buscar"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-primary-800 uppercase tracking-widest">
                    Alta rápida de persona
                </span>
            </div>

            <div className="p-4 space-y-3 bg-white">
                {/* Error */}
                {createError && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {createError}
                    </p>
                )}

                {/* Apellido + Nombre */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                            Apellido *
                        </label>
                        <input
                            type="text"
                            placeholder="GARCÍA"
                            className="w-full px-3 py-2 mt-0.5 bg-secondary-50 border border-secondary-200 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={newPersona.apellido}
                            onChange={e => setNewPersona({ ...newPersona, apellido: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            placeholder="JUAN"
                            className="w-full px-3 py-2 mt-0.5 bg-secondary-50 border border-secondary-200 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={newPersona.nombre}
                            onChange={e => setNewPersona({ ...newPersona, nombre: e.target.value.toUpperCase() })}
                        />
                    </div>
                </div>

                {/* Tipo Doc + Nro */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                            Tipo Doc *
                        </label>
                        <select
                            className="w-full px-3 py-2 mt-0.5 bg-secondary-50 border border-secondary-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={newPersona.documento_tipo_id}
                            onChange={e => setNewPersona({ ...newPersona, documento_tipo_id: e.target.value })}
                        >
                            <option value="">Tipo...</option>
                            {documentoTipos.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                            Nro Documento *
                        </label>
                        <input
                            type="text"
                            placeholder="28541230"
                            className="w-full px-3 py-2 mt-0.5 bg-secondary-50 border border-secondary-200 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={newPersona.documento_numero}
                            onChange={e => setNewPersona({ ...newPersona, documento_numero: e.target.value.toUpperCase() })}
                        />
                    </div>
                </div>

                {/* Email (opcional) */}
                <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Email de contacto <span className="normal-case font-medium">(opcional)</span>
                    </label>
                    <input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        className="w-full px-3 py-2 mt-0.5 bg-secondary-50 border border-secondary-200 rounded-lg text-sm font-bold lowercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        value={newPersona.email}
                        onChange={e => setNewPersona({ ...newPersona, email: e.target.value.toLowerCase() })}
                    />
                </div>

                {/* Botón crear */}
                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isCreating || !isCreateFormValid}
                    className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-primary-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isCreating
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><UserPlus className="w-4 h-4" /> Crear y seleccionar</>}
                </button>
            </div>
        </div>
    );
};

export default PersonaCombobox;
