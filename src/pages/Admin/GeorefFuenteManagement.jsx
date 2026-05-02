import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import georefFuenteService from '../../services/georefFuenteService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Gestión de Fuentes Georef.
 * Estándar Visual Gentleman: Alta fidelidad y UX profesional.
 */
const GeorefFuenteManagement = () => {
    const { showNotification } = useAuth();
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        vigente: true
    });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'primary'
    });

    // Debounce manual para búsqueda
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchItems = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await georefFuenteService.getAll({ 
                search: debouncedSearch,
                page: page
            });
            // Si el backend devuelve paginación, los items están en response.data
            setItems(response.data || []);
            setPagination(response);
        } catch (error) {
            showNotification(parseError(error, 'Error al cargar las fuentes.'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, page, showNotification]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleOpenCreate = () => {
        setEditingItem(null);
        setFormData({ nombre: '', descripcion: '', vigente: true });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormData({
            nombre: item.nombre,
            descripcion: item.descripcion || '',
            vigente: !!item.vigente
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await georefFuenteService.update(editingItem.id, formData);
                showNotification('Fuente actualizada con éxito.', 'success');
            } else {
                await georefFuenteService.create(formData);
                showNotification('Fuente creada con éxito.', 'success');
            }
            setIsModalOpen(false);
            fetchItems();
        } catch (error) {
            showNotification(parseError(error, 'Error al procesar la solicitud.'), 'error');
        }
    };

    const handleDelete = (item) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Fuente',
            message: `¿Estás seguro de que deseas eliminar la fuente "${item.nombre}"? Esta acción no se puede deshacer.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await georefFuenteService.delete(item.id);
                    showNotification('Fuente eliminada con éxito.', 'success');
                    fetchItems();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
            showNotification(parseError(error, 'Error al eliminar la fuente.'), 'error');                }
            }
        });
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-secondary-900 tracking-tighter">Fuentes Georef</h1>
                    <p className="text-secondary-500 mt-2 font-medium">Metadatos para la procedencia de información geográfica</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Fuente
                </button>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-2xl border border-secondary-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input 
                        type="text"
                        placeholder="Buscar por nombre..."
                        className="w-full pl-12 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold text-secondary-800 placeholder:text-secondary-400 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all uppercase text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-24 flex flex-col items-center justify-center">
                        <div className="w-14 h-14 border-4 border-primary-50 border-t-primary-600 rounded-full animate-spin mb-6"></div>
                        <p className="text-secondary-400 font-black uppercase text-[10px] tracking-[0.2em]">Sincronizando fuentes...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50/50 border-b border-secondary-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-secondary-500 uppercase tracking-widest">Nombre y Descripción</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-secondary-500 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-secondary-500 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {items.length > 0 ? (
                                    items.map((item) => (
                                        <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-secondary-900 tracking-tight uppercase">{item.nombre}</p>
                                                {item.descripcion && (
                                                    <p className="text-xs text-secondary-500 mt-1 font-medium">{item.descripcion}</p>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-3 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-tighter shadow-sm ${
                                                    item.vigente ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                                }`}>
                                                    {item.vigente ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleOpenEdit(item)}
                                                        className="p-2.5 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors shadow-sm bg-white border border-secondary-100"
                                                        title="Editar"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(item)}
                                                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors shadow-sm bg-white border border-secondary-100"
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
                                        <td colSpan="3" className="px-8 py-20 text-center">
                                            <p className="text-secondary-400 font-bold italic">No se encontraron fuentes que coincidan con la búsqueda.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && items.length > 0 && pagination.last_page > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-secondary-100 shadow-sm">
                    <p className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">
                        Página {pagination.current_page} de {pagination.last_page} — Total: {pagination.total} registros
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={pagination.current_page === 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 bg-white border border-secondary-200 text-secondary-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-secondary-50 disabled:opacity-50 transition-all shadow-sm"
                        >
                            Anterior
                        </button>
                        <button 
                            disabled={pagination.current_page === pagination.last_page}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 bg-white border border-secondary-200 text-secondary-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-secondary-50 disabled:opacity-50 transition-all shadow-sm"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {/* Modal: Crear/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-md transition-all">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn border border-white/20">
                        <form onSubmit={handleSubmit}>
                            <div className="p-8 border-b border-secondary-100 flex items-center justify-between bg-secondary-50/50">
                                <div>
                                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight">
                                        {editingItem ? 'Editar Fuente' : 'Nueva Fuente'}
                                    </h2>
                                    <p className="text-xs text-secondary-500 font-medium mt-1">Completa los datos técnicos del metadato</p>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-white text-secondary-400 hover:text-secondary-600 rounded-xl shadow-sm border border-secondary-200 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-10 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-[0.15em] mb-2">Nombre de la Fuente</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-5 py-4 bg-secondary-50 border border-secondary-200 rounded-2xl font-bold text-secondary-900 focus:ring-4 focus:ring-primary-500/10 outline-none uppercase transition-all"
                                        placeholder="Ej: INDEC"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-[0.15em] mb-2">Descripción (Opcional)</label>
                                    <textarea 
                                        rows="3"
                                        className="w-full px-5 py-4 bg-secondary-50 border border-secondary-200 rounded-2xl font-bold text-secondary-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all resize-none"
                                        placeholder="Detalles adicionales sobre el origen de los datos..."
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between p-5 bg-secondary-50 rounded-2xl border border-secondary-200 shadow-inner">
                                    <div>
                                        <p className="text-xs font-black text-secondary-700 uppercase tracking-wide">Estado de Vigencia</p>
                                        <p className="text-[10px] text-secondary-500 font-medium mt-1">Habilitar esta fuente para su uso en el sistema</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.vigente}
                                            onChange={(e) => setFormData({...formData, vigente: e.target.checked})}
                                        />
                                        <div className="w-14 h-7 bg-secondary-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-primary-600 shadow-sm"></div>
                                    </label>
                                </div>
                            </div>
                            <div className="p-8 bg-secondary-50/50 border-t border-secondary-100 flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white border border-secondary-200 text-secondary-700 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-secondary-50 transition-all active:scale-[0.98]">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-[0.98]">
                                    {editingItem ? 'Sincronizar Cambios' : 'Crear Metadato'}
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

export default GeorefFuenteManagement;

