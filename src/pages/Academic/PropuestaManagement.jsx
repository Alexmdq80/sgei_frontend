import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import propuestaService from '../../services/propuestaService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Página de Gestión de Propuestas Institucionales.
 * Permite definir qué años de qué planes se dictan en la escuela,
 * en qué turno, jornada y ciclo lectivo.
 */
const PropuestaManagement = () => {
    const { activeProfile, showNotification } = useAuth();
    
    // Estados para Escuelas Autorizadas
    const [authorizedSchools, setAuthorizedSchools] = useState([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState('');
    const [isSchoolsLoading, setIsSchoolsLoading] = useState(true);

    // Estados para Propuestas
    const [propuestas, setPropuestas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    
    // Catálogos
    const [turnos, setTurnos] = useState([]);
    const [jornadas, setJornadas] = useState([]);
    const [lectivos, setLectivos] = useState([]);
    const [anioPlanes, setAnioPlanes] = useState([]);

    // Estados para Formulario (Modal)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPropuesta, setEditingPropuesta] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        anio_plan_id: '',
        turno_inicio_id: '',
        turno_fin_id: '',
        jornada_id: '',
        lectivo_id: '',
        escuela_id: ''
    });

    // Estados para el Modal de Confirmación Global
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirmar',
        variant: 'primary',
        onConfirm: () => {}
    });

    const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

    const openConfirm = (config) => {
        setConfirmConfig({
            isOpen: true,
            title: config.title || '¿Estás seguro?',
            message: config.message || '',
            confirmText: config.confirmText || 'Confirmar',
            variant: config.variant || 'primary',
            onConfirm: config.onConfirm
        });
    };

    // --- CARGA DE DATOS ---

    /**
     * Carga la lista de escuelas donde el usuario puede gestionar propuestas.
     */
    const fetchAuthorizedSchools = async () => {
        try {
            setIsSchoolsLoading(true);
            const schools = await propuestaService.getAuthorizedSchools();
            setAuthorizedSchools(schools || []);
            
            // Lógica de selección inicial
            if (schools && schools.length > 0) {
                // Si el perfil activo coincide con una autorizada, usarla. Si no, la primera.
                const profileMatch = schools.find(s => s.id === activeProfile?.escuela_id);
                setSelectedSchoolId(profileMatch ? profileMatch.id : schools[0].id);
            }
        } catch (error) {
            console.error('Error al cargar escuelas autorizadas:', error);
            showNotification('No se pudieron cargar las instituciones autorizadas.', 'error');
        } finally {
            setIsSchoolsLoading(false);
        }
    };

    /**
     * Carga las propuestas y catálogos de la escuela seleccionada.
     */
    const fetchData = async () => {
        if (!selectedSchoolId) return;
        
        try {
            setIsLoading(true);
            const [propData, turnData, jornData, lectData, anioPData] = await Promise.all([
                propuestaService.getAll({ escuela_id: selectedSchoolId }),
                propuestaService.getTurnos(),
                propuestaService.getJornadas(),
                propuestaService.getLectivos(),
                propuestaService.getAnioPlanes()
            ]);
            
            setPropuestas(propData || []);
            setTurnos(turnData || []);
            setJornadas(jornData || []);
            setLectivos(lectData || []);
            setAnioPlanes(anioPData || []);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            showNotification('Error al cargar la información de propuestas.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAuthorizedSchools();
    }, []);

    useEffect(() => {
        if (selectedSchoolId) {
            fetchData();
        }
    }, [selectedSchoolId]);

    // --- ACCIONES ---

    const handleOpenModal = (propuesta = null) => {
        if (propuesta) {
            setEditingPropuesta(propuesta);
            setFormData({
                anio_plan_id: propuesta.anio_plan_id || '',
                turno_inicio_id: propuesta.turno_inicio_id || '',
                turno_fin_id: propuesta.turno_fin_id || '',
                jornada_id: propuesta.jornada_id || '',
                lectivo_id: propuesta.lectivo_id || '',
                escuela_id: selectedSchoolId
            });
        } else {
            setEditingPropuesta(null);
            setFormData({
                anio_plan_id: '',
                turno_inicio_id: '',
                turno_fin_id: '',
                jornada_id: '',
                lectivo_id: '',
                escuela_id: selectedSchoolId
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPropuesta(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const finalData = { ...formData, escuela_id: selectedSchoolId };
            
            if (editingPropuesta) {
                await propuestaService.update(editingPropuesta.id, finalData);
                showNotification('Propuesta actualizada exitosamente.', 'success');
            } else {
                await propuestaService.create(finalData);
                showNotification('Propuesta creada exitosamente.', 'success');
            }
            fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Error al guardar propuesta:', error);
            const errorMsg = error.response?.data?.error || 'Error al procesar la solicitud.';
            showNotification(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id) => {
        openConfirm({
            title: 'Eliminar Propuesta Institucional',
            message: '¿Estás seguro de que deseas eliminar esta propuesta? Se perderán las vinculaciones con secciones y espacios.',
            variant: 'danger',
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await propuestaService.delete(id);
                    showNotification('Propuesta eliminada correctamente.', 'success');
                    fetchData();
                } catch (error) {
                    showNotification('No se pudo eliminar la propuesta.', 'error');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    // Filtrado (Buscamos por nombre de plan o año)
    const filteredPropuestas = propuestas.filter(p => {
        const planName = p.anio_plan?.plan?.nombre?.toLowerCase() || '';
        const anioName = p.anio_plan?.anio?.nombre?.toLowerCase() || '';
        const searchTerm = search.toLowerCase();
        return planName.includes(searchTerm) || anioName.includes(searchTerm);
    });

    if (isSchoolsLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-600">Verificando autorizaciones...</p>
            </div>
        );
    }

    if (authorizedSchools.length === 0) {
        return (
            <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-2xl shadow-sm border border-red-100 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
                <p className="text-gray-600 mb-6">
                    No tienes roles de equipo de conducción (Director, Secretario, etc.) asignados a ninguna institución para gestionar propuestas.
                </p>
                <button 
                    onClick={() => window.history.back()}
                    className="text-indigo-600 font-medium hover:text-indigo-800"
                >
                    &larr; Volver
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Propuestas Institucionales</h1>
                    <p className="text-gray-600">Configura la oferta académica de la institución para el ciclo lectivo.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    {authorizedSchools.length > 1 && (
                        <div className="relative">
                            <select
                                className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-gray-700 shadow-sm"
                                value={selectedSchoolId}
                                onChange={(e) => setSelectedSchoolId(e.target.value)}
                            >
                                {authorizedSchools.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre} ({s.numero})</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => handleOpenModal()}
                        disabled={!selectedSchoolId}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Propuesta
                    </button>
                </div>
            </header>

            {/* Selector Visual Informativo si solo hay una escuela */}
            {authorizedSchools.length === 1 && (
                <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Institución Activa</p>
                        <p className="text-sm font-semibold text-indigo-900">{authorizedSchools[0].nombre} - Esc. Nº {authorizedSchools[0].numero}</p>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="relative max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por plan o año..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan / Año</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ciclo Lectivo</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Turno</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jornada</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-4">
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredPropuestas.length > 0 ? (
                                filteredPropuestas.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{p.anio_plan?.plan?.nombre}</div>
                                            <div className="text-xs text-indigo-600 font-semibold uppercase">{p.anio_plan?.anio?.nombre}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {p.ciclo_lectivo?.nombre || p.lectivo_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {p.turno_inicio?.nombre} {p.turno_fin ? ` a ${p.turno_fin.nombre}` : ''}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                {p.jornada?.nombre || 'Estandar'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => handleOpenModal(p)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Eliminar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        No se encontraron propuestas institucionales.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Formulario */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                                        {editingPropuesta ? 'Editar Propuesta' : 'Nueva Propuesta'}
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan y Año</label>
                                            <select
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={formData.anio_plan_id}
                                                onChange={(e) => setFormData({...formData, anio_plan_id: e.target.value})}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {anioPlanes.map(ap => (
                                                    <option key={ap.id} value={ap.id}>
                                                        {ap.plan?.nombre} - {ap.anio?.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo Lectivo</label>
                                            <select
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={formData.lectivo_id}
                                                onChange={(e) => setFormData({...formData, lectivo_id: e.target.value})}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {lectivos.map(l => (
                                                    <option key={l.id} value={l.id}>{l.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Turno Inicio</label>
                                                <select
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    value={formData.turno_inicio_id}
                                                    onChange={(e) => setFormData({...formData, turno_inicio_id: e.target.value})}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {turnos.map(t => (
                                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Turno Fin (Opcional)</label>
                                                <select
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    value={formData.turno_fin_id}
                                                    onChange={(e) => setFormData({...formData, turno_fin_id: e.target.value})}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {turnos.map(t => (
                                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Jornada</label>
                                            <select
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={formData.jornada_id}
                                                onChange={(e) => setFormData({...formData, jornada_id: e.target.value})}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {jornadas.map(j => (
                                                    <option key={j.id} value={j.id}>{j.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {isSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                variant={confirmConfig.variant}
            />
        </div>
    );
};

export default PropuestaManagement;
