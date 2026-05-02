import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import anioService from '../../services/anioService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Gestión de Años Académicos del Sistema.
 * Ubicado en Panel General > Años.
 */
const AnioManagement = () => {
    const { showNotification } = useAuth();
    const [anios, setAnios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnio, setEditingAnio] = useState(null);
    
    const [formData, setFormData] = useState({
        nombre: '',
        nombre_completo: '',
        anio_absoluto: '',
        anio_relativo: '',
        vigente: true
    });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'primary'
    });

    const fetchAnios = async () => {
        try {
            setIsLoading(true);
            const data = await anioService.getAll();
            setAnios(data);
        } catch (error) {
            showNotification(parseError(error, 'Error al cargar los años académicos.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnios();
    }, []);

    const handleOpenCreate = () => {
        setEditingAnio(null);
        setFormData({ 
            nombre: '', 
            nombre_completo: '', 
            anio_absoluto: '', 
            anio_relativo: '', 
            vigente: true 
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (anio) => {
        setEditingAnio(anio);
        setFormData({
            nombre: anio.nombre,
            nombre_completo: anio.nombre_completo || '',
            anio_absoluto: anio.anio_absoluto || '',
            anio_relativo: anio.anio_relativo || '',
            vigente: !!anio.vigente
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAnio) {
                await anioService.update(editingAnio.id, formData);
                showNotification('Año académico actualizado con éxito.', 'success');
            } else {
                await anioService.create(formData);
                showNotification('Año académico creado con éxito.', 'success');
            }
            setIsModalOpen(false);
            fetchAnios();
        } catch (error) {
            showNotification(parseError(error, 'Error al guardar el año académico.'), 'error');
        }
    };

    const handleDelete = (anio) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Año',
            message: `¿Estás seguro de que deseas eliminar "${anio.nombre}"? Esta acción no se puede deshacer.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await anioService.delete(anio.id);
                    showNotification('Año eliminado con éxito.', 'success');
                    fetchAnios();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showNotification(parseError(error, 'Error al eliminar el año.'), 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Años Académicos</h1>
                    <p className="text-secondary-500 mt-1 font-medium">Gestión de niveles y años de estudio del sistema</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Año
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-bold">Cargando datos...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Nombre</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Nombre Completo</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-center">Abs/Rel</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {anios.map((anio) => (
                                    <tr key={anio.id} className="hover:bg-secondary-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-secondary-900 tracking-tight uppercase">{anio.nombre}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-secondary-500 font-medium">{anio.nombre_completo}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">Abs: {anio.anio_absoluto}</span>
                                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">Rel: {anio.anio_relativo}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-[10px] font-black rounded-lg uppercase ${
                                                anio.vigente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {anio.vigente ? 'Vigente' : 'No Vigente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenEdit(anio)}
                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(anio)}
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                                <h2 className="text-xl font-black text-secondary-900">
                                    {editingAnio ? 'Editar Año' : 'Nuevo Año'}
                                </h2>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Nombre Corto</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none uppercase"
                                        placeholder="Ej: 1ERO"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Nombre Completo</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none uppercase"
                                        placeholder="Ej: PRIMER AÑO"
                                        value={formData.nombre_completo}
                                        onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Año Absoluto</label>
                                    <input 
                                        type="number"
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.anio_absoluto}
                                        onChange={(e) => setFormData({...formData, anio_absoluto: e.target.value})}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Año Relativo</label>
                                    <input 
                                        type="number"
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.anio_relativo}
                                        onChange={(e) => setFormData({...formData, anio_relativo: e.target.value})}
                                    />
                                </div>
                                
                                <div className="md:col-span-2 flex items-center justify-between p-4 bg-secondary-50 rounded-2xl border border-secondary-200">
                                    <div>
                                        <p className="text-xs font-black text-secondary-700 uppercase">Año Vigente</p>
                                        <p className="text-[10px] text-secondary-500 font-medium">Habilitar para su uso en planes y propuestas</p>
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
                                    {editingAnio ? 'Guardar Cambios' : 'Crear Año'}
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

export default AnioManagement;
