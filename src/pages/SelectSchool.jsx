import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import escuelaService from '../services/escuelaService';
import geografiaService from '../services/geografiaService';

/**
 * Vista para que el usuario seleccione su escuela con filtros geográficos.
 */
const SelectSchool = () => {
    const { logout, checkAuth } = useAuth();
    
    // Estados de búsqueda y filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        provincia_id: '',
        departamento_id: '',
        localidad_id: ''
    });

    // Estados de catálogos
    const [provincias, setProvincias] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [localidades, setLocalidades] = useState([]);

    // Estados de UI
    const [escuelas, setEscuelas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Cargar provincias al montar.
     */
    useEffect(() => {
        const fetchProvincias = async () => {
            try {
                const data = await geografiaService.getProvincias();
                setProvincias(data);
            } catch (err) {
                console.error("Error cargando provincias:", err);
            }
        };
        fetchProvincias();
    }, []);

    /**
     * Cargar departamentos cuando cambia la provincia.
     */
    useEffect(() => {
        const fetchDepartamentos = async () => {
            if (!filters.provincia_id) {
                setDepartamentos([]);
                return;
            }
            try {
                const data = await geografiaService.getDepartamentos(filters.provincia_id);
                setDepartamentos(data);
            } catch (err) {
                console.error("Error cargando departamentos:", err);
            }
        };
        fetchDepartamentos();
    }, [filters.provincia_id]);

    /**
     * Cargar localidades cuando cambia el departamento.
     */
    useEffect(() => {
        const fetchLocalidades = async () => {
            if (!filters.departamento_id) {
                setLocalidades([]);
                return;
            }
            try {
                const data = await geografiaService.getLocalidades(filters.departamento_id);
                setLocalidades(data);
            } catch (err) {
                console.error("Error cargando localidades:", err);
            }
        };
        fetchLocalidades();
    }, [filters.departamento_id]);

    /**
     * Función principal de búsqueda (Memoizada para evitar re-creaciones).
     */
    const handleSearch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const activeFilters = {};
            if (filters.provincia_id) activeFilters.provincia_id = filters.provincia_id;
            if (filters.departamento_id) activeFilters.departamento_id = filters.departamento_id;
            if (filters.localidad_id) activeFilters.localidad_id = filters.localidad_id;

            const data = await escuelaService.search(searchTerm, activeFilters);
            setEscuelas(data);
        } catch (err) {
            console.error("Error buscando escuelas:", err);
            setError("Error al buscar escuelas. Intente nuevamente.");
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, filters]);

    /**
     * Debounce para la búsqueda automática.
     */
    useEffect(() => {
        const timer = setTimeout(() => {
            // Buscamos si hay texto suficiente O si hay algún filtro geográfico activo
            if (searchTerm.length >= 3 || filters.provincia_id || filters.departamento_id || filters.localidad_id) {
                handleSearch();
            } else {
                setEscuelas([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, filters, handleSearch]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        
        // Reset jerárquico al cambiar nivel superior
        if (name === 'provincia_id') {
            setFilters({ provincia_id: value, departamento_id: '', localidad_id: '' });
        } else if (name === 'departamento_id') {
            setFilters(prev => ({ ...prev, departamento_id: value, localidad_id: '' }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters({ provincia_id: '', departamento_id: '', localidad_id: '' });
        setEscuelas([]);
    };

    const handleJoin = async (escuelaId) => {
        if (!window.confirm("¿Confirmas que deseas solicitar unirte a esta institución?")) return;
        
        setIsSubmitting(true);
        setError(null);
        try {
            await escuelaService.requestJoin(escuelaId);
            await checkAuth();
        } catch (err) {
            console.error("Error al solicitar unión:", err);
            setError("No se pudo enviar la solicitud. Intente más tarde.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 font-sans animate-fadeIn">
            {/* Cabecera */}
            <div className="text-center mb-10">
                <div className="inline-block p-4 bg-primary-50 rounded-2xl mb-4 text-primary-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Vincular con Institución</h1>
                <p className="text-secondary-500 mt-2 font-medium">Filtra por geografía para encontrar tu escuela más rápido</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-secondary-200 overflow-hidden">
                {/* Panel de Filtros */}
                <div className="bg-secondary-50 p-6 md:p-8 border-b border-secondary-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Provincia */}
                        <div>
                            <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2 ml-1">Provincia</label>
                            <select
                                name="provincia_id"
                                value={filters.provincia_id}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-3 border border-secondary-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium"
                            >
                                <option value="">Todas las Provincias</option>
                                {provincias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                        {/* Departamento */}
                        <div>
                            <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2 ml-1">Departamento</label>
                            <select
                                name="departamento_id"
                                value={filters.departamento_id}
                                onChange={handleFilterChange}
                                disabled={!filters.provincia_id}
                                className="w-full px-4 py-3 border border-secondary-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium disabled:opacity-50"
                            >
                                <option value="">Todos los Departamentos</option>
                                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                        </div>
                        {/* Localidad */}
                        <div>
                            <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2 ml-1">Localidad</label>
                            <select
                                name="localidad_id"
                                value={filters.localidad_id}
                                onChange={handleFilterChange}
                                disabled={!filters.departamento_id}
                                className="w-full px-4 py-3 border border-secondary-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium disabled:opacity-50"
                            >
                                <option value="">Todas las Localidades</option>
                                {localidades.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-4 py-3.5 border border-secondary-300 rounded-xl bg-white text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium"
                                placeholder="Nombre, N° de escuela o CUE..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={clearFilters}
                            className="w-full md:w-auto px-6 py-3.5 text-secondary-500 font-bold hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>

                {/* Listado de Resultados */}
                <div className="p-0">
                    {error && (
                        <div className="m-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm rounded-r-lg">
                            <span className="font-semibold">{error}</span>
                        </div>
                    )}

                    <div className="divide-y divide-secondary-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center py-20 bg-white">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                                <p className="text-secondary-500 font-medium italic">Buscando instituciones...</p>
                            </div>
                        ) : escuelas.length > 0 ? (
                            escuelas.map((escuela) => (
                                <div key={escuela.id} className="p-6 hover:bg-secondary-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-bold uppercase rounded">Escuela</span>
                                            <h3 className="font-extrabold text-secondary-900 group-hover:text-primary-600 transition-colors">
                                                {escuela.nombre} {escuela.numero ? `N° ${escuela.numero}` : ''}
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary-500 font-medium">
                                            <p className="flex items-center">
                                                <svg className="w-4 h-4 mr-1 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {escuela.localidad?.nombre || 'Localidad no especificada'}
                                            </p>
                                            <p className="flex items-center">
                                                <svg className="w-4 h-4 mr-1 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                                CUE: {escuela.cue_anexo || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleJoin(escuela.id)}
                                        disabled={isSubmitting}
                                        className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        Vincularme
                                    </button>
                                </div>
                            ))
                        ) : (searchTerm.length >= 3 || filters.provincia_id) ? (
                            <div className="flex flex-col items-center py-20 bg-white text-secondary-400">
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="font-bold italic">No encontramos escuelas con estos filtros.</p>
                                <p className="text-sm">Prueba ajustando los criterios de búsqueda.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-20 bg-white text-secondary-400">
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="font-bold">Comienza tu búsqueda</p>
                                <p className="text-sm">Selecciona una provincia o escribe el nombre de tu escuela.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer de navegación */}
            <div className="mt-8 flex justify-between items-center px-4">
                <button 
                    onClick={logout}
                    className="text-secondary-500 font-bold hover:text-red-600 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar Sesión
                </button>
                <div className="hidden md:flex items-center gap-2 text-xs text-secondary-400 font-bold uppercase tracking-widest">
                    <span>SGEI</span>
                    <span className="w-1 h-1 bg-secondary-300 rounded-full"></span>
                    <span>Plataforma Federal</span>
                </div>
            </div>
        </div>
    );
};

export default SelectSchool;
