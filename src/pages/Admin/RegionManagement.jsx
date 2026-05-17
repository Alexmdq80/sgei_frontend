import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import regionService from '../../services/regionService';
import geografiaService from '../../services/geografiaService';
import SearchableSelect from '../../components/SearchableSelect';
import ConfirmationModal from '../../components/ConfirmationModal';
import { parseError } from '../../utils/errorParser';

const RegionManagement = () => {
    const { showNotification } = useAuth();
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({});
    const [provincias, setProvincias] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        numero: '',
        provincia_id: '',
        vigente: true
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
            const response = await regionService.getAll({
                search: debouncedSearch,
                page: page,
                per_page: 15
            });
            setItems(response.data || response);
            setPagination(response.data ? response : {});
        } catch (error) {
            showNotification('Error al cargar las regiones.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const response = await geografiaService.getProvincias();
            setProvincias(response.data || response);
        } catch (error) {
            showNotification('Error al cargar catálogos.', 'error');
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
                numero: item.numero,
                provincia_id: item.provincia_id,
                vigente: item.vigente === 1 || item.vigente === true
            });
        } else {
            setEditingItem(null);
            setFormData({
                numero: '',
                provincia_id: '',
                vigente: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ numero: '', provincia_id: '', vigente: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (editingItem) {
                await regionService.update(editingItem.id, formData);
                showNotification('Región actualizada correctamente.', 'success');
            } else {
                await regionService.create(formData);
                showNotification('Región creada correctamente.', 'success');
            }
            fetchItems();
            handleCloseModal();
        } catch (error) {
            showNotification(parseError(error, 'Error al guardar la región.'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (item) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Región',
            message: `¿Está seguro que desea eliminar la región "${item.numero}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                try {
                    await regionService.delete(item.id);
                    showNotification('Región eliminada correctamente.', 'success');
                    fetchItems();
                } catch (error) {
                    showNotification('Error al eliminar la región.', 'error');
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
                    <h1 className="text-2xl font-bold text-secondary-900">Gestión de Regiones Educativas</h1>
                    <p className="text-secondary-500 text-sm mt-1">Administre las regiones educativas y su pertenencia provincial.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Nueva Región
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
                            placeholder="Buscar por número o provincia..." 
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
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">Número de Región</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">Provincia</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100 text-center">Estado</th>
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
                                        <td className="px-6 py-4 text-sm font-bold text-secondary-900 uppercase">REGIÓN {item.numero}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-secondary-100 text-secondary-700 text-[10px] font-black uppercase tracking-wider border border-secondary-200">
                                                {item.provincia?.nombre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.vigente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.vigente ? 'Vigente' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal(item)} className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title="Editar"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.828 2.828 0 114 4L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                <button onClick={() => handleDelete(item)} className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-secondary-500 font-medium">No se encontraron regiones.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {!isLoading && pagination.last_page > 1 && (
                    <div className="px-6 py-4 bg-secondary-50/50 border-t border-secondary-100 flex items-center justify-between">
                        <p className="text-xs text-secondary-500 font-medium">
                            Mostrando <span className="font-bold text-secondary-700">{pagination.from}</span> a <span className="font-bold text-secondary-700">{pagination.to}</span> de <span className="font-bold text-secondary-700">{pagination.total}</span> regiones
                        </p>
                        <div className="flex gap-2">
                            <button 
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="px-4 py-1.5 bg-white border border-secondary-200 rounded-xl text-xs font-bold text-secondary-600 hover:bg-secondary-50 transition-colors disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button 
                                disabled={page === pagination.last_page}
                                onClick={() => setPage(page + 1)}
                                className="px-4 py-1.5 bg-white border border-secondary-200 rounded-xl text-xs font-bold text-secondary-600 hover:bg-secondary-50 transition-colors disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
                        <div className="px-8 py-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900">{editingItem ? 'Editar Región' : 'Nueva Región'}</h3>
                                <p className="text-secondary-500 text-xs mt-1">Complete los datos de la región educativa.</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-secondary-200/50 rounded-xl transition-colors text-secondary-400 hover:text-secondary-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <SearchableSelect 
                                    label="Provincia"
                                    options={provincias}
                                    value={formData.provincia_id}
                                    onChange={(e) => setFormData({...formData, provincia_id: e.target.value})}
                                    placeholder="Seleccionar Provincia..."
                                />

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5 ml-1">Número / Identificador de Región</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.numero}
                                        onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                                        placeholder="Ej: 1, I, II, 01"
                                    />
                                </div>

                                <div className="flex items-center gap-2 ml-1">
                                    <input 
                                        type="checkbox" 
                                        id="vigente"
                                        checked={formData.vigente}
                                        onChange={(e) => setFormData({...formData, vigente: e.target.checked})}
                                        className="w-4 h-4 text-primary-600 bg-secondary-100 border-secondary-300 rounded focus:ring-primary-500"
                                    />
                                    <label htmlFor="vigente" className="text-sm font-bold text-secondary-700 select-none">Región Vigente</label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-6 py-3 border border-secondary-200 text-secondary-600 rounded-2xl font-bold hover:bg-secondary-50 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Guardando...
                                        </>
                                    ) : (
                                        editingItem ? 'Guardar Cambios' : 'Crear Región'
                                    )}
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

export default RegionManagement;
