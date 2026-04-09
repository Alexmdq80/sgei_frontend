import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import planService from '../../services/planService';
import asignaturaService from '../../services/asignaturaService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Componente para gestionar las asignaturas de un Plan de Estudio.
 * Permite navegar por los años del plan y CRUD de asignaturas.
 */
const AsignaturasManager = ({ planId, onClose }) => {
    const { showNotification } = useAuth();
    const [plan, setPlan] = useState(null);
    const [selectedAnioPlan, setSelectedAnioPlan] = useState(null);
    const [asignaturas, setAsignaturas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAsignaturasLoading, setIsAsignaturasLoading] = useState(false);

    // Estados para Formulario de Asignatura
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAsignatura, setEditingAsignatura] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        horas_semanales: 0,
        codigo: '',
        orden: 0
    });

    // Estados para Confirmación
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, onConfirm: () => {} });

    useEffect(() => {
        fetchPlanDetails();
    }, [planId]);

    const fetchPlanDetails = async () => {
        try {
            setIsLoading(true);
            const data = await planService.getPlanById(planId);
            setPlan(data);
            if (data.anio_planes?.length > 0) {
                handleSelectAnioPlan(data.anio_planes[0]);
            }
        } catch (error) {
            showNotification('Error al cargar detalles del plan.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAnioPlan = async (anioPlan) => {
        setSelectedAnioPlan(anioPlan);
        try {
            setIsAsignaturasLoading(true);
            const data = await asignaturaService.getByAnioPlan(anioPlan.id);
            setAsignaturas(data || []);
        } catch (error) {
            showNotification('Error al cargar asignaturas.', 'error');
        } finally {
            setIsAsignaturasLoading(false);
        }
    };

    const handleOpenForm = (asignatura = null) => {
        if (asignatura) {
            setEditingAsignatura(asignatura);
            setFormData({
                nombre: asignatura.nombre,
                horas_semanales: asignatura.horas_semanales,
                codigo: asignatura.codigo || '',
                orden: asignatura.orden || 0
            });
        } else {
            setEditingAsignatura(null);
            setFormData({ nombre: '', horas_semanales: 0, codigo: '', orden: 0 });
        }
        setIsFormOpen(true);
    };

    const handleSaveAsignatura = async (e) => {
        e.preventDefault();
        try {
            const data = { ...formData, anio_plan_id: selectedAnioPlan.id };
            if (editingAsignatura) {
                await asignaturaService.update(editingAsignatura.id, data);
                showNotification('Asignatura actualizada.', 'success');
            } else {
                await asignaturaService.create(data);
                showNotification('Asignatura creada.', 'success');
            }
            setIsFormOpen(false);
            handleSelectAnioPlan(selectedAnioPlan);
        } catch (error) {
            showNotification('Error al guardar asignatura.', 'error');
        }
    };

    const handleDeleteAsignatura = (id) => {
        setConfirmConfig({
            isOpen: true,
            onConfirm: async () => {
                try {
                    await asignaturaService.delete(id);
                    showNotification('Asignatura eliminada.', 'success');
                    handleSelectAnioPlan(selectedAnioPlan);
                } catch (error) {
                    showNotification('Error al eliminar asignatura.', 'error');
                } finally {
                    setConfirmConfig({ isOpen: false });
                }
            }
        });
    };

    if (isLoading) return <div className="p-10 text-center">Cargando estructura del plan...</div>;

    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            <header className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{plan?.nombre}</h2>
                    <p className="text-sm text-gray-500">Gestión de estructura curricular</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <div className="flex flex-grow overflow-hidden">
                {/* Selector de Años */}
                <aside className="w-1/4 border-r border-gray-100 overflow-y-auto p-4 bg-gray-50/50">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Años del Plan</h3>
                    <div className="space-y-1">
                        {plan?.anio_planes?.map((ap) => (
                            <button
                                key={ap.id}
                                onClick={() => handleSelectAnioPlan(ap)}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium ${
                                    selectedAnioPlan?.id === ap.id 
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {ap.anio?.nombre}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Listado de Asignaturas */}
                <main className="flex-grow flex flex-col overflow-hidden bg-white">
                    <header className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">
                            Asignaturas de <span className="text-indigo-600">{selectedAnioPlan?.anio?.nombre}</span>
                        </h3>
                        <button
                            onClick={() => handleOpenForm()}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar
                        </button>
                    </header>

                    <div className="flex-grow overflow-y-auto p-4">
                        {isAsignaturasLoading ? (
                            <div className="text-center py-10 text-gray-400 italic">Cargando materias...</div>
                        ) : asignaturas.length > 0 ? (
                            <div className="space-y-2">
                                {asignaturas.map((asig) => (
                                    <div key={asig.id} className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all">
                                        <div>
                                            <div className="font-bold text-gray-800">{asig.nombre}</div>
                                            <div className="text-xs text-gray-500 flex gap-3 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {asig.horas_semanales}hs semanales
                                                </span>
                                                {asig.codigo && <span>Cod: {asig.codigo}</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenForm(asig)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDeleteAsignatura(asig.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 font-medium">No hay asignaturas cargadas para este año.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Formulario Interno (Modal Simple) */}
            {isFormOpen && (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6">
                    <form onSubmit={handleSaveAsignatura} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
                        <h4 className="text-xl font-bold text-gray-800 mb-6">
                            {editingAsignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="asig_nombre" className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                                <input
                                    id="asig_nombre"
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="asig_horas" className="block text-sm font-bold text-gray-700 mb-1">Horas Semanales</label>
                                    <input
                                        id="asig_horas"
                                        type="number"
                                        required
                                        min="0"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                        value={formData.horas_semanales}
                                        onChange={(e) => setFormData({...formData, horas_semanales: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="asig_orden" className="block text-sm font-bold text-gray-700 mb-1">Orden</label>
                                    <input
                                        id="asig_orden"
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                        value={formData.orden}
                                        onChange={(e) => setFormData({...formData, orden: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="asig_codigo" className="block text-sm font-bold text-gray-700 mb-1">Código (Opcional)</label>
                                <input
                                    id="asig_codigo"
                                    type="text"
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                    value={formData.codigo}
                                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3">
                            <button type="submit" className="flex-grow bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                                Guardar
                            </button>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ isOpen: false })}
                onConfirm={confirmConfig.onConfirm}
                title="Eliminar Asignatura"
                message="¿Estás seguro de que deseas eliminar esta asignatura del plan de estudio?"
                variant="danger"
            />
        </div>
    );
};

export default AsignaturasManager;
