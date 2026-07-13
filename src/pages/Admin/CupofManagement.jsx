import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import cupofService from '../../services/cupofService';
import personaService from '../../services/personaService';
import escuelaService from '../../services/escuelaService';
import cargoService from '../../services/cargoService';
import escalafonService from '../../services/escalafonService';
import puestoTipoService from '../../services/puestoTipoService';
import geografiaService from '../../services/geografiaService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Gestión de la Planta Orgánica Funcional (POF) - CUPOF y Padrón de Personas.
 * Exclusivo para Superusuarios y Supervisores Curriculares.
 */
const CupofManagement = () => {
    const { user, showNotification, activeProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('pof'); // 'pof' | 'personas'
    
    // Roles del usuario
    const isSuperUser = user?.roles?.some(r => r.name === 'superuser');
    const isJefeProvincial = user?.roles?.some(r => r.name === 'jefe_provincial');
    const isJefeRegional = user?.roles?.some(r => r.name === 'jefe_regional');
    const isJefeDistrital = user?.roles?.some(r => r.name === 'jefe_distrital');
    const isConduccion = ['director', 'vicedirector', 'secretario', 'prosecretario'].includes(activeProfile?.role?.name);

    // SEGÚN POLÍTICAS: Solo Superuser, Equipo de Conducción y Jefes Distritales tienen acceso.
    const hasAccess = isSuperUser || isConduccion || isJefeDistrital;

    // Función auxiliar para determinar si un cargo es jerárquico
    const isHierarchicalCargo = (nombreCargo) => {
        if (!nombreCargo) return false;
        const cargo = nombreCargo.toLowerCase();
        return ['director', 'vicedirector', 'secretario', 'prosecretario'].some(r => cargo.includes(r));
    };

    // Determina si el usuario actual puede gestionar un CUPOF específico
    const canManageCupof = (cupof) => {
        if (isSuperUser) return true;
        const hierarchical = isHierarchicalCargo(cupof.nombre_cargo);
        // Jefe Distrital: Solo puede gestionar cargos jerárquicos
        if (isJefeDistrital) return hierarchical;
        // Equipo de Conducción ahora puede gestionar TODO en su escuela (jerárquico y operativo)
        if (isConduccion) return true;
        return false;
    };

    // Estados para CUPOF (POF)
    const [cupofs, setCupofs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        escuela_id: activeProfile?.escuela_id || '',
        estado_cupof: '',
        escalafon_id: '',
        search: '',
        localidad_id: '',
        nivel_id: '',
        sector_id: '',
        numero: '',
        school_name: ''
    });
    const [filterLocalidades, setFilterLocalidades] = useState([]);

    // Estados para Padrón de Personas
    const [personas, setPersonas] = useState([]);
    const [isPersonasLoading, setIsPersonasLoading] = useState(false);
    const [personaSearch, setPersonaSearch] = useState('');

    // Nuevos estados para la búsqueda en el modal de asignación
    const [assignSearchResults, setAssignSearchResults] = useState([]);
    const [isSearchingPersona, setIsSearchingPersona] = useState(false);

    // Catálogos
    const [escuelas, setEscuelas] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [escalafones, setEscalafones] = useState([]);
    const [puestoTipos, setPuestoTipos] = useState([]);
    const [cueSearch, setCueSearch] = useState('');
    const [foundEscuela, setFoundEscuela] = useState(null);
    const [isSearchingEscuela, setIsSearchingEscuela] = useState(false);

    // Estados para Modales
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [showEscuelaList, setShowEscuelaList] = useState(false);

    // Estados para el selector geográfico del modal (Región → Departamento → Localidad → Escuela)
    const [modalRegiones, setModalRegiones] = useState([]);
    const [modalDepartamentos, setModalDepartamentos] = useState([]);
    const [modalLocalidades, setModalLocalidades] = useState([]);
    const [modalEscuelasFiltradas, setModalEscuelasFiltradas] = useState([]);
    const [modalFiltro, setModalFiltro] = useState({ region_id: '', departamento_id: '', localidad_id: '', nivel_id: '', sector_id: '', numero: '', nombre: '' });
    const [isLoadingModalEscuelas, setIsLoadingModalEscuelas] = useState(false);
    const [selectedCupof, setSelectedCupof] = useState(null);
    const [niveles, setNiveles] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [formData, setFormData] = useState({
        codigo_cupof: '',
        escuela_id: '',
        escalafon_id: '',
        puesto_tipo_id: '',
        nombre_cargo: '',
        asignatura_id: '',
        cantidad: 1
    });

    const [assignData, setAssignData] = useState({
        persona_id: '',
        situacion_revista: 'provisional',
        fecha_inicio: new Date().toISOString().split('T')[0],
        resolucion: ''
    });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'primary',
        showInput: false,
        isLoading: false
    });

    const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

    // --- CARGA DE DATOS ---

    const fetchCupofs = async () => {
        try {
            setIsLoading(true);
            const data = await cupofService.getAll(filters);
            setCupofs(data);
        } catch (error) {
            showNotification('Error al cargar la planta funcional.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPersonas = async () => {
        try {
            setIsPersonasLoading(true);
            const response = await personaService.getAll({ 
                search: personaSearch,
                only_agents: true, // IMPORTANT: Only people with CUPOF positions
                escuela_id: filters.escuela_id // Reuse the school filter from the main component
            });
            setPersonas(response.data || []);
        } catch (error) {
            showNotification('Error al cargar el padrón de personas.', 'error');
        } finally {
            setIsPersonasLoading(false);
        }
    };

    const searchPersonaForAssign = async () => {
        if (!personaSearch || personaSearch.length < 3) {
            showNotification('Ingrese al menos 3 caracteres para buscar.', 'warning');
            return;
        }
        try {
            setIsSearchingPersona(true);
            const response = await personaService.getAll({ search: personaSearch });
            setAssignSearchResults(response.data || []);
            if (response.data && response.data.length === 0) {
                showNotification('No se encontraron personas con ese criterio.', 'info');
            }
        } catch (error) {
            showNotification('Error al buscar persona en el padrón.', 'error');
        } finally {
            setIsSearchingPersona(false);
        }
    };

    const fetchEscuelas = async () => {
        try {
            const filters = {};
            if (isJefeDistrital && !isSuperUser) {
                const distId = user?.distrito_usuario?.departamento_id || user?.distritoUsuario?.departamento_id;
                if (distId) filters.departamento_id = distId;
            }
            const data = await escuelaService.search('', filters);
            setEscuelas(data || []);
        } catch (error) {
            console.error('Error al cargar escuelas');
        }
    };

    const fetchCargos = async () => {
        try {
            const data = await cargoService.getAll();
            setCargos(data);
        } catch (error) {
            console.error('Error al cargar cargos');
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [eRes, pRes, nRes, sRes] = await Promise.all([
                escalafonService.getAll(),
                puestoTipoService.getAll(),
                escuelaService.getNiveles(),
                escuelaService.getSectores()
            ]);
            setEscalafones(eRes || []);
            setPuestoTipos(pRes || []);
            setNiveles(nRes || []);
            setSectores(sRes || []);
        } catch (error) {
            console.error('Error al cargar catálogos de escalafón/puesto/niveles/sectores', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });
        }
    };

    // --- EFECTOS ---

    // Carga de catálogos iniciales
    useEffect(() => {
        if (user && hasAccess) {
            fetchEscuelas();
            fetchCargos();
            fetchCatalogs();
        }
    }, [user, hasAccess]);

    // Carga de localidades para el filtro de la página principal del Jefe Distrital
    useEffect(() => {
        if (isJefeDistrital && user) {
            const distId = user?.distrito_usuario?.departamento_id || user?.distritoUsuario?.departamento_id;
            if (distId) {
                geografiaService.getLocalidades(distId)
                    .then(data => setFilterLocalidades(Array.isArray(data) ? data : (data?.data || [])))
                    .catch(() => setFilterLocalidades([]));
            }
        }
    }, [user, isJefeDistrital]);

    // Carga de regiones para el selector del modal (solo cuando se abre en modo listado)
    useEffect(() => {
        if (!showEscuelaList || !isCreateModalOpen) return;
        
        if (isJefeDistrital && !isSuperUser) {
            const distId = user?.distrito_usuario?.departamento_id || user?.distritoUsuario?.departamento_id;
            if (distId) {
                setModalFiltro(prev => ({ ...prev, departamento_id: distId, region_id: '', localidad_id: '', nivel_id: '', sector_id: '', numero: '' }));
            }
            return;
        }

        geografiaService.getRegiones()
            .then(data => setModalRegiones(Array.isArray(data) ? data : (data?.data || [])))
            .catch(() => {});
    }, [showEscuelaList, isCreateModalOpen, isJefeDistrital, isSuperUser, user]);

    // Efecto: al cambiar región, carga departamentos de esa región
    useEffect(() => {
        setModalDepartamentos([]);
        setModalLocalidades([]);
        setModalFiltro(prev => ({ ...prev, departamento_id: '', localidad_id: '' }));
        if (!modalFiltro.region_id) return;
        geografiaService.getDepartamentos(null, { region_id: modalFiltro.region_id })
            .then(data => setModalDepartamentos(Array.isArray(data) ? data : (data?.data || [])))
            .catch(() => setModalDepartamentos([]));
    }, [modalFiltro.region_id]);

    // Efecto: al cambiar departamento, carga localidades de ese departamento
    useEffect(() => {
        setModalLocalidades([]);
        setModalFiltro(prev => ({ ...prev, localidad_id: '' }));
        if (!modalFiltro.departamento_id) return;
        geografiaService.getLocalidades(modalFiltro.departamento_id)
            .then(data => setModalLocalidades(Array.isArray(data) ? data : (data?.data || [])))
            .catch(() => setModalLocalidades([]));
    }, [modalFiltro.departamento_id]);

    // Efecto: al cambiar localidad, departamento o nombre → carga escuelas filtradas
    useEffect(() => {
        if (!showEscuelaList || !isCreateModalOpen) return;

        const fetchModalEscuelas = async () => {
            setIsLoadingModalEscuelas(true);
            try {
                const distId = user?.distrito_usuario?.departamento_id || user?.distritoUsuario?.departamento_id;
                const params = {
                    search: modalFiltro.nombre || undefined,
                    localidad_id: modalFiltro.localidad_id || undefined,
                    nivel_id: modalFiltro.nivel_id || undefined,
                    sector_id: modalFiltro.sector_id || undefined,
                    numero: modalFiltro.numero || undefined,
                    // Si hay departamento seleccionado y no hay localidad, filtra por departamento
                    ...(!modalFiltro.localidad_id && modalFiltro.departamento_id ? { departamento_id: modalFiltro.departamento_id } : {}),
                    // Para Jefe Distrital, siempre restringe al departamento de su distrito
                    ...(isJefeDistrital && !isSuperUser && distId && !modalFiltro.departamento_id ? { departamento_id: distId } : {}),
                };
                const data = await escuelaService.search('', params);
                setModalEscuelasFiltradas(Array.isArray(data) ? data : (data?.data || []));
            } catch {
                setModalEscuelasFiltradas([]);
            } finally {
                setIsLoadingModalEscuelas(false);
            }
        };

        const timer = setTimeout(fetchModalEscuelas, 350);
        return () => clearTimeout(timer);
    }, [modalFiltro.localidad_id, modalFiltro.departamento_id, modalFiltro.nivel_id, modalFiltro.sector_id, modalFiltro.numero, modalFiltro.nombre, showEscuelaList, isCreateModalOpen]);

    // Búsqueda de escuela específica por CUE para el Modal
    useEffect(() => {
        const searchEscuelaByCue = async () => {
            if (!hasAccess || cueSearch.length < 7) {
                setFoundEscuela(null);
                setFormData(prev => ({ ...prev, escuela_id: '' }));
                return;
            }

            try {
                setIsSearchingEscuela(true);
                const searchFilters = {};
                if (isJefeDistrital && !isSuperUser) {
                    const distId = user?.distrito_usuario?.departamento_id || user?.distritoUsuario?.departamento_id;
                    if (distId) searchFilters.departamento_id = distId;
                }
                const data = await escuelaService.search(cueSearch, searchFilters);
                // La respuesta ya es el array de escuelas según escuelaService.js
                const match = data?.find(e => e.cue_anexo === cueSearch) || data?.[0];
                
                if (match) {
                    setFoundEscuela(match);
                    setFormData(prev => ({ ...prev, escuela_id: match.id }));
                } else {
                    setFoundEscuela(null);
                    setFormData(prev => ({ ...prev, escuela_id: '' }));
                }
            } catch (error) {
                console.error('Error buscando escuela por CUE');
            } finally {
                setIsSearchingEscuela(false);
            }
        };

        const timer = setTimeout(searchEscuelaByCue, 500);
        return () => clearTimeout(timer);
    }, [cueSearch, hasAccess]);

    // Recargar datos principales al cambiar filtros o tab
    useEffect(() => {
        if (!hasAccess) return;
        if (activeTab === 'pof') fetchCupofs();
        if (activeTab === 'personas') fetchPersonas();
    }, [activeTab, filters.escuela_id, filters.estado_cupof, filters.escalafon_id, filters.localidad_id, filters.nivel_id, filters.sector_id, filters.numero, filters.school_name, hasAccess]);

    if (!hasAccess) {
        return (
            <main className="flex-grow p-8 overflow-y-auto bg-secondary-50/30">
                <div className="p-10 text-center bg-white rounded-3xl border border-secondary-200 shadow-sm animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info w-12 h-12 text-primary-500 mx-auto mb-4" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                    <h2 className="text-xl font-black text-secondary-900 uppercase">Perfil Institucional Requerido</h2>
                    <p className="text-secondary-500 mt-2 font-medium">Debe seleccionar una institución para visualizar su planta funcional.</p>
                </div>
            </main>
        );
    }

    // --- ACCIONES ---

    const handleCreateCupof = async (e) => {
        e.preventDefault();
        try {
            await cupofService.create(formData);
            showNotification('Puesto CUPOF creado con éxito.', 'success');
            setIsCreateModalOpen(false);
            fetchCupofs();
        } catch (error) {
            showNotification(parseError(error, 'Error al crear el puesto.'), 'error');
        }
    };

    const handleAssignPersona = async (e) => {
        e.preventDefault();
        try {
            const response = await cupofService.assign(selectedCupof.id, assignData);
            showNotification('Persona asignada exitosamente al puesto.', 'success');

            if (response.warning) {
                showNotification(response.warning, 'warning', 8000);
            }

            setIsAssignModalOpen(false);
            fetchCupofs();
        } catch (error) {
            showNotification(parseError(error, 'Error al asignar persona.'), 'error');
        }
    };

    const handleReleaseCupof = (cupof, isClosure = false) => {
        setConfirmConfig({
            isOpen: true,
            title: isClosure ? 'Dar de Baja Puesto' : 'Liberar Puesto',
            message: isClosure 
                ? '¿Confirmas el cierre definitivo de este CUPOF? Esta acción es por cierre de sección.'
                : '¿Confirmas la liberación del puesto? El ocupante actual dejará de ocuparlo.',
            variant: isClosure ? 'danger' : 'warning',
            showInput: isClosure,
            onConfirm: async (motivo) => {
                try {
                    setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                    await cupofService.release(cupof.id, { motivo_baja: isClosure ? (motivo || 'Cierre de Sección') : null });
                    showNotification(isClosure ? 'Puesto dado de baja.' : 'Puesto liberado.', 'success');
                    fetchCupofs();
                    closeConfirm();
                } catch (error) {
                    showNotification('Error al procesar la solicitud.', 'error');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Gestión CUPOF</h1>
                    <p className="text-secondary-500 mt-1 font-medium italic">
                        {isSuperUser ? 'Administración global de la Planta Orgánica Funcional (POF)' : 
                         isJefeDistrital ? 'Gestión de Equipos de Conducción - Ámbito Distrital' :
                         'Administración de la Planta Funcional de su Institución'}
                    </p>
                </div>
                {(isConduccion || isSuperUser || isJefeDistrital) && (
                    <button 
                        onClick={() => {
                            const initialEscuelaId = isConduccion ? (activeProfile?.escuela_id || '') : '';
                            setFormData({
                                codigo_cupof: '',
                                escuela_id: initialEscuelaId,
                                escalafon_id: '',
                                puesto_tipo_id: '',
                                nombre_cargo: '',
                                asignatura_id: '',
                                cantidad: 1
                            });
                            
                            // If it's conduction, try to find and set the school details
                            if (isConduccion && activeProfile?.escuela_id) {
                                const myEsc = escuelas.find(e => e.id === activeProfile.escuela_id);
                                if (myEsc) {
                                    setFoundEscuela(myEsc);
                                    setCueSearch(myEsc.cue_anexo);
                                } else {
                                    // If not in the pre-loaded list, clear them but keep the ID
                                    setFoundEscuela(null);
                                    setCueSearch('');
                                }
                            } else {
                                setCueSearch('');
                                setFoundEscuela(null);
                            }
                            
                            // Reset modal filters
                            setModalFiltro({ region_id: '', departamento_id: '', localidad_id: '', nivel_id: '', sector_id: '', numero: '', nombre: '' });
                            setModalDepartamentos([]);
                            setModalLocalidades([]);
                            setModalEscuelasFiltradas([]);

                            setShowEscuelaList(false);
                            setIsCreateModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Puesto
                    </button>
                )}
            </div>

            {/* Selector de Pestañas */}
            <div className="flex gap-2 p-1 bg-secondary-100 rounded-2xl w-full md:w-fit">
                <button
                    onClick={() => setActiveTab('pof')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'pof' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                    }`}
                >
                    {isJefeDistrital ? 'Cargos de Conducción' : isSuperUser ? 'Planta General' : 'Planta Funcional (POF)'}
                </button>
                <button
                    onClick={() => setActiveTab('personas')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'personas' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                    }`}
                >
                    Padrón de Agentes
                </button>
            </div>

            {/* Listado de POF */}
            {activeTab === 'pof' && (
                <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
                    {/* Filtros */}
                    <div className="p-6 border-b border-secondary-100 bg-secondary-50/50 space-y-3">
                        {/* Fila 1: filtros rápidos */}
                        <div className="flex flex-wrap gap-3">
                            {/* Selector de escuela: solo para isSuperUser (no Jefe Distrital — usa filtros geográficos abajo) */}
                            {isSuperUser && (
                                <select 
                                    id="filter_escuela_id"
                                    name="escuela_id"
                                    aria-label="Filtrar por Escuela"
                                    className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                    value={filters.escuela_id}
                                    onChange={(e) => setFilters({...filters, escuela_id: e.target.value})}
                                >
                                    <option value="">Todas las Escuelas</option>
                                    {escuelas.map(e => (
                                        <option key={e.id} value={e.id}>{e.nombre} - ({e.cue_anexo})</option>
                                    ))}
                                </select>
                            )}

                            <select 
                                id="filter_estado_cupof"
                                name="estado_cupof"
                                aria-label="Filtrar por Estado de CUPOF"
                                className="px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 outline-none"
                                value={filters.estado_cupof}
                                onChange={(e) => setFilters({...filters, estado_cupof: e.target.value})}
                            >
                                <option value="">Todos los Estados</option>
                                <option value="disponible">Disponible</option>
                                <option value="ocupado">Ocupado</option>
                                <option value="baja">Baja (Cerrado)</option>
                            </select>

                            <select 
                                id="filter_escalafon_id"
                                name="escalafon_id"
                                aria-label="Filtrar por Escalafón"
                                className="px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 outline-none"
                                value={filters.escalafon_id}
                                onChange={(e) => setFilters({...filters, escalafon_id: e.target.value})}
                            >
                                <option value="">Todos los Escalafones</option>
                                {escalafones.map(e => (
                                    <option key={e.id} value={e.id}>{e.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fila 2: filtros geográficos de escuela (solo Jefe Distrital) */}
                        {isJefeDistrital && !isSuperUser && (
                            <div className="flex flex-wrap gap-3 pt-1 border-t border-secondary-200">
                                <select
                                    id="filter_localidad_id"
                                    name="localidad_id"
                                    aria-label="Filtrar por Localidad"
                                    className="flex-1 min-w-[160px] px-3 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                    value={filters.localidad_id}
                                    onChange={(e) => setFilters({...filters, localidad_id: e.target.value})}
                                >
                                    <option value="">Todas las Localidades</option>
                                    {filterLocalidades.map(l => (
                                        <option key={l.id} value={l.id}>{l.nombre}</option>
                                    ))}
                                </select>

                                <select
                                    id="filter_nivel_id"
                                    name="nivel_id"
                                    aria-label="Filtrar por Nivel"
                                    className="px-3 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                    value={filters.nivel_id}
                                    onChange={(e) => setFilters({...filters, nivel_id: e.target.value})}
                                >
                                    <option value="">Todos los Niveles</option>
                                    {niveles.map(n => (
                                        <option key={n.id} value={n.id}>{n.nombre}</option>
                                    ))}
                                </select>

                                <select
                                    id="filter_sector_id"
                                    name="sector_id"
                                    aria-label="Filtrar por Sector"
                                    className="px-3 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                    value={filters.sector_id}
                                    onChange={(e) => setFilters({...filters, sector_id: e.target.value})}
                                >
                                    <option value="">Todos los Sectores</option>
                                    {sectores.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>

                                <input
                                    id="filter_numero"
                                    name="numero"
                                    aria-label="Filtrar por Número de Escuela"
                                    type="text"
                                    placeholder="Nº escuela"
                                    className="w-24 px-3 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                    value={filters.numero}
                                    onChange={(e) => setFilters({...filters, numero: e.target.value})}
                                />

                                <input
                                    id="filter_school_name"
                                    name="school_name"
                                    aria-label="Buscar por nombre de escuela"
                                    type="text"
                                    placeholder="Buscar escuela..."
                                    className="flex-1 min-w-[160px] px-3 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                    value={filters.school_name}
                                    onChange={(e) => setFilters({...filters, school_name: e.target.value})}
                                />

                                {/* Botón limpiar filtros geográficos */}
                                {(filters.localidad_id || filters.nivel_id || filters.sector_id || filters.numero || filters.school_name) && (
                                    <button
                                        type="button"
                                        onClick={() => setFilters(prev => ({...prev, localidad_id: '', nivel_id: '', sector_id: '', numero: '', school_name: ''}))}
                                        className="px-3 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-secondary-500 font-bold">Cargando planta funcional...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">CUPOF</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Escuela / Función</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Ocupante Actual</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {cupofs.map((cupof) => (
                                        <tr key={cupof.id} className="hover:bg-secondary-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        cupof.estado_cupof === 'disponible' ? 'bg-green-500' : 
                                                        cupof.estado_cupof === 'ocupado' ? 'bg-blue-500' : 'bg-red-500'
                                                    }`}></div>
                                                    <div>
                                                        <p className="text-sm font-black text-secondary-900 tracking-tighter">{cupof.codigo_cupof}</p>
                                                        <span className="text-[10px] font-bold text-secondary-500 uppercase">{cupof.escalafon?.nombre}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-secondary-800">{cupof.escuela.nombre}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] px-2 py-0.5 bg-secondary-100 rounded text-secondary-600 font-bold">
                                                        {cupof.puesto_tipo?.nombre}
                                                    </span>
                                                    {cupof.nombre_cargo ? (
                                                        <span className="text-[10px] text-primary-600 font-black uppercase">
                                                            {cupof.nombre_cargo}
                                                        </span>
                                                    ) : cupof.asignatura && (
                                                        <span className="text-[10px] text-primary-600 font-bold">
                                                            {cupof.asignatura.nombre}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {cupof.movimiento_activo ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                                                            {cupof.movimiento_activo.persona?.nombre.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-secondary-900">
                                                                {cupof.movimiento_activo.persona?.apellido}, {cupof.movimiento_activo.persona?.nombre}
                                                            </p>
                                                            <p className="text-[10px] text-secondary-500">
                                                                {cupof.movimiento_activo.situacion_revista} • Desde {new Date(cupof.movimiento_activo.fecha_inicio).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-secondary-400 italic">Vacante</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {canManageCupof(cupof) && (
                                                        <>
                                                            {cupof.estado_cupof === 'disponible' ? (
                                                                <button 
                                                                    onClick={() => { 
                                                                        setSelectedCupof(cupof); 
                                                                        setPersonaSearch('');
                                                                        setAssignSearchResults([]);
                                                                        setAssignData({
                                                                            persona_id: '',
                                                                            situacion_revista: 'provisional',
                                                                            fecha_inicio: new Date().toISOString().split('T')[0],
                                                                            resolucion: ''
                                                                        });
                                                                        setIsAssignModalOpen(true); 
                                                                    }}
                                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                                    title="Asignar Persona"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                                    </svg>
                                                                </button>
                                                            ) : cupof.estado_cupof === 'ocupado' ? (
                                                                <button 
                                                                    onClick={() => handleReleaseCupof(cupof)}
                                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                                    title="Liberar Puesto"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                                    </svg>
                                                                </button>
                                                            ) : null}
                                                            <button 
                                                                onClick={() => handleReleaseCupof(cupof, true)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Dar de Baja (Cierre)"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Listado de Personas (Padrón) */}
            {activeTab === 'personas' && (
                <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 bg-secondary-50/50 flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[300px] relative">
                            <input 
                                id="filter_persona_search"
                                name="persona_search"
                                aria-label="Buscar en Padrón"
                                type="text"
                                className="w-full pl-12 pr-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                placeholder="Buscar por Nombre, Apellido o DNI en el Padrón..."
                                value={personaSearch}
                                onChange={(e) => setPersonaSearch(e.target.value)}
                            />
                            <svg className="w-5 h-5 absolute left-4 top-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button 
                            onClick={fetchPersonas}
                            className="px-6 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-secondary-800 transition-all"
                        >
                            Buscar en Padrón
                        </button>
                    </div>

                    {isPersonasLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-secondary-500 font-bold">Cargando padrón...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Persona</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Documento</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">CUIL</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {personas.map((persona) => (
                                        <tr key={persona.id} className="hover:bg-secondary-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-secondary-100 flex items-center justify-center text-secondary-700 font-black">
                                                        {persona.nombre.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-secondary-900 tracking-tight">{persona.apellido}, {persona.nombre}</p>
                                                        <p className="text-[10px] text-secondary-500 font-bold uppercase">{persona.genero?.nombre || 'No especificado'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-secondary-700">{persona.documento_tipo?.nombre || 'DNI'} {persona.documento_numero}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-mono font-bold text-secondary-600">
                                                    {persona.CUIL_prefijo}-{persona.documento_numero}-{persona.CUIL_sufijo}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase">
                                                    Activo en Padrón
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: NUEVO CUPOF */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                        <form onSubmit={handleCreateCupof}>
                            <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                                <h2 className="text-xl font-black text-secondary-900">Crear Nuevo CUPOF</h2>
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-8 space-y-4">
                                <div>
                                    <label htmlFor="codigo_cupof" className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Código CUPOF</label>
                                    <input
                                        id="codigo_cupof"
                                        type="text" required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="Ej: 0540034421"
                                        value={formData.codigo_cupof}
                                        onChange={(e) => setFormData({...formData, codigo_cupof: e.target.value})}
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="nombre_cargo" className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Cargo / Función</label>
                                    <select
                                        id="nombre_cargo"
                                        required
                                        className="w-full px-4 py-3 bg-white border-2 border-primary-100 rounded-xl font-bold text-primary-900 focus:border-primary-500 outline-none transition-all"
                                        value={formData.nombre_cargo}
                                        onChange={(e) => {
                                            const cargoNombre = e.target.value;
                                            const cargo = cargos.find(c => c.nombre === cargoNombre);
                                            if (cargo) {
                                                const tipoMap = {
                                                    'cargo': 'CARGO',
                                                    'horas': 'HORAS CÁTEDRA',
                                                    'modulos': 'MÓDULOS'
                                                };
                                                const pt = puestoTipos.find(p => p.nombre === tipoMap[cargo.tipo]);
                                                setFormData({
                                                    ...formData,
                                                    nombre_cargo: cargo.nombre,
                                                    escalafon_id: cargo.escalafon_id,
                                                    puesto_tipo_id: pt ? pt.id : ''
                                                });
                                            } else {
                                                setFormData({ ...formData, nombre_cargo: '', escalafon_id: '', puesto_tipo_id: '' });
                                            }
                                        }}
                                    >
                                        <option value="">Seleccione Cargo...</option>
                                        {cargos
                                            .filter(c => {
                                                if (isSuperUser || isConduccion) return true;
                                                return isHierarchicalCargo(c.nombre);
                                            })
                                            .map(c => (
                                            <option key={c.id} value={c.nombre}>
                                                {c.nombre} ({c.escalafon?.nombre || 'Sin Escalafón'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {formData.escalafon_id && (
                                    <div className="flex gap-4 animate-fadeIn">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase mb-1">Escalafón</p>
                                            <div className="px-4 py-2 bg-secondary-100 rounded-xl text-xs font-bold text-secondary-600 border border-secondary-200">
                                                {escalafones.find(e => e.id === formData.escalafon_id)?.nombre || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase mb-1">Tipo de Puesto</p>
                                            <div className="px-4 py-2 bg-secondary-100 rounded-xl text-xs font-bold text-secondary-600 border border-secondary-200">
                                                {puestoTipos.find(p => p.id === formData.puesto_tipo_id)?.nombre || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor={!isConduccion && !showEscuelaList ? "cue_search" : undefined} className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Institución (CUE_Anexo)</label>
                                    
                                    {isConduccion ? (
                                        <div className="p-4 bg-secondary-100 border border-secondary-200 rounded-xl font-bold text-secondary-600 flex items-center gap-3">
                                            <svg className="w-5 h-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span className="truncate">{foundEscuela?.nombre || activeProfile?.escuela?.nombre || 'Tu Institución'}</span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Tabs: Por CUE / Por Filtros */}
                                            <div className="flex gap-2 mb-3">
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowEscuelaList(false)}
                                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showEscuelaList ? 'bg-secondary-900 text-white' : 'bg-secondary-100 text-secondary-500 hover:bg-secondary-200'}`}
                                                >
                                                    Por CUE
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowEscuelaList(true)}
                                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showEscuelaList ? 'bg-secondary-900 text-white' : 'bg-secondary-100 text-secondary-500 hover:bg-secondary-200'}`}
                                                >
                                                    Por Filtros
                                                </button>
                                            </div>

                                            {showEscuelaList ? (
                                                /* ── Selector geográfico secuencial ── */
                                                <div className="space-y-2 animate-fadeIn">
                                                    {/* Región (Solo no Jefe Distrital) */}
                                                    {!(isJefeDistrital && !isSuperUser) && (
                                                        <div>
                                                            <label htmlFor="modal_region_id" className="block text-[9px] font-black text-secondary-400 uppercase mb-1">Región Educativa</label>
                                                            <select
                                                                id="modal_region_id"
                                                                name="region_id"
                                                                className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                                                                value={modalFiltro.region_id}
                                                                onChange={e => setModalFiltro(prev => ({ ...prev, region_id: e.target.value, localidad_id: '' }))}
                                                            >
                                                                <option value="">Todas las Regiones</option>
                                                                {modalRegiones.map(r => (
                                                                    <option key={r.id} value={r.id}>Región {r.numero ?? r.id}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Departamento (Solo no Jefe Distrital) */}
                                                    {!(isJefeDistrital && !isSuperUser) && (
                                                        <div>
                                                            <label htmlFor="modal_departamento_id" className="block text-[9px] font-black text-secondary-400 uppercase mb-1">Departamento</label>
                                                            <select
                                                                id="modal_departamento_id"
                                                                name="departamento_id"
                                                                className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-400 transition-all disabled:opacity-50"
                                                                value={modalFiltro.departamento_id}
                                                                onChange={e => setModalFiltro(prev => ({ ...prev, departamento_id: e.target.value, localidad_id: '' }))}
                                                                disabled={!modalFiltro.region_id && modalDepartamentos.length === 0}
                                                            >
                                                                <option value="">Todos los Departamentos</option>
                                                                {modalDepartamentos.map(d => (
                                                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Localidad */}
                                                    <div>
                                                        <label htmlFor="modal_localidad_id" className="block text-[9px] font-black text-secondary-400 uppercase mb-1">Localidad</label>
                                                        <select
                                                            id="modal_localidad_id"
                                                            name="localidad_id"
                                                            className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-400 transition-all disabled:opacity-50"
                                                            value={modalFiltro.localidad_id}
                                                            onChange={e => setModalFiltro(prev => ({ ...prev, localidad_id: e.target.value }))}
                                                            disabled={!modalFiltro.departamento_id && modalLocalidades.length === 0}
                                                        >
                                                            <option value="">Todas las Localidades</option>
                                                            {modalLocalidades.map(l => (
                                                                <option key={l.id} value={l.id}>{l.nombre}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Nivel y Sector Grid */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label htmlFor="modal_nivel_id" className="block text-[9px] font-black text-secondary-400 uppercase mb-1">Nivel</label>
                                                            <select
                                                                id="modal_nivel_id"
                                                                name="nivel_id"
                                                                className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                                                                value={modalFiltro.nivel_id}
                                                                onChange={e => setModalFiltro(prev => ({ ...prev, nivel_id: e.target.value }))}
                                                            >
                                                                <option value="">Todos</option>
                                                                {niveles.map(n => (
                                                                    <option key={n.id} value={n.id}>{n.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label htmlFor="modal_sector_id" className="block text-[9px] font-black text-secondary-400 uppercase mb-1">Sector</label>
                                                            <select
                                                                id="modal_sector_id"
                                                                name="sector_id"
                                                                className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                                                                value={modalFiltro.sector_id}
                                                                onChange={e => setModalFiltro(prev => ({ ...prev, sector_id: e.target.value }))}
                                                            >
                                                                <option value="">Todos</option>
                                                                {sectores.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Número y Nombre Grid */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="col-span-1">
                                                            <label htmlFor="modal_numero" className="block text-[9px] font-black text-secondary-400 uppercase mb-1">Número</label>
                                                            <input
                                                                id="modal_numero"
                                                                name="numero"
                                                                type="text"
                                                                className="w-full px-3 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                                                                placeholder="Ej: 12"
                                                                value={modalFiltro.numero}
                                                                onChange={e => setModalFiltro(prev => ({ ...prev, numero: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div className="col-span-2 relative">
                                                            <label htmlFor="modal_nombre" className="block text-[9px] font-black text-secondary-400 uppercase mb-1">Buscar por Nombre</label>
                                                            <input
                                                                id="modal_nombre"
                                                                name="nombre"
                                                                type="text"
                                                                className="w-full pl-8 pr-3 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                                                                placeholder="Nombre..."
                                                                value={modalFiltro.nombre}
                                                                onChange={e => setModalFiltro(prev => ({ ...prev, nombre: e.target.value }))}
                                                            />
                                                            <svg className="w-3.5 h-3.5 absolute left-2.5 top-[2.1rem] text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    {/* Lista de escuelas filtradas */}
                                                    <div className="mt-1 border border-secondary-200 rounded-xl overflow-hidden">
                                                        {isLoadingModalEscuelas ? (
                                                            <div className="flex items-center justify-center gap-2 p-4 text-secondary-400">
                                                                <div className="w-4 h-4 border-2 border-secondary-200 border-t-primary-500 rounded-full animate-spin"></div>
                                                                <span className="text-[10px] font-bold">Buscando...</span>
                                                            </div>
                                                        ) : modalEscuelasFiltradas.length === 0 ? (
                                                            <p className="p-4 text-[10px] text-center text-secondary-400 font-bold">Sin resultados para estos filtros.</p>
                                                        ) : (
                                                            <div className="max-h-40 overflow-y-auto divide-y divide-secondary-100">
                                                                {modalEscuelasFiltradas.map(esc => (
                                                                    <button
                                                                        key={esc.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFoundEscuela(esc);
                                                                            setFormData(prev => ({ ...prev, escuela_id: esc.id }));
                                                                            setCueSearch(esc.cue_anexo);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2.5 transition-colors text-xs ${
                                                                            String(formData.escuela_id) === String(esc.id)
                                                                                ? 'bg-primary-50 text-primary-800 font-black'
                                                                                : 'hover:bg-secondary-50 text-secondary-700 font-bold'
                                                                        }`}
                                                                    >
                                                                        <p className="truncate">{esc.nombre}</p>
                                                                        <p className="text-[9px] text-secondary-400 font-bold mt-0.5">CUE: {esc.cue_anexo}</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* ── Búsqueda por CUE ── */
                                                <div className="relative">
                                                    <input 
                                                        id="cue_search"
                                                        name="cue_search"
                                                        type="text" required
                                                        className={`w-full px-4 py-3 border-2 rounded-xl font-black outline-none transition-all ${
                                                            foundEscuela ? 'bg-green-50 border-green-200 text-green-900' : 'bg-secondary-50 border-secondary-200 focus:border-primary-500'
                                                        }`}
                                                        placeholder="Ingrese CUE-Anexo (ej: 061495100)"
                                                        value={cueSearch}
                                                        onChange={(e) => setCueSearch(e.target.value)}
                                                    />
                                                    {isSearchingEscuela && (
                                                        <div className="absolute right-3 top-3.5">
                                                            <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    {foundEscuela && !showEscuelaList && (
                                        <div className="mt-2 p-3 bg-green-100 border border-green-200 rounded-xl flex items-center gap-2 animate-fadeIn">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-[11px] font-black text-green-800 uppercase leading-tight">
                                                {foundEscuela.nombre}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {!foundEscuela && !showEscuelaList && cueSearch.length >= 7 && !isSearchingEscuela && (
                                        <p className="mt-2 text-[10px] font-bold text-red-500 animate-pulse">
                                            No se encontró ninguna institución con este CUE.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 bg-secondary-50 border-t border-secondary-100">
                                <button type="submit" className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg transition-all active:scale-[0.98]">
                                    Guardar Puesto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ASIGNAR PERSONA */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                        <form onSubmit={handleAssignPersona}>
                            <div className="p-6 border-b border-secondary-100 bg-secondary-50">
                                <h2 className="text-xl font-black text-secondary-900">Asignar Personal</h2>
                                <p className="text-xs text-secondary-500 font-bold">Asignando a CUPOF: {selectedCupof?.codigo_cupof}</p>
                            </div>
                            <div className="p-8 space-y-4">
                                <div>
                                    <label htmlFor="persona_search" className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Buscar en Padrón (DNI/Nombre)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            id="persona_search"
                                            name="persona_search"
                                            type="text"
                                            className="flex-1 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="Buscar por DNI o Apellido..."
                                            value={personaSearch}
                                            onChange={(e) => setPersonaSearch(e.target.value)}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={searchPersonaForAssign} 
                                            disabled={isSearchingPersona}
                                            className="px-4 bg-secondary-900 text-white rounded-xl disabled:opacity-50"
                                        >
                                            {isSearchingPersona ? (
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <select 
                                        id="assign_persona_id"
                                        name="persona_id"
                                        required
                                        className="w-full mt-2 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold outline-none"
                                        value={assignData.persona_id}
                                        onChange={(e) => setAssignData({...assignData, persona_id: e.target.value})}
                                    >
                                        <option value="">
                                            {isSearchingPersona ? 'Buscando...' : 'Seleccionar Persona...'}
                                        </option>
                                        {assignSearchResults.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.apellido}, {p.nombre} ({p.documento_numero})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="situacion_revista" className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Situación Revista</label>
                                        <select 
                                            id="situacion_revista"
                                            name="situacion_revista"
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold outline-none"
                                            value={assignData.situacion_revista}
                                            onChange={(e) => setAssignData({...assignData, situacion_revista: e.target.value})}
                                        >
                                            <option value="titular">Titular</option>
                                            <option value="provisional">Provisional</option>
                                            <option value="suplente">Suplente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="fecha_inicio" className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Fecha Inicio</label>
                                        <input 
                                            id="fecha_inicio"
                                            name="fecha_inicio"
                                            type="date" required
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold outline-none"
                                            value={assignData.fecha_inicio}
                                            onChange={(e) => setAssignData({...assignData, fecha_inicio: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex gap-3">
                                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="flex-1 py-4 bg-white border border-secondary-300 text-secondary-700 rounded-2xl font-bold uppercase tracking-widest transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg transition-all">
                                    Confirmar Asignación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
                showInput={confirmConfig.showInput}
                isLoading={confirmConfig.isLoading}
            />
        </div>
    );
};

export default CupofManagement;
