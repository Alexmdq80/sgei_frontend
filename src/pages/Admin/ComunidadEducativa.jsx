import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Users, Search, Eye, Info, X, 
    Phone, Home, Building2, ChevronDown, Loader2, MapPin, Layers, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import personaService from '../../services/personaService';
import escuelaService from '../../services/escuelaService';
import geografiaService from '../../services/geografiaService';
import SearchableSelect from '../../components/SearchableSelect';

// Roles de Jefatura que necesitan seleccionar una escuela manualmente
const ROLES_JEFATURA = ['superuser', 'jefe_provincial', 'jefe_regional', 'jefe_distrital'];

/**
 * Determina si el perfil activo pertenece a un rol de Jefatura (sin escuela propia).
 */
const isJefatura = (user) =>
    user?.roles?.some((r) => ROLES_JEFATURA.includes(r.name));

/**
 * Componente para visualizar la Comunidad Educativa de una institución.
 * - Conducción (director, etc.): usa directamente su escuela del perfil activo.
 * - Jefaturas y superuser: presenta un selector de escuelas jerárquico bajo su jurisdicción.
 */
export default function ComunidadEducativa() {
    const { user, activeProfile, showNotification } = useAuth();

    // Escuela seleccionada para consultar (puede venir del perfil o del selector)
    const [escuelaId, setEscuelaId] = useState(activeProfile?.escuela_id ?? null);
    const [escuelaNombre, setEscuelaNombre] = useState(activeProfile?.escuela?.nombre ?? '');

    // Estados de Catálogos Geográficos y de Filtros para Jefaturas
    const [provincias, setProvincias] = useState([]);
    const [regiones, setRegiones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [niveles, setNiveles] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [escuelas, setEscuelas] = useState([]);

    const [selectedProvinciaId, setSelectedProvinciaId] = useState('');
    const [selectedRegionId, setSelectedRegionId] = useState('');
    const [selectedDepartamentoId, setSelectedDepartamentoId] = useState('');
    const [selectedNivelId, setSelectedNivelId] = useState('');
    const [selectedSectorId, setSelectedSectorId] = useState('');
    const [cueSearch, setCueSearch] = useState('');

    const [isLoadingGeografia, setIsLoadingGeografia] = useState(false);
    const [isLoadingEscuelas, setIsLoadingEscuelas] = useState(false);

    // Comunidad educativa
    const [personas, setPersonas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [relacionFilter, setRelacionFilter] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    // Modal de detalles
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);

    const modoJefatura = isJefatura(user);

    // ---------------------------------------------------------------------------
    // Resolución de Jurisdicciones según el Rol
    // ---------------------------------------------------------------------------
    const { isSuperUser, isJefeProvincial, isJefeRegional, isJefeDistrital, pId, rId, dId } = useMemo(() => {
        const roles = user?.roles?.map(r => r.name) || [];
        const isSuperUser = roles.includes('superuser');
        const isJefeProvincial = roles.includes('jefe_provincial');
        const isJefeRegional = roles.includes('jefe_regional');
        const isJefeDistrital = roles.includes('jefe_distrital');

        let resolvedPId = null;
        let resolvedRId = null;
        let resolvedDId = null;

        if (isJefeProvincial) {
            resolvedPId = user?.provincia_usuario?.provincia_id;
        } else if (isJefeRegional) {
            resolvedPId = user?.region_usuario?.region?.provincia_id;
            resolvedRId = user?.region_usuario?.region_id;
        } else if (isJefeDistrital) {
            resolvedPId = user?.distrito_usuario?.distrito?.provincia_id;
            resolvedRId = user?.distrito_usuario?.distrito?.region_id;
            resolvedDId = user?.distrito_usuario?.departamento_id;
        }

        return {
            isSuperUser,
            isJefeProvincial,
            isJefeRegional,
            isJefeDistrital,
            pId: resolvedPId,
            rId: resolvedRId,
            dId: resolvedDId
        };
    }, [user]);

    // Filtrado de Departamentos según la Región seleccionada (del lado del cliente)
    const filteredDepartamentos = useMemo(() => {
        if (!selectedRegionId) return departamentos;
        return departamentos.filter(d => String(d.region_id) === String(selectedRegionId));
    }, [selectedRegionId, departamentos]);

    // Opciones formateadas para el componente SearchableSelect de Escuelas
    const escuelaOptions = useMemo(() => {
        return escuelas.map((esc) => ({
            id: String(esc.id),
            nombre: `${esc.nombre}${esc.numero ? ` N° ${esc.numero}` : ''}${esc.cue_anexo ? ` [CUE: ${esc.cue_anexo}]` : ''}${esc.localidad?.nombre ? ` (${esc.localidad.nombre})` : ''}`
        }));
    }, [escuelas]);

    // ---------------------------------------------------------------------------
    // Carga de Datos Geográficos, Catálogos y Escuelas
    // ---------------------------------------------------------------------------
    const fetchFilteredEscuelas = useCallback(async (provId, regId, deptId, nivelId, sectorId) => {
        if (!provId) {
            setEscuelas([]);
            return;
        }
        try {
            setIsLoadingEscuelas(true);
            const response = await escuelaService.getAllAdmin({
                provincia_id: provId || undefined,
                region_id: regId || undefined,
                localidad_departamento_id: deptId || undefined,
                nivel_id: nivelId || undefined,
                sector_id: sectorId || undefined,
                per_page: 1000
            });
            setEscuelas(response.data || response || []);
        } catch (error) {
            console.error("Error fetching schools:", error);
            showNotification(parseError(error, 'No se pudieron cargar las escuelas.'), 'error');
        } finally {
            setIsLoadingEscuelas(false);
        }
    }, [showNotification]);

    // Inicialización al montar
    useEffect(() => {
        if (!modoJefatura) return;

        const init = async () => {
            try {
                setIsLoadingGeografia(true);
                // Cargar catálogos de niveles y sectores
                const [nivsData, sectsData] = await Promise.all([
                    escuelaService.getNiveles(),
                    escuelaService.getSectores()
                ]);
                setNiveles(nivsData || []);
                setSectores(sectsData || []);

                // Cargar Provincias (si es superuser) o Geografía inicial
                if (isSuperUser) {
                    const provsData = await geografiaService.getProvincias();
                    setProvincias(provsData || []);
                } else if (pId) {
                    setSelectedProvinciaId(pId);
                    
                    const [regionsData, deptosData] = await Promise.all([
                        geografiaService.getRegiones({ provincia_id: pId }),
                        geografiaService.getDepartamentos(pId)
                    ]);
                    setRegiones(regionsData || []);
                    setDepartamentos(deptosData || []);
                    
                    if (rId) {
                        setSelectedRegionId(rId);
                    }
                    if (dId) {
                        setSelectedDepartamentoId(dId);
                    }
                }
            } catch (error) {
                console.error("Error during initialization:", error);
            } finally {
                setIsLoadingGeografia(false);
            }
        };

        init();
    }, [modoJefatura, pId, rId, dId, isSuperUser]);

    // Efecto reactivo para recargar escuelas al cambiar Provincia, Región, Distrito, Nivel o Sector
    useEffect(() => {
        if (modoJefatura && selectedProvinciaId) {
            fetchFilteredEscuelas(
                selectedProvinciaId,
                selectedRegionId,
                selectedDepartamentoId,
                selectedNivelId,
                selectedSectorId
            );
        } else {
            setEscuelas([]);
        }
    }, [
        modoJefatura,
        selectedProvinciaId,
        selectedRegionId,
        selectedDepartamentoId,
        selectedNivelId,
        selectedSectorId,
        fetchFilteredEscuelas
    ]);

    // ---------------------------------------------------------------------------
    // Controladores de Cambio de Filtro
    // ---------------------------------------------------------------------------
    const handleProvinciaChange = async (provId) => {
        setSelectedProvinciaId(provId);
        setSelectedRegionId('');
        setSelectedDepartamentoId('');
        setSelectedNivelId('');
        setSelectedSectorId('');
        setEscuelaId(null);
        setEscuelaNombre('');
        setRegiones([]);
        setDepartamentos([]);
        setEscuelas([]);

        if (provId) {
            try {
                setIsLoadingGeografia(true);
                const [regionsData, deptosData] = await Promise.all([
                    geografiaService.getRegiones({ provincia_id: provId }),
                    geografiaService.getDepartamentos(provId)
                ]);
                setRegiones(regionsData || []);
                setDepartamentos(deptosData || []);
            } catch (error) {
                showNotification('Error al cargar datos geográficos.', 'error');
            } finally {
                setIsLoadingGeografia(false);
            }
        }
    };

    const handleRegionChange = (regId) => {
        setSelectedRegionId(regId);
        setSelectedDepartamentoId('');
        setEscuelaId(null);
        setEscuelaNombre('');
    };

    const handleDistritoChange = (deptId) => {
        setSelectedDepartamentoId(deptId);
        setEscuelaId(null);
        setEscuelaNombre('');
    };

    const handleNivelChange = (nId) => {
        setSelectedNivelId(nId);
        setEscuelaId(null);
        setEscuelaNombre('');
    };

    const handleSectorChange = (sId) => {
        setSelectedSectorId(sId);
        setEscuelaId(null);
        setEscuelaNombre('');
    };

    const handleEscuelaSelect = (e) => {
        const id = e.target.value;
        const found = escuelas.find((esc) => String(esc.id) === String(id));
        setEscuelaId(id || null);
        setEscuelaNombre(found?.nombre ?? '');
        setPersonas([]);
        setSearchTerm('');
        setRelacionFilter('');
    };

    const handleCueSearch = async () => {
        if (!cueSearch.trim()) {
            showNotification('Por favor, ingrese un número de CUE.', 'warning');
            return;
        }

        try {
            setIsLoadingEscuelas(true);
            
            const queryParams = {
                search: cueSearch.trim(),
                per_page: 10
            };

            // Aplicar limitaciones geográficas de jefatura para la búsqueda si corresponden
            if (pId) queryParams.provincia_id = pId;
            if (rId) queryParams.region_id = rId;
            if (dId) queryParams.localidad_departamento_id = dId;

            const response = await escuelaService.getAllAdmin(queryParams);
            const foundEscuelas = response.data || response || [];

            if (foundEscuelas.length === 0) {
                showNotification('No se encontró ninguna escuela con ese CUE en su jurisdicción.', 'warning');
                return;
            }

            // Actualizar la lista de escuelas disponibles
            setEscuelas(foundEscuelas);
            
            // Si encontramos exactamente una escuela, la seleccionamos automáticamente
            if (foundEscuelas.length === 1) {
                const esc = foundEscuelas[0];
                
                // Intentar configurar la geografía de la escuela encontrada
                if (esc.localidad?.departamento) {
                    const dept = esc.localidad.departamento;
                    const provId = dept.provincia_id;
                    const regId = dept.region_id;
                    const deptId = dept.id;

                    try {
                        setIsLoadingGeografia(true);
                        // Cargar catálogos geográficos correspondientes para poblar los dropdowns
                        const [regionsData, deptosData] = await Promise.all([
                            geografiaService.getRegiones({ provincia_id: provId }),
                            geografiaService.getDepartamentos(provId)
                        ]);
                        setRegiones(regionsData || []);
                        setDepartamentos(deptosData || []);
                        
                        // Setear estados geográficos correspondientes
                        setSelectedProvinciaId(provId);
                        setSelectedRegionId(regId || '');
                        setSelectedDepartamentoId(deptId);
                    } catch (err) {
                        console.error("Error setting geography dropdowns:", err);
                    } finally {
                        setIsLoadingGeografia(false);
                    }
                }
                
                setEscuelaId(esc.id);
                setEscuelaNombre(esc.nombre);
                setPersonas([]);
                setSearchTerm('');
                setRelacionFilter('');
                showNotification(`Escuela seleccionada: ${esc.nombre}`, 'success');
            } else {
                showNotification(`Se encontraron ${foundEscuelas.length} escuelas. Selecciónela en la lista de abajo.`, 'info');
            }
        } catch (error) {
            console.error("Error searching school by CUE:", error);
            showNotification(parseError(error, 'Error al buscar la escuela por CUE.'), 'error');
        } finally {
            setIsLoadingEscuelas(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Carga de la Comunidad Educativa
    // ---------------------------------------------------------------------------
    const fetchComunidad = useCallback(async (page = 1) => {
        if (!escuelaId) return;
        try {
            setIsLoading(true);
            const response = await personaService.getComunidad({
                escuela_id: escuelaId,
                search: searchTerm,
                relacion: relacionFilter,
                page,
                per_page: 15,
            });
            setPersonas(response.data ?? []);
            setPagination(response.meta ?? { current_page: 1, last_page: 1, total: 0 });
        } catch (error) {
            console.error('Error al cargar comunidad:', error);
            showNotification(parseError(error, 'No se pudo cargar la comunidad educativa.'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [escuelaId, searchTerm, relacionFilter, showNotification]);

    useEffect(() => {
        if (escuelaId) {
            fetchComunidad(1);
        } else {
            setPersonas([]);
            setPagination({ current_page: 1, last_page: 1, total: 0 });
        }
    }, [escuelaId, relacionFilter, fetchComunidad]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchComunidad(1);
    };

    const handleViewPersona = async (id) => {
        try {
            setIsFetchingDetails(true);
            const response = await personaService.getById(id);
            setSelectedPersona(response.data);
            setIsDetailsModalOpen(true);
        } catch (error) {
            console.error('Error al obtener detalles:', error);
            showNotification(parseError(error, 'No se pudieron cargar los detalles.'), 'error');
        } finally {
            setIsFetchingDetails(false);
        }
    };

    // Guard: Conducción sin perfil activo con escuela
    if (!modoJefatura && !activeProfile?.escuela_id) {
        return (
            <div className="p-10 text-center bg-white rounded-3xl border border-secondary-200 shadow-sm">
                <Info className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-secondary-900 uppercase">Perfil Institucional Requerido</h2>
                <p className="text-secondary-500 mt-2 font-medium">
                    Debe seleccionar una institución para visualizar su comunidad educativa.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
                        Comunidad Educativa
                    </h1>
                    <p className="text-secondary-500 mt-1 font-medium italic">
                        {escuelaNombre
                            ? `Personas vinculadas a ${escuelaNombre}`
                            : 'Seleccione una institución para comenzar'}
                    </p>
                </div>
                {escuelaId && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-2xl">
                        <Users className="w-5 h-5 text-primary-600" />
                        <span className="text-sm font-black text-primary-700 uppercase tracking-tighter">
                            {pagination.total} Miembros vinculados
                        </span>
                    </div>
                )}
            </div>

            {/* Selector de Escuela Jerárquico (solo Jefatura) */}
            {modoJefatura && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200 space-y-4">
                    <h2 className="text-sm font-black text-secondary-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        Filtros de Búsqueda de Institución
                    </h2>

                {/* --- PRIMERA FILA: CUE y Provincia lado a lado y perfectamente alineados --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    
                    {/* Buscador Directa por CUE */}
                    <div>
                        <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Search className="w-3.5 h-3.5 text-secondary-400" />
                            Búsqueda directa por CUE
                        </label>
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                placeholder="CUE / Anexo (ej. 300123400)"
                                className="w-full pl-4 pr-12 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold h-[42px]"
                                value={cueSearch}
                                onChange={(e) => setCueSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCueSearch()}
                            />
                            {/* El botón ahora vive dentro del input de forma elegante */}
                            <button
                                type="button"
                                onClick={handleCueSearch}
                                className="absolute right-1.5 p-2 bg-secondary-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors"
                                title="Buscar CUE"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Provincia */}

                    {isSuperUser && (
                        <div>
                            <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5">
                                Provincia
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8 h-[42px]"
                                    value={selectedProvinciaId}
                                    onChange={(e) => handleProvinciaChange(e.target.value)}
                                    disabled={isLoadingGeografia}
                                >
                                    <option value="">— Seleccione Provincia —</option>
                                    {provincias.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
                            </div>
                        </div>
                    )}
                </div>

                    {/* --- SEGUNDA FILA: Los demás filtros van por debajo --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                        
                        {/* Región (superuser, provincial) */}
                        {(isSuperUser || isJefeProvincial) && (
                            <div>
                                <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5">
                                    Región
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
                                        value={selectedRegionId}
                                        onChange={(e) => handleRegionChange(e.target.value)}
                                        disabled={(!selectedProvinciaId && isSuperUser) || isLoadingGeografia}
                                    >
                                        <option value="">— Todas las Regiones —</option>
                                        {regiones.map(r => (
                                            <option key={r.id} value={r.id}>Región {r.numero}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Distrito / Departamento (superuser, provincial, regional) */}
                        {(isSuperUser || isJefeProvincial || isJefeRegional) && (
                            <div>
                            {/*<div className="col-span-1 sm:col-span-2">*/}
                                <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5">
                                    Distrito / Departamento
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
                                        value={selectedDepartamentoId}
                                        onChange={(e) => handleDistritoChange(e.target.value)}
                                        disabled={(!selectedProvinciaId && isSuperUser) || isLoadingGeografia}
                                    >
                                        <option value="">— Seleccione Distrito —</option>
                                        {filteredDepartamentos.map(d => (
                                            <option key={d.id} value={d.id}>{d.nombre}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Nivel */}
                        <div>
                            <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5" />
                                Nivel
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
                                    value={selectedNivelId}
                                    onChange={(e) => handleNivelChange(e.target.value)}
                                    disabled={!selectedProvinciaId}
                                >
                                    <option value="">— Todos los Niveles —</option>
                                    {niveles.map(n => (
                                        <option key={n.id} value={n.id}>{n.nombre}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Sector */}
                        <div>
                            <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                Sector
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
                                    value={selectedSectorId}
                                    onChange={(e) => handleSectorChange(e.target.value)}
                                    disabled={!selectedProvinciaId}
                                >
                                    <option value="">— Todos los Sectores —</option>
                                    {sectores.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Escuela select (grande y central) */}
                    <div className="border-t pt-4">
                        <SearchableSelect
                            options={escuelaOptions}
                            value={escuelaId ?? ''}
                            onChange={handleEscuelaSelect}
                            placeholder={
                                isLoadingGeografia || isLoadingEscuelas 
                                    ? 'Cargando instituciones...' 
                                    : !selectedProvinciaId
                                    ? '— Seleccione una Provincia primero —'
                                    : escuelas.length === 0
                                    ? 'No hay escuelas con los filtros seleccionados'
                                    : 'Escriba para buscar la institución...'
                            }
                            disabled={!selectedProvinciaId || isLoadingGeografia || isLoadingEscuelas}
                            label={(
                                <>
                                    <Building2 className="inline w-4 h-4 mr-1 text-secondary-400" />
                                    Institución Educativa
                                </>
                            )}
                        />
                    </div>
                </div>
            )}

            {/* Buscador y Filtros (solo si hay escuela seleccionada) */}
            {escuelaId && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
                    <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                                <Search className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o DNI..."
                                className="w-full pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <select
                                className="px-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold min-w-[180px]"
                                value={relacionFilter}
                                onChange={(e) => setRelacionFilter(e.target.value)}
                            >
                                <option value="">Todas las relaciones</option>
                                <option value="ESTUDIANTE">ESTUDIANTES</option>
                                <option value="DOCENTE">DOCENTES</option>
                                <option value="AUXILIAR">AUXILIARES</option>
                                <option value="ADMINISTRATIVO">ADMINISTRATIVOS</option>
                                <option value="PADRE">PADRES</option>
                                <option value="MADRE">MADRES</option>
                                <option value="TUTOR">TUTORES</option>
                            </select>

                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
                            >
                                Buscar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Placeholder cuando Jefatura aún no eligió escuela */}
            {modoJefatura && !escuelaId && (
                <div className="p-16 text-center bg-white rounded-2xl border border-secondary-200 shadow-sm">
                    <Building2 className="w-14 h-14 text-secondary-300 mx-auto mb-4" />
                    <p className="text-secondary-500 font-bold italic">
                        Seleccione una institución en los selectores de arriba para visualizar su comunidad educativa.
                    </p>
                </div>
            )}

            {/* Listado */}
            {escuelaId && (
                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-secondary-500 font-medium italic">Cargando comunidad...</p>
                        </div>
                    ) : personas.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Apellido y Nombre</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Documento</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Relación</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {personas.map((persona) => (
                                        <tr key={persona.id} className="hover:bg-secondary-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold border border-primary-100 shadow-sm">
                                                        {persona.apellido.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-secondary-900 uppercase">{persona.apellido}</p>
                                                        <p className="text-xs text-secondary-500 font-bold uppercase">{persona.nombre}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-secondary-700 bg-secondary-100 px-2 py-1 rounded">
                                                    {persona.documento_tipo_nombre} {persona.documento_numero}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {persona.relaciones && persona.relaciones.length > 0 ? (
                                                        persona.relaciones.map((rel, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
                                                                    rel.includes('ESTUDIANTE')
                                                                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                                        : rel.includes('DOCENTE')
                                                                        ? 'bg-primary-50 text-primary-700 border-primary-100'
                                                                        : 'bg-green-50 text-green-700 border-green-100'
                                                                }`}
                                                            >
                                                                {rel}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-secondary-50 text-secondary-500 text-[10px] font-black uppercase rounded border border-secondary-100">
                                                            Sin definir
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleViewPersona(persona.id)}
                                                    className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Ver Ficha"
                                                    disabled={isFetchingDetails}
                                                >
                                                    {isFetchingDetails
                                                        ? <Loader2 className="w-5 h-5 animate-spin" />
                                                        : <Eye className="w-5 h-5" />
                                                    }
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-20 text-center text-secondary-500 font-bold italic">
                            No se encontraron miembros vinculados en la comunidad educativa.
                        </div>
                    )}

                    {/* Paginación */}
                    {pagination.last_page > 1 && (
                        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
                            <p className="text-xs text-secondary-500 font-bold">Total: {pagination.total} personas</p>
                            <div className="flex gap-2">
                                <button
                                    disabled={pagination.current_page === 1}
                                    onClick={() => fetchComunidad(pagination.current_page - 1)}
                                    className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                                >
                                    Anterior
                                </button>
                                <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                                    Página {pagination.current_page} de {pagination.last_page}
                                </span>
                                <button
                                    disabled={pagination.current_page === pagination.last_page}
                                    onClick={() => fetchComunidad(pagination.current_page + 1)}
                                    className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL DE DETALLES */}
            {isDetailsModalOpen && selectedPersona && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                            <div>
                                <h2 className="text-xl font-black text-secondary-900 uppercase">
                                    Ficha del Miembro
                                </h2>
                                <p className="text-xs text-secondary-500 font-bold tracking-widest mt-0.5 uppercase">
                                    Comunidad Educativa: {escuelaNombre}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="text-secondary-400 hover:text-secondary-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-8 space-y-8">
                            {/* Información de Identidad */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Apellido y Nombre</p>
                                    <p className="text-lg font-black text-secondary-900 uppercase">{selectedPersona.nombre_completo}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">CUIL</p>
                                    <p className="text-lg font-bold text-primary-600 tracking-wider">{selectedPersona.cuil}</p>
                                </div>
                                <div className="space-y-0.5 pt-3 border-t border-secondary-200">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Documento</p>
                                    <p className="text-sm font-bold text-secondary-900">
                                        {selectedPersona.documento_tipo_nombre}: {selectedPersona.documento_numero}
                                    </p>
                                </div>
                                <div className="space-y-0.5 pt-3 border-t border-secondary-200">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Contacto</p>
                                    <p className="text-sm font-bold text-secondary-900">
                                        {selectedPersona.contacto?.email || 'Sin email registrado'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-indigo-500 mt-1" />
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Teléfono</p>
                                        <p className="text-sm font-bold text-indigo-900">
                                            {selectedPersona.contacto?.telefono || 'Sin teléfono'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

//     return (
//         <div className="space-y-6 animate-fadeIn">
//             {/* Encabezado */}
//             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//                 <div>
//                     <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
//                         Comunidad Educativa
//                     </h1>
//                     <p className="text-secondary-500 mt-1 font-medium italic">
//                         {escuelaNombre
//                             ? `Personas vinculadas a ${escuelaNombre}`
//                             : 'Seleccione una institución para comenzar'}
//                     </p>
//                 </div>
//                 {escuelaId && (
//                     <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-2xl">
//                         <Users className="w-5 h-5 text-primary-600" />
//                         <span className="text-sm font-black text-primary-700 uppercase tracking-tighter">
//                             {pagination.total} Miembros vinculados
//                         </span>
//                     </div>
//                 )}
//             </div>

//             {/* Selector de Escuela Jerárquico (solo Jefatura) */}
//             {modoJefatura && (
//                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200 space-y-4">
//                     <h2 className="text-sm font-black text-secondary-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
//                         <MapPin className="w-4 h-4 text-primary-500" />
//                         Filtros de Búsqueda de Institución
//                     </h2>

//                     {/* Búsqueda Directa por CUE */}
//                     <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100 flex flex-col sm:flex-row items-end gap-3 justify-start">
//                         <div className="w-full sm:w-64">
//                             <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
//                                 <Search className="w-3.5 h-3.5 text-secondary-400" />
//                                 Búsqueda directa por CUE
//                             </label>
//                             <input
//                                 type="text"
//                                 placeholder="CUE / Anexo (ej. 300123400)"
//                                 className="w-full px-4 py-2 bg-white border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold"
//                                 value={cueSearch}
//                                 onChange={(e) => setCueSearch(e.target.value)}
//                                 onKeyDown={(e) => e.key === 'Enter' && handleCueSearch()}
//                             />
//                         </div>
//                         <button
//                             type="button"
//                             onClick={handleCueSearch}
//                             className="w-full sm:w-auto px-5 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2"
//                         >
//                             <Search className="w-4 h-4" />
//                             Buscar CUE
//                         </button>
//                     </div>
                    
//                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
//                         {/* Provincia (solo superuser) */}
//                         {isSuperUser && (
//                             <div>
//                                 <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5">
//                                     Provincia
//                                 </label>
//                                 <div className="relative">
//                                     <select
//                                         className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
//                                         value={selectedProvinciaId}
//                                         onChange={(e) => handleProvinciaChange(e.target.value)}
//                                         disabled={isLoadingGeografia}
//                                     >
//                                         <option value="">— Seleccione Provincia —</option>
//                                         {provincias.map(p => (
//                                             <option key={p.id} value={p.id}>{p.nombre}</option>
//                                         ))}
//                                     </select>
//                                     <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
//                                 </div>
//                             </div>
//                         )}

//                         {/* Región (superuser, provincial) */}
//                         {(isSuperUser || isJefeProvincial) && (
//                             <div className="w-full sm:max-w-[140px]">
//                                 <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5">
//                                     Región
//                                 </label>
//                                 <div className="relative">
//                                     <select
//                                         className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
//                                         value={selectedRegionId}
//                                         onChange={(e) => handleRegionChange(e.target.value)}
//                                         disabled={(!selectedProvinciaId && isSuperUser) || isLoadingGeografia}
//                                     >
//                                         <option value="">— Todas las Regiones —</option>
//                                         {regiones.map(r => (
//                                             <option key={r.id} value={r.id}>Región {r.numero}</option>
//                                         ))}
//                                     </select>
//                                     <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
//                                 </div>
//                             </div>
//                         )}

//                         {/* Distrito / Departamento (superuser, provincial, regional) */}
//                         {(isSuperUser || isJefeProvincial || isJefeRegional) && (
//                             <div className="col-span-1 md:col-span-2">
//                                 <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5">
//                                     Distrito / Departamento
//                                 </label>
//                                 <div className="relative">
//                                     <select
//                                         className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
//                                         value={selectedDepartamentoId}
//                                         onChange={(e) => handleDistritoChange(e.target.value)}
//                                         disabled={(!selectedProvinciaId && isSuperUser) || isLoadingGeografia}
//                                     >
//                                         <option value="">— Seleccione Distrito —</option>
//                                         {filteredDepartamentos.map(d => (
//                                             <option key={d.id} value={d.id}>{d.nombre}</option>
//                                         ))}
//                                     </select>
//                                     <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
//                                 </div>
//                             </div>
//                         )}

//                         {/* Nivel */}
//                         <div>
//                             <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
//                                 <Layers className="w-3.5 h-3.5" />
//                                 Nivel
//                             </label>
//                             <div className="relative">
//                                 <select
//                                     className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
//                                     value={selectedNivelId}
//                                     onChange={(e) => handleNivelChange(e.target.value)}
//                                     disabled={!selectedProvinciaId}
//                                 >
//                                     <option value="">— Todos los Niveles —</option>
//                                     {niveles.map(n => (
//                                         <option key={n.id} value={n.id}>{n.nombre}</option>
//                                     ))}
//                                 </select>
//                                 <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
//                             </div>
//                         </div>

//                         {/* Sector */}
//                         <div>
//                             <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
//                                 <Shield className="w-3.5 h-3.5" />
//                                 Sector
//                             </label>
//                             <div className="relative">
//                                 <select
//                                     className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold appearance-none pr-8"
//                                     value={selectedSectorId}
//                                     onChange={(e) => handleSectorChange(e.target.value)}
//                                     disabled={!selectedProvinciaId}
//                                 >
//                                     <option value="">— Todos los Sectores —</option>
//                                     {sectores.map(s => (
//                                         <option key={s.id} value={s.id}>{s.nombre}</option>
//                                     ))}
//                                 </select>
//                                 <ChevronDown className="absolute right-2.5 top-3.5 w-4 h-4 text-secondary-400 pointer-events-none" />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Escuela select (grande y central) */}
//                     <div className="border-t pt-4">
//                         <SearchableSelect
//                             options={escuelaOptions}
//                             value={escuelaId ?? ''}
//                             onChange={handleEscuelaSelect}
//                             placeholder={
//                                 isLoadingGeografia || isLoadingEscuelas 
//                                     ? 'Cargando instituciones...' 
//                                     : !selectedProvinciaId
//                                     ? '— Seleccione una Provincia primero —'
//                                     : escuelas.length === 0
//                                     ? 'No hay escuelas con los filtros seleccionados'
//                                     : 'Escriba para buscar la institución...'
//                             }
//                             disabled={!selectedProvinciaId || isLoadingGeografia || isLoadingEscuelas}
//                             label={(
//                                 <>
//                                     <Building2 className="inline w-4 h-4 mr-1 text-secondary-400" />
//                                     Institución Educativa
//                                 </>
//                             )}
//                         />
//                     </div>
//                 </div>
//             )}

//             {/* Buscador y Filtros (solo si hay escuela seleccionada) */}
//             {escuelaId && (
//                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
//                     <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
//                         <div className="relative flex-1">
//                             <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
//                                 <Search className="w-5 h-5" />
//                             </span>
//                             <input
//                                 type="text"
//                                 placeholder="Buscar por nombre o DNI..."
//                                 className="w-full pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold"
//                                 value={searchTerm}
//                                 onChange={(e) => setSearchTerm(e.target.value)}
//                             />
//                         </div>

//                         <div className="flex gap-3">
//                             <select
//                                 className="px-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold min-w-[180px]"
//                                 value={relacionFilter}
//                                 onChange={(e) => setRelacionFilter(e.target.value)}
//                             >
//                                 <option value="">Todas las relaciones</option>
//                                 <option value="ESTUDIANTE">ESTUDIANTES</option>
//                                 <option value="DOCENTE">DOCENTES</option>
//                                 <option value="AUXILIAR">AUXILIARES</option>
//                                 <option value="ADMINISTRATIVO">ADMINISTRATIVOS</option>
//                                 <option value="PADRE">PADRES</option>
//                                 <option value="MADRE">MADRES</option>
//                                 <option value="TUTOR">TUTORES</option>
//                             </select>

//                             <button
//                                 type="submit"
//                                 className="px-6 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
//                             >
//                                 Buscar
//                             </button>
//                         </div>
//                     </form>
//                 </div>
//             )}

//             {/* Placeholder cuando Jefatura aún no eligió escuela */}
//             {modoJefatura && !escuelaId && (
//                 <div className="p-16 text-center bg-white rounded-2xl border border-secondary-200 shadow-sm">
//                     <Building2 className="w-14 h-14 text-secondary-300 mx-auto mb-4" />
//                     <p className="text-secondary-500 font-bold italic">
//                         Seleccione una institución en los selectores de arriba para visualizar su comunidad educativa.
//                     </p>
//                 </div>
//             )}

//             {/* Listado */}
//             {escuelaId && (
//                 <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
//                     {isLoading ? (
//                         <div className="p-20 flex flex-col items-center justify-center">
//                             <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
//                             <p className="text-secondary-500 font-medium italic">Cargando comunidad...</p>
//                         </div>
//                     ) : personas.length > 0 ? (
//                         <div className="overflow-x-auto">
//                             <table className="w-full text-left">
//                                 <thead className="bg-secondary-50 border-b border-secondary-200">
//                                     <tr>
//                                         <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Apellido y Nombre</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Documento</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Relación</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-secondary-100">
//                                     {personas.map((persona) => (
//                                         <tr key={persona.id} className="hover:bg-secondary-50 transition-colors">
//                                             <td className="px-6 py-4">
//                                                 <div className="flex items-center gap-3">
//                                                     <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold border border-primary-100 shadow-sm">
//                                                         {persona.apellido.charAt(0).toUpperCase()}
//                                                     </div>
//                                                     <div>
//                                                         <p className="text-sm font-black text-secondary-900 uppercase">{persona.apellido}</p>
//                                                         <p className="text-xs text-secondary-500 font-bold uppercase">{persona.nombre}</p>
//                                                     </div>
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4">
//                                                 <span className="text-xs font-bold text-secondary-700 bg-secondary-100 px-2 py-1 rounded">
//                                                     {persona.documento_tipo_nombre} {persona.documento_numero}
//                                                 </span>
//                                             </td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex flex-wrap gap-1">
//                                                     {persona.relaciones && persona.relaciones.length > 0 ? (
//                                                         persona.relaciones.map((rel, idx) => (
//                                                             <span
//                                                                 key={idx}
//                                                                 className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
//                                                                     rel.includes('ESTUDIANTE')
//                                                                         ? 'bg-blue-50 text-blue-700 border-blue-100'
//                                                                         : rel.includes('DOCENTE')
//                                                                         ? 'bg-primary-50 text-primary-700 border-primary-100'
//                                                                         : 'bg-green-50 text-green-700 border-green-100'
//                                                                 }`}
//                                                             >
//                                                                 {rel}
//                                                             </span>
//                                                         ))
//                                                     ) : (
//                                                         <span className="px-2 py-0.5 bg-secondary-50 text-secondary-500 text-[10px] font-black uppercase rounded border border-secondary-100">
//                                                             Sin definir
//                                                         </span>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 text-right">
//                                                 <button
//                                                     onClick={() => handleViewPersona(persona.id)}
//                                                     className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
//                                                     title="Ver Ficha"
//                                                     disabled={isFetchingDetails}
//                                                 >
//                                                     {isFetchingDetails
//                                                         ? <Loader2 className="w-5 h-5 animate-spin" />
//                                                         : <Eye className="w-5 h-5" />
//                                                     }
//                                                 </button>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     ) : (
//                         <div className="p-20 text-center text-secondary-500 font-bold italic">
//                             No se encontraron miembros vinculados en la comunidad educativa.
//                         </div>
//                     )}

//                     {/* Paginación */}
//                     {pagination.last_page > 1 && (
//                         <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
//                             <p className="text-xs text-secondary-500 font-bold">Total: {pagination.total} personas</p>
//                             <div className="flex gap-2">
//                                 <button
//                                     disabled={pagination.current_page === 1}
//                                     onClick={() => fetchComunidad(pagination.current_page - 1)}
//                                     className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
//                                 >
//                                     Anterior
//                                 </button>
//                                 <span className="px-3 py-1 text-xs font-bold text-secondary-700">
//                                     Página {pagination.current_page} de {pagination.last_page}
//                                 </span>
//                                 <button
//                                     disabled={pagination.current_page === pagination.last_page}
//                                     onClick={() => fetchComunidad(pagination.current_page + 1)}
//                                     className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
//                                 >
//                                     Siguiente
//                                 </button>
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* MODAL DE DETALLES */}
//             {isDetailsModalOpen && selectedPersona && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
//                     <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
//                         <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
//                             <div>
//                                 <h2 className="text-xl font-black text-secondary-900 uppercase">
//                                     Ficha del Miembro
//                                 </h2>
//                                 <p className="text-xs text-secondary-500 font-bold tracking-widest mt-0.5 uppercase">
//                                     Comunidad Educativa: {escuelaNombre}
//                                 </p>
//                             </div>
//                             <button
//                                 onClick={() => setIsDetailsModalOpen(false)}
//                                 className="text-secondary-400 hover:text-secondary-600 transition-colors"
//                             >
//                                 <X className="w-6 h-6" />
//                             </button>
//                         </div>

//                         <div className="overflow-y-auto flex-1 p-8 space-y-8">
//                             {/* Información de Identidad */}
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
//                                 <div className="space-y-0.5">
//                                     <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Apellido y Nombre</p>
//                                     <p className="text-lg font-black text-secondary-900 uppercase">{selectedPersona.nombre_completo}</p>
//                                 </div>
//                                 <div className="space-y-0.5">
//                                     <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">CUIL</p>
//                                     <p className="text-lg font-bold text-primary-600 tracking-wider">{selectedPersona.cuil}</p>
//                                 </div>
//                                 <div className="space-y-0.5 pt-3 border-t border-secondary-200">
//                                     <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Documento</p>
//                                     <p className="text-sm font-bold text-secondary-900">
//                                         {selectedPersona.documento_tipo_nombre}: {selectedPersona.documento_numero}
//                                     </p>
//                                 </div>
//                                 <div className="space-y-0.5 pt-3 border-t border-secondary-200">
//                                     <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Contacto</p>
//                                     <p className="text-sm font-bold text-secondary-900">
//                                         {selectedPersona.contacto?.email || 'Sin email registrado'}
//                                     </p>
//                                 </div>
//                             </div>

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                 <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
//                                     <Phone className="w-5 h-5 text-indigo-500 mt-1" />
//                                     <div>
//                                         <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Teléfonos</p>
//                                         <p className="text-sm font-bold text-secondary-900 mt-1">
//                                             {selectedPersona.contacto?.telefono_movil || 'S/D'}
//                                         </p>
//                                     </div>
//                                 </div>
//                                 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
//                                     <Home className="w-5 h-5 text-amber-500 mt-1" />
//                                     <div>
//                                         <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Domicilio</p>
//                                         <p className="text-sm font-bold text-secondary-900 mt-1">
//                                             {selectedPersona.domicilio?.calle} {selectedPersona.domicilio?.numero}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="p-6 bg-secondary-50 border-t border-secondary-100">
//                             <button
//                                 onClick={() => setIsDetailsModalOpen(false)}
//                                 className="w-full py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all"
//                             >
//                                 Cerrar Ficha
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }
