import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import modalidadNivelService from '../../services/modalidadNivelService';
import nivelService from '../../services/nivelService';
import modalidadService from '../../services/modalidadService';
import escuelaTipoService from '../../services/escuelaTipoService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Gestión de Combinaciones Válidas de Modalidad y Nivel.
 * Ubicado en Panel General > Modalidades por Nivel.
 */
const ModalidadNivelManagement = () => {
    const { showNotification } = useAuth();
    const [combinations, setCombinations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCombination, setEditingCombination] = useState(null);
    
    // Catálogos
    const [niveles, setNiveles] = useState([]);
    const [modalidades, setModalidades] = useState([]);
    const [escuelaTipos, setEscuelaTipos] = useState([]);

    const [formData, setFormData] = useState({
        nivel_id: '',
        modalidad_id: '',
        escuela_tipo_id: ''
    });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'primary'
    });

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [combis, nivs, mods, tipos] = await Promise.all([
                modalidadNivelService.getAll(),
                nivelService.getAll(),
                modalidadService.getAll(),
                escuelaTipoService.getAll()
            ]);
            setCombinations(combis);
            setNiveles(nivs);
            setModalidades(mods);
            setEscuelaTipos(tipos);
        } catch (error) {
            showNotification('Error al cargar los datos.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreate = () => {
        setEditingCombination(null);
        setFormData({ nivel_id: '', modalidad_id: '', escuela_tipo_id: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (comb) => {
        setEditingCombination(comb);
        setFormData({
            nivel_id: comb.nivel_id,
            modalidad_id: comb.modalidad_id,
            escuela_tipo_id: comb.escuela_tipo_id || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCombination) {
                await modalidadNivelService.update(editingCombination.id, formData);
                showNotification('Combinación actualizada con éxito.', 'success');
            } else {
                await modalidadNivelService.create(formData);
                showNotification('Combinación creada con éxito.', 'success');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Error al procesar la solicitud.', 'error');
        }
    };

    const handleDelete = (comb) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Combinación',
            message: `¿Estás seguro de que deseas eliminar la combinación "${comb.nivel?.nombre} - ${comb.modalidad?.nombre}"?`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await modalidadNivelService.delete(comb.id);
                    showNotification('Combinación eliminada con éxito.', 'success');
                    fetchData();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showNotification('Error al eliminar la combinación.', 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Modalidades por Nivel</h1>
                    <p className="text-secondary-500 mt-1 font-medium">Definición de combinaciones académicas válidas en el sistema</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Combinación
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden max-w-5xl">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-bold">Cargando combinaciones...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Nivel</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Modalidad</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Tipo de Escuela</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {combinations.map((comb) => (
                                    <tr key={comb.id} className="hover:bg-secondary-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-secondary-900 tracking-tight uppercase">{comb.nivel?.nombre}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-secondary-700 uppercase">{comb.modalidad?.nombre}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {comb.escuela_tipo ? (
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg uppercase">
                                                    {comb.escuela_tipo.nombre}
                                                </span>
                                            ) : (
                                                <span className="text-secondary-400 text-xs italic">Cualquiera</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenEdit(comb)}
                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(comb)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
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

            {/* Modal: Crear/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                                <h2 className="text-xl font-black text-secondary-900">
                                    {editingCombination ? 'Editar Combinación' : 'Nueva Combinación'}
                                </h2>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-8 space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Nivel Educativo</label>
                                    <select 
                                        required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none uppercase text-xs"
                                        value={formData.nivel_id}
                                        onChange={(e) => setFormData({...formData, nivel_id: e.target.value})}
                                    >
                                        <option value="">Seleccionar Nivel</option>
                                        {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Modalidad</label>
                                    <select 
                                        required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none uppercase text-xs"
                                        value={formData.modalidad_id}
                                        onChange={(e) => setFormData({...formData, modalidad_id: e.target.value})}
                                    >
                                        <option value="">Seleccionar Modalidad</option>
                                        {modalidades.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Tipo de Escuela (opcional)</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none uppercase text-xs"
                                        value={formData.escuela_tipo_id}
                                        onChange={(e) => setFormData({...formData, escuela_tipo_id: e.target.value})}
                                    >
                                        <option value="">Cualquiera</option>
                                        {escuelaTipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-white border border-secondary-300 text-secondary-700 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-[2] py-3.5 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 shadow-lg transition-all active:scale-[0.98]">
                                    {editingCombination ? 'Guardar Cambios' : 'Crear Combinación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
            />
        </div>
    );
};

export default ModalidadNivelManagement;
