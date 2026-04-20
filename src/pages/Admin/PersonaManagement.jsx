import { useState, useEffect } from 'react';
import { 
    UserPlus, Search, Eye, Pencil, Link, Link2Off, 
    Loader2, Lock, Unlock, Mail, Globe, MapPin, 
    ShieldCheck, Calendar, Info, X, Check, Save,
    User, Phone, Home, Layers, Briefcase, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import personaService from '../../services/personaService';
import cupofService from '../../services/cupofService';
import documentoTipoService from '../../services/documentoTipoService';

/**
 * Componente para la gestión integral del Padrón de Personas (Agentes).
 */
export default function PersonaManagement() {
    const { user: authUser, showNotification } = useAuth();
    
    // El Jefe Distrital es el único autorizado para vincular con CUPOF
    const isJefeDistrital = authUser?.roles?.some(r => r.name === 'jefe_distrital') || authUser?.es_administrador;

    const [personas, setPersonas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [docTipos, setDocTipos] = useState([]);

    // Estados para el Modal de Detalles
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);

    // Estados para la Asignación de CUPOF
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [availableCupofs, setAvailableCupofs] = useState([]);
    const [isSearchingCupof, setIsSearchingCupof] = useState(false);
    const [cupofSearchTerm, setCupofSearchTerm] = useState('');
    const [isSavingAssignment, setIsSavingAssignment] = useState(false);
    
    const [assignmentData, setAssignmentData] = useState({
        cupof_id: '',
        situacion_revista: 'provisional',
        fecha_inicio: new Date().toISOString().split('T')[0],
        resolucion: ''
    });

    // Estados para el Modal de Creación / Edición (Persona)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSavingPersona, setIsSavingPersona] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isEmailLocked, setIsEmailLocked] = useState(false);
    const [editingPersonaId, setEditingPersonaId] = useState(null);
    const [isLinkingUser, setIsLinkingUser] = useState(null); // ID de la persona siendo vinculada
    const [personaFormData, setPersonaFormData] = useState({
        apellido: '',
        nombre: '',
        documento_tipo_id: '',
        documento_numero: '',
        email: ''
    });

    const fetchPersonas = async (page = 1) => {
        try {
            setIsLoading(true);
            const response = await personaService.getAll({ 
                search: searchTerm,
                page,
                per_page: 15
            });
            setPersonas(response.data || []);
            setPagination(response.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (error) {
            console.error('Error al cargar personas:', error);
            showNotification('Error al cargar el padrón.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDocTipos = async () => {
        try {
            const response = await documentoTipoService.getAll();
            setDocTipos(response);
        } catch (error) {
            console.error('Error al cargar tipos de documento:', error);
        }
    };

    useEffect(() => {
        fetchPersonas();
        fetchDocTipos();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchPersonas(1);
    };

    const handleViewPersona = async (id) => {
        try {
            setIsFetchingDetails(true);
            const response = await personaService.getById(id);
            setSelectedPersona(response.data);
            setIsDetailsModalOpen(true);
        } catch (error) {
            console.error('Error al obtener detalles de la persona:', error);
            showNotification('No se pudieron cargar los detalles del registro.', 'error');
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const handleSearchCupof = async (e) => {
        e.preventDefault();
        if (cupofSearchTerm.length < 3) {
            showNotification('Ingresa al menos 3 caracteres para buscar un CUPOF.', 'warning');
            return;
        }

        try {
            setIsSearchingCupof(true);
            const response = await cupofService.getAll({ 
                search: cupofSearchTerm,
                only_available: true
            });
            setAvailableCupofs(response.data || []);
            if (response.data?.length === 0) {
                showNotification('No se encontraron CUPOF vacantes con ese criterio.', 'info');
            }
        } catch (error) {
            console.error('Error al buscar CUPOF:', error);
            showNotification('Error al buscar posiciones disponibles.', 'error');
        } finally {
            setIsSearchingCupof(false);
        }
    };

    const handleSaveAssignment = async () => {
        if (!assignmentData.cupof_id) {
            showNotification('Debes seleccionar un puesto (CUPOF).', 'warning');
            return;
        }

        try {
            setIsSavingAssignment(true);
            await cupofService.assign(assignmentData.cupof_id, {
                persona_id: selectedPersona.id,
                situacion_revista: assignmentData.situacion_revista,
                fecha_inicio: assignmentData.fecha_inicio,
                resolucion: assignmentData.resolucion
            });
            
            showNotification('Asignación realizada con éxito.', 'success');
            setIsAssignModalOpen(false);
            setIsDetailsModalOpen(false);
        } catch (error) {
            console.error('Error al asignar CUPOF:', error);
            const msg = error.response?.data?.error || 'No se pudo completar la asignación.';
            showNotification(msg, 'error');
        } finally {
            setIsSavingAssignment(false);
        }
    };

    const handleEditPersona = (persona) => {
        setIsEditMode(true);
        setIsEmailLocked(!!persona.usuario_email);
        setEditingPersonaId(persona.id);
        setPersonaFormData({
            apellido: persona.apellido,
            nombre: persona.nombre,
            documento_tipo_id: persona.documento_tipo_id,
            documento_numero: persona.documento_numero,
            email: persona.contacto?.email || persona.usuario_email || ''
        });
        setIsCreateModalOpen(true);
    };

    const handleCreatePersona = () => {
        setIsEditMode(false);
        setIsEmailLocked(false);
        setEditingPersonaId(null);
        setPersonaFormData({
            apellido: '',
            nombre: '',
            documento_tipo_id: '',
            documento_numero: '',
            email: ''
        });
        setIsCreateModalOpen(true);
    };

    const handleSubmitPersona = async (e) => {
        e.preventDefault();
        try {
            setIsSavingPersona(true);
            if (isEditMode) {
                await personaService.update(editingPersonaId, personaFormData);
                showNotification('Registro de persona actualizado con éxito.', 'success');
            } else {
                await personaService.create(personaFormData);
                showNotification('Persona registrada con éxito en el padrón.', 'success');
            }
            setIsCreateModalOpen(false);
            setPersonaFormData({
                apellido: '',
                nombre: '',
                documento_tipo_id: '',
                documento_numero: '',
                email: ''
            });
            fetchPersonas(isEditMode ? pagination.current_page : 1);
        } catch (error) {
            console.error('Error al procesar persona:', error);
            
            let msg = `No se pudo ${isEditMode ? 'actualizar' : 'registrar'} la persona.`;
            
            // Si es un error de validación de Laravel (422)
            if (error.response?.status === 422) {
                const validationErrors = error.response.data.errors;
                if (validationErrors) {
                    // Si existe el error específico de documento_numero o email, lo mostramos con prioridad
                    if (validationErrors.documento_numero) {
                        msg = validationErrors.documento_numero[0];
                    } else if (validationErrors.email) {
                        msg = validationErrors.email[0];
                    } else {
                        // Si hay otros errores de validación, tomamos el primero
                        const firstError = Object.values(validationErrors)[0];
                        if (Array.isArray(firstError)) msg = firstError[0];
                    }
                } else if (error.response.data.error) {
                    msg = error.response.data.error;
                }
            } else if (error.response?.data?.error) {
                msg = error.response.data.error;
            }
            
            showNotification(msg, 'error');
        } finally {
            setIsSavingPersona(false);
        }
    };

    const handleLinkUser = async (personaId) => {
        try {
            setIsLinkingUser(personaId);
            const response = await personaService.tryLinkUser(personaId);
            showNotification(response.message, 'success');
            
            // Actualizar la lista localmente para mostrar el email vinculado
            setPersonas(prev => prev.map(p => 
                p.id === personaId ? { ...p, usuario_email: response.usuario_email } : p
            ));
        } catch (error) {
            console.error('Error al vincular usuario:', error);
            const msg = error.response?.data?.error || 'No se pudo realizar la vinculación.';
            showNotification(msg, 'warning');
        } finally {
            setIsLinkingUser(null);
        }
    };

    const handleUnlinkUser = async (personaId) => {
        try {
            setIsLinkingUser(personaId);
            const response = await personaService.unlinkUser(personaId);
            showNotification(response.message, 'success');
            
            // Actualizar la lista localmente para quitar el email vinculado
            setPersonas(prev => prev.map(p => 
                p.id === personaId ? { ...p, usuario_email: null } : p
            ));
        } catch (error) {
            console.error('Error al desvincular usuario:', error);
            const msg = error.response?.data?.error || 'No se pudo realizar la desvinculación.';
            showNotification(msg, 'error');
        } finally {
            setIsLinkingUser(null);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Gestión de Personas</h1>
                    <p className="text-secondary-500 mt-1 font-medium italic">Administración del Padrón</p>
                </div>
                <button 
                    onClick={handleCreatePersona}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                >
                    <UserPlus className="w-5 h-5" />
                    Nueva Persona
                </button>
            </div>

            {/* Filtros y Búsqueda */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
                <form onSubmit={handleSearch} className="flex gap-3 w-full lg:max-w-md">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                            <Search className="w-5 h-5" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, apellido o DNI..."
                            className="w-full pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="px-6 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors">
                        Buscar
                    </button>
                </form>
            </div>

            {/* Listado */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-medium italic">Cargando padrón...</p>
                    </div>
                ) : personas.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Apellido y Nombre</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Documento</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Vinculación Usuario</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {personas.map((persona) => (
                                    <tr key={persona.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-700 font-bold border border-secondary-200 shadow-sm">
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
                                            {persona.usuario_email ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                        <span className="text-xs font-bold text-secondary-800">{persona.usuario_email}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleUnlinkUser(persona.id)}
                                                        disabled={isLinkingUser === persona.id}
                                                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all border border-red-100 group"
                                                        title="Desvincular Usuario"
                                                    >
                                                        {isLinkingUser === persona.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Link2Off className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 text-secondary-400 italic">
                                                        <span className="w-2 h-2 bg-secondary-300 rounded-full"></span>
                                                        <span className="text-xs font-medium">Sin cuenta</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleLinkUser(persona.id)}
                                                        disabled={isLinkingUser === persona.id}
                                                        className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-lg transition-all border border-primary-100 group"
                                                        title="Buscar y Vincular Usuario por DNI e Email"
                                                    >
                                                        {isLinkingUser === persona.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Link className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleViewPersona(persona.id)}
                                                    disabled={isFetchingDetails}
                                                    className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Visualizar Registro"
                                                >
                                                    {isFetchingDetails ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Eye className="w-5 h-5" />
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => handleEditPersona(persona)}
                                                    className="p-2 text-secondary-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                                    title="Editar Registro"
                                                >
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-20 text-center text-secondary-500 font-bold italic">
                        No se encontraron registros en el padrón.
                    </div>
                )}

                {/* Paginación */}
                {pagination.last_page > 1 && (
                    <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
                        <p className="text-xs text-secondary-500 font-bold">Total: {pagination.total} personas</p>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.current_page === 1}
                                onClick={() => fetchPersonas(pagination.current_page - 1)}
                                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                                Página {pagination.current_page} de {pagination.last_page}
                            </span>
                            <button
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => fetchPersonas(pagination.current_page + 1)}
                                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE DETALLES */}
            {isDetailsModalOpen && selectedPersona && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                            <div>
                                <h2 className="text-xl font-black text-secondary-900 uppercase">
                                    Detalle del Agente
                                </h2>
                                <p className="text-xs text-secondary-500 font-bold tracking-widest mt-0.5 uppercase">Identificador de Padrón: {selectedPersona.id}</p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1">
                            <div className="p-8 space-y-8">
                                {/* Datos de Identidad */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-secondary-100 pb-2">
                                        <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest">Información de Identidad</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Apellido y Nombre</p>
                                            <p className="text-lg font-black text-secondary-900 uppercase">{selectedPersona.nombre_completo}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">CUIL / Identificación Fiscal</p>
                                            <p className="text-lg font-bold text-primary-600 tracking-wider">{selectedPersona.cuil}</p>
                                        </div>
                                        <div className="space-y-0.5 border-t border-secondary-200 pt-3">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Documento</p>
                                            <p className="text-sm font-bold text-secondary-900">{selectedPersona.documento_tipo_nombre}: {selectedPersona.documento_numero}</p>
                                        </div>
                                        <div className="space-y-0.5 border-t border-secondary-200 pt-3">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Fecha de Nacimiento</p>
                                            <p className="text-sm font-bold text-secondary-900">{selectedPersona.nacimiento_fecha || 'No registrada'}</p>
                                        </div>
                                        <div className="space-y-0.5 border-t border-secondary-200 pt-3">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Nacionalidad</p>
                                            <p className="text-sm font-bold text-secondary-900 uppercase">{selectedPersona.nacionalidad || 'No especificada'}</p>
                                        </div>
                                        <div className="space-y-0.5 border-t border-secondary-200 pt-3">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Lugar de Nacimiento</p>
                                            <p className="text-xs font-bold text-secondary-700 uppercase">
                                                {selectedPersona.nacimiento_localidad}, {selectedPersona.nacimiento_provincia} ({selectedPersona.nacimiento_pais})
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Información de Contacto */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-secondary-100 pb-2">
                                        <Mail className="w-5 h-5 text-indigo-500" />
                                        <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest">Contacto y Domicilio</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                                            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Vías de Comunicación</p>
                                            <div className="space-y-2">
                                                <p className="text-sm font-bold text-secondary-900 flex items-center gap-2">
                                                    <span className="text-xs font-black text-indigo-400 w-20">MÓVIL:</span> {selectedPersona.contacto?.telefono_movil || 'S/D'}
                                                </p>
                                                <p className="text-sm font-bold text-secondary-900 flex items-center gap-2">
                                                    <span className="text-xs font-black text-indigo-400 w-20">FIJO:</span> {selectedPersona.contacto?.telefono_fijo || 'S/D'}
                                                </p>
                                                <p className="text-sm font-bold text-secondary-900 flex items-center gap-2">
                                                    <span className="text-xs font-black text-indigo-400 w-20">EMAIL:</span> {selectedPersona.contacto?.email || 'S/D'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 space-y-4">
                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Domicilio Real</p>
                                            <div className="space-y-2">
                                                <p className="text-sm font-bold text-secondary-900">
                                                    {selectedPersona.domicilio?.calle} {selectedPersona.domicilio?.numero}
                                                </p>
                                                <p className="text-xs font-bold text-secondary-500 uppercase italic">
                                                    {selectedPersona.domicilio?.barrio ? `Barrio: ${selectedPersona.domicilio.barrio}` : 'Sin datos de barrio'}
                                                </p>
                                                {(selectedPersona.domicilio?.piso || selectedPersona.domicilio?.depto) && (
                                                    <p className="text-xs font-bold text-secondary-700 uppercase">
                                                        Piso: {selectedPersona.domicilio.piso || '-'} | Depto: {selectedPersona.domicilio.depto || '-'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Vinculación de Sistema */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-secondary-100 pb-2">
                                        <ShieldCheck className="w-5 h-5 text-green-500" />
                                        <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest">Seguridad y Vinculación</h3>
                                    </div>
                                    <div className="p-6 bg-green-50/50 border border-green-100 rounded-2xl">
                                        {selectedPersona.usuario_email ? (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Cuenta de Usuario Vinculada</p>
                                                    <p className="text-sm font-black text-secondary-900 mt-1">{selectedPersona.usuario_email}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-full border border-green-200">Activa</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between italic">
                                                <p className="text-sm text-secondary-500 font-medium tracking-tight">Este agente no posee una cuenta de usuario vinculada en el sistema.</p>
                                                <span className="px-3 py-1 bg-secondary-100 text-secondary-400 text-[10px] font-black uppercase rounded-full border border-secondary-200">Desvinculado</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                    {isJefeDistrital && (
                                        <button
                                            type="button"
                                            onClick={() => setIsAssignModalOpen(true)}
                                            className="flex-1 px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Link className="w-5 h-5" />
                                            Asignar CUPOF
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsDetailsModalOpen(false)}
                                        className="flex-1 px-6 py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-lg"
                                    >
                                        Cerrar Vista
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CREACIÓN DE PERSONA */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col border border-primary-100">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-primary-50">
                            <div>
                                <h2 className="text-xl font-black text-primary-900 uppercase">
                                    {isEditMode ? 'Modificar Registro de Persona' : 'Registrar Nueva Persona'}
                                </h2>
                                <p className="text-xs text-primary-600 font-bold tracking-widest mt-0.5 uppercase">
                                    {isEditMode ? `ID: ${editingPersonaId}` : 'Alta en el Padrón'}
                                </p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-primary-400 hover:text-primary-600 transition-colors focus:outline-none">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitPersona} className="overflow-y-auto flex-1 p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Apellido */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Apellido</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all uppercase"
                                        placeholder="Apellido completo"
                                        value={personaFormData.apellido}
                                        onChange={(e) => setPersonaFormData(prev => ({ ...prev, apellido: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                                {/* Nombre */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Nombre</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all uppercase"
                                        placeholder="Nombres"
                                        value={personaFormData.nombre}
                                        onChange={(e) => setPersonaFormData(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                                {/* Tipo Documento */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Tipo Documento</label>
                                    <select 
                                        required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        value={personaFormData.documento_tipo_id}
                                        onChange={(e) => setPersonaFormData(prev => ({ ...prev, documento_tipo_id: e.target.value }))}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {docTipos.map(tipo => (
                                            <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Número Documento */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Número Documento</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="DNI / Pasaporte"
                                        value={personaFormData.documento_numero}
                                        onChange={(e) => setPersonaFormData(prev => ({ ...prev, documento_numero: e.target.value }))}
                                    />
                                </div>
                                {/* Email de Contacto */}
                                <div className="space-y-1 md:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest ml-1">Email de Contacto (Opcional)</label>
                                        {!isEmailLocked && personaFormData.email && (
                                            <button 
                                                type="button"
                                                onClick={() => setPersonaFormData(prev => ({ ...prev, email: '' }))}
                                                className="text-[10px] font-black text-red-500 uppercase hover:text-red-700 transition-colors"
                                            >
                                                Limpiar Email
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="email" 
                                            disabled={isEmailLocked}
                                            className={`w-full px-4 py-3 border rounded-xl text-sm font-bold focus:ring-2 outline-none transition-all lowercase ${
                                                isEmailLocked 
                                                ? 'bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed' 
                                                : 'bg-indigo-50/30 border-indigo-200 text-secondary-900 focus:ring-indigo-500'
                                            }`}
                                            placeholder="correo@ejemplo.com"
                                            value={personaFormData.email}
                                            onChange={(e) => setPersonaFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                                        />
                                        {isEmailLocked && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-secondary-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    {isEmailLocked ? (
                                        <p className="text-[10px] text-red-600 mt-1.5 italic font-bold leading-tight flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            Email Bloqueado: Hay un usuario vinculado a este registro. Debe desvincular el usuario desde el listado principal para poder modificar este correo.
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-indigo-600 mt-1.5 italic font-bold leading-tight">
                                            Nota: Este email se utiliza para la vinculación digital. Si el usuario ya existe y está verificado, el sistema lo asociará automáticamente a este registro de persona.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-6 py-4 bg-secondary-100 text-secondary-600 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPersona}
                                    className="flex-[2] px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSavingPersona ? (
                                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {isEditMode ? 'Guardar Cambios' : 'Registrar Persona'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE ASIGNACIÓN DE CUPOF */}
            {isAssignModalOpen && selectedPersona && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/70 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col border border-primary-100">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-primary-50">
                            <div>
                                <h2 className="text-xl font-black text-primary-900 uppercase">
                                    Vincular a Cargo (CUPOF)
                                </h2>
                                <p className="text-xs text-primary-600 font-bold tracking-widest mt-0.5 uppercase">
                                    Persona: {selectedPersona.apellido}, {selectedPersona.nombre}
                                </p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-primary-400 hover:text-primary-600 transition-colors focus:outline-none">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-8 space-y-6">
                            {/* Buscador de CUPOF */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-secondary-400 uppercase tracking-widest ml-1">Buscar Puesto Vacante (CUE, Código o Escuela)</label>
                                <form onSubmit={handleSearchCupof} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="Ej: 061234500 o 'Director'..."
                                        value={cupofSearchTerm}
                                        onChange={(e) => setCupofSearchTerm(e.target.value)}
                                    />
                                    <button 
                                        type="submit"
                                        disabled={isSearchingCupof}
                                        className="px-6 py-3 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors disabled:opacity-50"
                                    >
                                        {isSearchingCupof ? '...' : 'Buscar'}
                                    </button>
                                </form>
                            </div>

                            {/* Resultados de CUPOF */}
                            {availableCupofs.length > 0 && (
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-secondary-400 uppercase tracking-widest ml-1">Seleccionar Posición</label>
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {availableCupofs.map(cupof => (
                                            <button
                                                key={cupof.id}
                                                onClick={() => setAssignmentData(prev => ({ ...prev, cupof_id: cupof.id }))}
                                                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                    assignmentData.cupof_id === cupof.id 
                                                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
                                                    : 'border-secondary-100 hover:border-primary-200 bg-white'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-black text-secondary-900 uppercase">{cupof.codigo_cupof}</p>
                                                        <p className="text-[10px] text-secondary-500 font-bold uppercase">{cupof.escuela?.nombre || 'Escuela s/d'}</p>
                                                    </div>
                                                    <span className="text-[9px] px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded font-black uppercase">
                                                        {cupof.tipo_puesto}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Datos de la Asignación */}
                            {assignmentData.cupof_id && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Situación de Revista</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            value={assignmentData.situacion_revista}
                                            onChange={(e) => setAssignmentData(prev => ({ ...prev, situacion_revista: e.target.value }))}
                                        >
                                            <option value="titular">Titular</option>
                                            <option value="provisional">Provisional</option>
                                            <option value="suplente">Suplente</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Fecha de Inicio</label>
                                        <input 
                                            type="date" 
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            value={assignmentData.fecha_inicio}
                                            onChange={(e) => setAssignmentData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Resolución / Disposición (Opcional)</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            placeholder="Ej: Res. 123/26..."
                                            value={assignmentData.resolucion}
                                            onChange={(e) => setAssignmentData(prev => ({ ...prev, resolucion: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="flex-1 px-6 py-4 bg-secondary-100 text-secondary-600 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingAssignment || !assignmentData.cupof_id}
                                    onClick={handleSaveAssignment}
                                    className="flex-[2] px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSavingAssignment ? (
                                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Confirmar Asignación
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
