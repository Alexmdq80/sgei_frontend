import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import cupofService from '../../services/cupofService';
import agenteService from '../../services/agenteService';
import escuelaService from '../../services/escuelaService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Gestión de la Planta Orgánica Funcional (POF) - CUPOF y Agentes.
 * Exclusivo para Superusuarios y Supervisores Curriculares.
 */
const CupofManagement = () => {
    const { showNotification } = useAuth();
    const [activeTab, setActiveTab] = useState('pof'); // 'pof' | 'agentes'
    
    // Estados para CUPOF (POF)
    const [cupofs, setCupofs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        escuela_id: '',
        estado_cupof: '',
        escalafon: '',
        search: ''
    });

    // Estados para Agentes
    const [agentes, setAgentes] = useState([]);
    const [isAgentesLoading, setIsAgentesLoading] = useState(false);
    const [agenteSearch, setAgenteSearch] = useState('');

    // Catálogos
    const [escuelas, setEscuelas] = useState([]);

    // Estados para Modales
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedCupof, setSelectedCupof] = useState(null);
    const [formData, setFormData] = useState({
        codigo_cupof: '',
        escuela_id: '',
        escalafon: 'docente',
        tipo_puesto: 'cargo',
        cantidad: 1
    });

    const [assignData, setAssignData] = useState({
        agente_id: '',
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

    const fetchAgentes = async () => {
        try {
            setIsAgentesLoading(true);
            const response = await agenteService.getAll({ search: agenteSearch });
            setAgentes(response.data || []);
        } catch (error) {
            showNotification('Error al cargar agentes.', 'error');
        } finally {
            setIsAgentesLoading(false);
        }
    };

    const fetchEscuelas = async () => {
        try {
            const response = await escuelaService.search();
            setEscuelas(response.data || []);
        } catch (error) {
            console.error('Error al cargar escuelas');
        }
    };

    useEffect(() => {
        if (activeTab === 'pof') fetchCupofs();
        if (activeTab === 'agentes') fetchAgentes();
    }, [activeTab, filters.escuela_id, filters.estado_cupof, filters.escalafon]);

    useEffect(() => {
        fetchEscuelas();
    }, []);

    // --- ACCIONES ---

    const handleCreateCupof = async (e) => {
        e.preventDefault();
        try {
            await cupofService.create(formData);
            showNotification('Puesto CUPOF creado con éxito.', 'success');
            setIsCreateModalOpen(false);
            fetchCupofs();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Error al crear el puesto.', 'error');
        }
    };

    const handleAssignAgente = async (e) => {
        e.preventDefault();
        try {
            await cupofService.assign(selectedCupof.id, assignData);
            showNotification('Agente asignado exitosamente.', 'success');
            setIsAssignModalOpen(false);
            fetchCupofs();
        } catch (error) {
            showNotification('Error al asignar agente.', 'error');
        }
    };

    const handleReleaseCupof = (cupof, isClosure = false) => {
        setConfirmConfig({
            isOpen: true,
            title: isClosure ? 'Dar de Baja Puesto' : 'Liberar Puesto',
            message: isClosure 
                ? '¿Confirmas el cierre definitivo de este CUPOF? Esta acción es por cierre de sección.'
                : '¿Confirmas la liberación del puesto? El docente actual dejará de ocuparlo.',
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
                    <p className="text-secondary-500 mt-1 font-medium">Administración de la Planta Orgánica Funcional (POF)</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Puesto
                </button>
            </div>

            {/* Selector de Pestañas */}
            <div className="flex gap-2 p-1 bg-secondary-100 rounded-2xl w-full md:w-fit">
                <button
                    onClick={() => setActiveTab('pof')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'pof' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                    }`}
                >
                    Planta Funcional (POF)
                </button>
                <button
                    onClick={() => setActiveTab('agentes')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'agentes' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                    }`}
                >
                    Padrón de Agentes
                </button>
            </div>

            {/* Listado de POF */}
            {activeTab === 'pof' && (
                <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
                    {/* Filtros */}
                    <div className="p-6 border-b border-secondary-100 bg-secondary-50/50 flex flex-wrap gap-4">
                        <select 
                            className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={filters.escuela_id}
                            onChange={(e) => setFilters({...filters, escuela_id: e.target.value})}
                        >
                            <option value="">Todas las Escuelas</option>
                            {escuelas.map(e => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>

                        <select 
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
                            className="px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 outline-none"
                            value={filters.escalafon}
                            onChange={(e) => setFilters({...filters, escalafon: e.target.value})}
                        >
                            <option value="">Todos los Escalafones</option>
                            <option value="docente">Docente</option>
                            <option value="auxiliar">Auxiliar</option>
                            <option value="administrativo">Administrativo</option>
                        </select>
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
                                                        <span className="text-[10px] font-bold text-secondary-500 uppercase">{cupof.escalafon}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-secondary-800">{cupof.escuela.nombre}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] px-2 py-0.5 bg-secondary-100 rounded text-secondary-600 font-bold">
                                                        {cupof.tipo_puesto}
                                                    </span>
                                                    {cupof.asignatura && (
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
                                                            {cupof.movimiento_activo.agente.persona.nombre.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-secondary-900">
                                                                {cupof.movimiento_activo.agente.persona.apellido}, {cupof.movimiento_activo.agente.persona.nombre}
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
                                                    {cupof.estado_cupof === 'disponible' ? (
                                                        <button 
                                                            onClick={() => { setSelectedCupof(cupof); setIsAssignModalOpen(true); }}
                                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                            title="Asignar Agente"
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
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Código CUPOF</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="Ej: 0540034421"
                                        value={formData.codigo_cupof}
                                        onChange={(e) => setFormData({...formData, codigo_cupof: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Escalafón</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold outline-none"
                                            value={formData.escalafon}
                                            onChange={(e) => setFormData({...formData, escalafon: e.target.value})}
                                        >
                                            <option value="docente">Docente</option>
                                            <option value="auxiliar">Auxiliar</option>
                                            <option value="administrativo">Administrativo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Tipo Puesto</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold outline-none"
                                            value={formData.tipo_puesto}
                                            onChange={(e) => setFormData({...formData, tipo_puesto: e.target.value})}
                                        >
                                            <option value="cargo">Cargo</option>
                                            <option value="horas_catedra">Horas Cátedra</option>
                                            <option value="modulos">Módulos</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Institución</label>
                                    <select 
                                        required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold outline-none"
                                        value={formData.escuela_id}
                                        onChange={(e) => setFormData({...formData, escuela_id: e.target.value})}
                                    >
                                        <option value="">Seleccionar Escuela</option>
                                        {escuelas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                    </select>
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

            {/* MODAL: ASIGNAR AGENTE */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                        <form onSubmit={handleAssignAgente}>
                            <div className="p-6 border-b border-secondary-100 bg-secondary-50">
                                <h2 className="text-xl font-black text-secondary-900">Asignar Personal</h2>
                                <p className="text-xs text-secondary-500 font-bold">Asignando a CUPOF: {selectedCupof?.codigo_cupof}</p>
                            </div>
                            <div className="p-8 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Agente (DNI/Nombre)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            className="flex-1 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="Buscar por DNI..."
                                            value={agenteSearch}
                                            onChange={(e) => setAgenteSearch(e.target.value)}
                                        />
                                        <button type="button" onClick={fetchAgentes} className="px-4 bg-secondary-900 text-white rounded-xl">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <select 
                                        required
                                        className="w-full mt-2 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold outline-none"
                                        value={assignData.agente_id}
                                        onChange={(e) => setAssignData({...assignData, agente_id: e.target.value})}
                                    >
                                        <option value="">Seleccionar del resultado...</option>
                                        {agentes.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.persona.apellido}, {a.persona.nombre} ({a.persona.documento_numero})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Situación Revista</label>
                                        <select 
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
                                        <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Fecha Inicio</label>
                                        <input 
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
