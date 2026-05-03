import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import calleService from '../../services/calleService';
import localidadCensalService from '../../services/localidadCensalService';
import SearchableSelect from '../../components/SearchableSelect';
import ConfirmationModal from '../../components/ConfirmationModal';

const CalleManagement = () => {
    const { showNotification } = useAuth();
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({});
    const [localidadCensals, setLocalidadCensals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        nombre: '',
        localidad_censal_id: '',
        id_georef: '',
        altura_inicio_derecha: '',
        altura_inicio_izquierda: '',
        altura_fin_derecha: '',
        altura_fin_izquierda: ''
    });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const fetchItems = async () => {
        try {
            setIsLoading(true);
            const response = await calleService.getAll({
                search: debouncedSearch,
                page: page,
                per_page: 15
            });
            setItems(response.data || response);
            setPagination(response.data ? response : {});
        } catch (error) {
            showNotification(parseError(error, 'Error al cargar las calles.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const lcRes = await localidadCensalService.getAll({ per_page: 1000 });
            const lcData = lcRes.data.data || lcRes.data || lcRes;
            setLocalidadCensals(Array.isArray(lcData) ? lcData : []);
        } catch (error) {
            showNotification(parseError(error, 'Error al cargar catálogos.'), 'error');
        }
    };

    useEffect(() => {
        fetchCatalogs();
    }, []);

    useEffect(() => {
        fetchItems();
    }, [page, debouncedSearch]);

    // Debounce para la búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                nombre: item.nombre,
                localidad_censal_id: item.localidad_censal_id || '',
                id_georef: item.id_georef || '',
                altura_inicio_derecha: item.altura_inicio_derecha || '',
                altura_inicio_izquierda: item.altura_inicio_izquierda || '',
                altura_fin_derecha: item.altura_fin_derecha || '',
                altura_fin_izquierda: item.altura_fin_izquierda || ''
            });
        } else {
            setEditingItem(null);
            setFormData({
                nombre: '',
                localidad_censal_id: '',
                id_georef: '',
                altura_inicio_derecha: '',
                altura_inicio_izquierda: '',
                altura_fin_derecha: '',
                altura_fin_izquierda: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (editingItem) {
                await calleService.update(editingItem.id, formData);
                showNotification('Calle actualizada correctamente.', 'success');
            } else {
                await calleService.create(formData);
                showNotification('Calle creada correctamente.', 'success');
            }
            fetchItems();
            handleCloseModal();
        } catch (error) {
            showNotification(parseError(error), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (item) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Calle',
            message: `¿Está seguro que desea eliminar la calle "${item.nombre}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                try {
                    await calleService.delete(item.id);
                    showNotification('Calle eliminada correctamente.', 'success');
                    fetchItems();
                } catch (error) {
                    showNotification(parseError(error, 'Error al eliminar la calle.'), 'error');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900">Gestión de Calles</h1>
                    <p className="text-secondary-500 text-sm mt-1">Administre el catálogo de calles y arterias.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Nueva Calle
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                <div className="p-4 border-b border-secondary-100 bg-secondary-50/50">
                    <div className="relative max-w-md">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o localidad..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-secondary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-secondary-50/50">
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">Nombre</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">Localidad Censal</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">Alturas</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="4" className="px-6 py-4"><div className="h-4 bg-secondary-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : items.length > 0 ? (
                                items.map((item) => (
                                    <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-secondary-900 uppercase">{item.nombre}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-[10px] font-black uppercase tracking-wider border border-primary-100">
                                                {item.localidad_censal?.nombre || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-secondary-500">
                                            {item.altura_inicio_derecha && (
                                                <div className="flex gap-2">
                                                    <span className="font-bold">Der:</span> {item.altura_inicio_derecha}-{item.altura_fin_derecha}
                                                    <span className="font-bold ml-2">Izq:</span> {item.altura_inicio_izquierda}-{item.altura_fin_izquierda}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal(item)} className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.828 2.828 0 114 4L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                <button onClick={() => handleDelete(item)} className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-secondary-500 font-medium">No se encontraron calles.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {!isLoading && pagination.last_page > 1 && (
                    <div className="px-6 py-4 bg-secondary-50/50 border-t border-secondary-100 flex items-center justify-between">
                        <p className="text-xs text-secondary-500 font-medium">
                            Mostrando <span className="font-bold text-secondary-700">{pagination.from}</span> a <span className="font-bold text-secondary-700">{pagination.to}</span> de <span className="font-bold text-secondary-700">{pagination.total}</span> calles
                        </p>
                        <div className="flex gap-2">
                            <button 
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="px-4 py-1.5 bg-white border border-secondary-200 rounded-xl text-xs font-bold text-secondary-600 hover:bg-secondary-50 transition-colors disabled:opacity-50 disabled:hover:bg-white"
                            >
                                Anterior
                            </button>
                            <button 
                                disabled={page === pagination.last_page}
                                onClick={() => setPage(page + 1)}
                                className="px-4 py-1.5 bg-white border border-secondary-200 rounded-xl text-xs font-bold text-secondary-600 hover:bg-secondary-50 transition-colors disabled:opacity-50 disabled:hover:bg-white"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
                        <div className="px-8 py-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900">{editingItem ? 'Editar Calle' : 'Nueva Calle'}</h3>
                                <p className="text-secondary-500 text-xs mt-1">Complete los datos de la calle o arteria.</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-secondary-200/50 rounded-xl transition-colors text-secondary-400 hover:text-secondary-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <SearchableSelect 
                                    label="Localidad Censal"
                                    options={localidadCensals}
                                    value={formData.localidad_censal_id}
                                    onChange={(e) => setFormData({...formData, localidad_censal_id: e.target.value})}
                                    placeholder="Buscar Localidad Censal..."
                                />

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5">Nombre de Calle</label>
                                    <input type="text" required value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-2xl text-sm" placeholder="Ej: AVENIDA RIVADAVIA" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5 text-center bg-secondary-100 rounded py-1">Vereda Derecha</label>
                                        <div className="flex gap-2">
                                            <input type="number" value={formData.altura_inicio_derecha} onChange={(e) => setFormData({...formData, altura_inicio_derecha: e.target.value})} className="w-full px-3 py-2 bg-secondary-50 border border-secondary-200 rounded-xl text-sm" placeholder="Inicio" />
                                            <input type="number" value={formData.altura_fin_derecha} onChange={(e) => setFormData({...formData, altura_fin_derecha: e.target.value})} className="w-full px-3 py-2 bg-secondary-50 border border-secondary-200 rounded-xl text-sm" placeholder="Fin" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5 text-center bg-secondary-100 rounded py-1">Vereda Izquierda</label>
                                        <div className="flex gap-2">
                                            <input type="number" value={formData.altura_inicio_izquierda} onChange={(e) => setFormData({...formData, altura_inicio_izquierda: e.target.value})} className="w-full px-3 py-2 bg-secondary-50 border border-secondary-200 rounded-xl text-sm" placeholder="Inicio" />
                                            <input type="number" value={formData.altura_fin_izquierda} onChange={(e) => setFormData({...formData, altura_fin_izquierda: e.target.value})} className="w-full px-3 py-2 bg-secondary-50 border border-secondary-200 rounded-xl text-sm" placeholder="Fin" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5">ID Georef</label>
                                    <input type="text" value={formData.id_georef} onChange={(e) => setFormData({...formData, id_georef: e.target.value})} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-2xl text-sm" placeholder="Opcional" />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-6 py-3 border border-secondary-200 text-secondary-600 rounded-2xl font-bold hover:bg-secondary-50">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 disabled:opacity-50">
                                    {isSaving ? 'Guardando...' : (editingItem ? 'Guardar Cambios' : 'Crear Calle')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal 
                isOpen={confirmConfig.isOpen} 
                title={confirmConfig.title} 
                message={confirmConfig.message} 
                onConfirm={confirmConfig.onConfirm} 
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
                variant="danger"
            />
        </div>
    );
};

export default CalleManagement;
