import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import condicionService from '../../services/condicionService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Gestión de Condiciones de Inscripción del Sistema.
 * Ubicado en Panel General > Condiciones.
 */
const CondicionManagement = () => {
    const { showNotification } = useAuth();
    const [condiciones, setCondiciones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCondicion, setEditingCondicion] = useState(null);
    
    const [formData, setFormData] = useState({
        nombre: '',
        vigente: true
    });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'primary'
    });

    const fetchCondiciones = async () => {
        try {
            setIsLoading(true);
            const data = await condicionService.getAll();
            setCondiciones(data);
        } catch (error) {
            showNotification('Error al cargar las condiciones.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCondiciones();
    }, []);

    const handleOpenCreate = () => {
        setEditingCondicion(null);
        setFormData({ nombre: '', vigente: true });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (condicion) => {
        setEditingCondicion(condicion);
        setFormData({
            nombre: condicion.nombre,
            vigente: !!condicion.vigente
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCondicion) {
                await condicionService.update(editingCondicion.id, formData);
                showNotification('Condición actualizada con éxito.', 'success');
            } else {
                await condicionService.create(formData);
                showNotification('Condición creada con éxito.', 'success');
            }
            setIsModalOpen(false);
            fetchCondiciones();
        } catch (error) {
            showNotification(parseError(error, 'Error al guardar la condición.'), 'error');
        }
    };

    const handleDelete = (condicion) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Condición',
            message: `¿Estás seguro de que deseas eliminar la condición "${condicion.nombre}"? Esta acción no se puede deshacer.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await condicionService.delete(condicion.id);
                    showNotification('Condición eliminada con éxito.', 'success');
                    fetchCondiciones();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showNotification(parseError(error, 'Error al eliminar la condición.'), 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Condiciones de Inscripción</h1>
                    <p className="text-secondary-500 mt-1 font-medium">Gestión de las condiciones en las que se inscriben los estudiantes</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Condición
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden max-w-4xl">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-bold">Cargando condiciones...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Nombre de la Condición</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {condiciones.map((condicion) => (
                                    <tr key={condicion.id} className="hover:bg-secondary-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-secondary-900 tracking-tight uppercase">{condicion.nombre}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-[10px] font-black rounded-lg uppercase ${
                                                condicion.vigente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {condicion.vigente ? 'Vigente' : 'No Vigente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenEdit(condicion)}
                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(condicion)}
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
                                    {editingCondicion ? 'Editar Condición' : 'Nueva Condición'}
                                </h2>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-8 space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Nombre de la Condición</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none uppercase"
                                        placeholder="Ej: REGULAR"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-2xl border border-secondary-200">
                                    <div>
                                        <p className="text-xs font-black text-secondary-700 uppercase">Estado Vigente</p>
                                        <p className="text-[10px] text-secondary-500 font-medium">Habilitar esta condición para las inscripciones</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.vigente}
                                            onChange={(e) => setFormData({...formData, vigente: e.target.checked})}
                                        />
                                        <div className="w-11 h-6 bg-secondary-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                            </div>
                            <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-white border border-secondary-300 text-secondary-700 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-[2] py-3.5 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 shadow-lg transition-all active:scale-[0.98]">
                                    {editingCondicion ? 'Guardar Cambios' : 'Crear Condición'}
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

export default CondicionManagement;
