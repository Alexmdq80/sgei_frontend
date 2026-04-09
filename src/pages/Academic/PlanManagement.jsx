import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import planService from '../../services/planService';
import AsignaturasManager from './AsignaturasManager';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Página de gestión de Planes de Estudio.
 * Permite listar, crear, editar y eliminar planes de estudio.
 * Acceso: Superusuario y Supervisor Curricular.
 */
const PlanManagement = () => {
    const { user, showNotification } = useAuth();
    
    // Estados para Planes
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Estado para gestión de asignaturas
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    
    // Catálogos
    const [ciclos, setCiclos] = useState([]);

    // Estados para Formulario (Modal)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        nombre_completo: '',
        duracion_anios: 1,
        resolucion: '',
        orientacion: '',
        plan_ciclo_id: ''
    });

    // Estados para el Modal de Confirmación
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

    const fetchPlans = async () => {
        try {
            setIsLoading(true);
            const data = await planService.getAllPlans();
            setPlans(data || []);
        } catch (error) {
            console.error('Error al cargar planes:', error);
            showNotification('Error al cargar el listado de planes.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCiclos = async () => {
        try {
            const data = await planService.getPlanCiclos();
            setCiclos(data || []);
        } catch (error) {
            console.error('Error al cargar ciclos:', error);
        }
    };

    useEffect(() => {
        fetchPlans();
        fetchCiclos();
    }, []);

    // --- ACCIONES ---

    const handleOpenModal = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                nombre: plan.nombre || '',
                nombre_completo: plan.nombre_completo || '',
                duracion_anios: plan.duracion_anios || 1,
                resolucion: plan.resolucion || '',
                orientacion: plan.orientacion || '',
                plan_ciclo_id: plan.plan_ciclo_id || ''
            });
        } else {
            setEditingPlan(null);
            setFormData({
                nombre: '',
                nombre_completo: '',
                duracion_anios: 1,
                resolucion: '',
                orientacion: '',
                plan_ciclo_id: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPlan(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (editingPlan) {
                await planService.updatePlan(editingPlan.id, formData);
                showNotification('Plan actualizado exitosamente.', 'success');
            } else {
                await planService.createPlan(formData);
                showNotification('Plan creado exitosamente.', 'success');
            }
            fetchPlans();
            handleCloseModal();
        } catch (error) {
            console.error('Error al guardar plan:', error);
            const errorMsg = error.response?.data?.error || 'Error al procesar la solicitud.';
            showNotification(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id) => {
        openConfirm({
            title: 'Eliminar Plan de Estudio',
            message: '¿Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.',
            variant: 'danger',
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await planService.deletePlan(id);
                    showNotification('Plan eliminado correctamente.', 'success');
                    fetchPlans();
                } catch (error) {
                    showNotification('No se pudo eliminar el plan.', 'error');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    // Filtrado
    const filteredPlans = plans.filter(p => 
        p.nombre.toLowerCase().includes(search.toLowerCase()) || 
        p.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
        p.resolucion?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Planes de Estudio</h1>
                    <p className="text-gray-600">Administra la oferta académica y resoluciones vigentes.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Plan
                </button>
            </header>

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
                        placeholder="Buscar por nombre o resolución..."
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
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolución</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Años</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ciclo</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredPlans.length > 0 ? (
                                filteredPlans.map((plan) => (
                                    <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{plan.nombre}</div>
                                            <div className="text-xs text-gray-500">{plan.orientacion || 'Sin orientación'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {plan.resolucion || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {plan.duracion_anios} años
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                {plan.plan_ciclo?.nombre || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setSelectedPlanId(plan.id)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Gestionar Asignaturas"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(plan)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(plan.id)}
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
                                        No se encontraron planes de estudio.
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
                                        {editingPlan ? 'Editar Plan de Estudio' : 'Nuevo Plan de Estudio'}
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre Corto</label>
                                            <input
                                                id="nombre"
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                                placeholder="Ej: Ciclo Básico Secundario"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                            <input
                                                id="nombre_completo"
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={formData.nombre_completo}
                                                onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                                                placeholder="Ej: Plan de Estudios para Ciclo Básico de Educación Secundaria"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="duracion_anios" className="block text-sm font-medium text-gray-700 mb-1">Duración (Años)</label>
                                                <input
                                                    id="duracion_anios"
                                                    type="number"
                                                    required
                                                    min="1"
                                                    max="10"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    value={formData.duracion_anios}
                                                    onChange={(e) => setFormData({...formData, duracion_anios: parseInt(e.target.value)})}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="plan_ciclo_id" className="block text-sm font-medium text-gray-700 mb-1">Ciclo</label>
                                                <select
                                                    id="plan_ciclo_id"
                                                    required
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    value={formData.plan_ciclo_id}
                                                    onChange={(e) => setFormData({...formData, plan_ciclo_id: e.target.value})}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {ciclos.map(c => (
                                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="resolucion" className="block text-sm font-medium text-gray-700 mb-1">Resolución</label>
                                            <input
                                                id="resolucion"
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={formData.resolucion}
                                                onChange={(e) => setFormData({...formData, resolucion: e.target.value})}
                                                placeholder="Ej: Res. 123/24"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="orientacion" className="block text-sm font-medium text-gray-700 mb-1">Orientación</label>
                                            <input
                                                id="orientacion"
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                value={formData.orientacion}
                                                onChange={(e) => setFormData({...formData, orientacion: e.target.value})}
                                                placeholder="Ej: Ciencias Naturales"
                                            />
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

            {/* Modal de Confirmación Global */}
            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                variant={confirmConfig.variant}
            />

            {/* Modal de Gestión de Asignaturas */}
            {selectedPlanId && (
                <div className="fixed inset-0 z-40 overflow-y-auto flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedPlanId(null)}></div>
                    <div className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp">
                        <AsignaturasManager 
                            planId={selectedPlanId} 
                            onClose={() => setSelectedPlanId(null)} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanManagement;
