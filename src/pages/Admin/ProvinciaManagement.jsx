import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import provinciaService from '../../services/provinciaService';
import nacionService from '../../services/nacionService';
import ConfirmationModal from '../../components/ConfirmationModal';

const ProvinciaManagement = () => {
    const { showNotification } = useAuth();
    const [items, setItems] = useState([]);
    const [naciones, setNaciones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        nombre: '',
        nacion_id: '',
        id_georef: '',
        iso_id: ''
    });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [provinciasData, nacionesData] = await Promise.all([
                provinciaService.getAll(),
                nacionService.getAll()
            ]);
            setItems(provinciasData);
            setNaciones(nacionesData);
        } catch (error) {
            showNotification('Error al cargar los datos.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                nombre: item.nombre,
                nacion_id: item.nacion_id,
                id_georef: item.id_georef || '',
                iso_id: item.iso_id || ''
            });
        } else {
            setEditingItem(null);
            setFormData({
                nombre: '',
                nacion_id: '',
                id_georef: '',
                iso_id: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ nombre: '', nacion_id: '', id_georef: '', iso_id: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (editingItem) {
                await provinciaService.update(editingItem.id, formData);
                showNotification('Provincia actualizada correctamente.', 'success');
            } else {
                await provinciaService.create(formData);
                showNotification('Provincia creada correctamente.', 'success');
            }
            fetchData();
            handleCloseModal();
        } catch (error) {
            const msg = error.response?.data?.error || 'Error al guardar la provincia.';
            showNotification(msg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (item) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Provincia',
            message: `¿Está seguro que desea eliminar la provincia "${item.nombre}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                try {
                    await provinciaService.delete(item.id);
                    showNotification('Provincia eliminada correctamente.', 'success');
                    fetchData();
                } catch (error) {
                    showNotification('Error al eliminar la provincia.', 'error');
                }
            }
        });
    };

    const filteredItems = items.filter(item => 
        item.nombre.toLowerCase().includes(search.toLowerCase()) ||
        item.nacion?.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (item.iso_id && item.iso_id.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900">Gestión de Provincias</h1>
                    <p className="text-secondary-500 text-sm mt-1">Administre el catálogo de estados y provincias por nación.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Nueva Provincia
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
                            placeholder="Buscar por nombre, nación o ISO ID..." 
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
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">Nación</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">ISO ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">ID Georef</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-4"><div className="h-4 bg-secondary-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-secondary-900">{item.nombre}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-secondary-100 text-secondary-700 text-[10px] font-black uppercase tracking-wider border border-secondary-200">
                                                {item.nacion?.nombre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600 font-mono">{item.iso_id || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-secondary-500 font-mono">{item.id_georef || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.828 2.828 0 114 4L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item)}
                                                    className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Eliminar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-12 h-12 text-secondary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                            <p className="text-secondary-500 font-medium">No se encontraron provincias.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
                        <div className="px-8 py-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900">{editingItem ? 'Editar Provincia' : 'Nueva Provincia'}</h3>
                                <p className="text-secondary-500 text-xs mt-1">Complete los datos de la provincia o estado.</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-secondary-200/50 rounded-xl transition-colors text-secondary-400 hover:text-secondary-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5 ml-1">Nación / País</label>
                                    <select 
                                        required
                                        value={formData.nacion_id}
                                        onChange={(e) => setFormData({...formData, nacion_id: e.target.value})}
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium appearance-none"
                                    >
                                        <option value="">Seleccione Nación...</option>
                                        {naciones.map(n => (
                                            <option key={n.id} value={n.id}>{n.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5 ml-1">Nombre de la Provincia</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                                        placeholder="Ej: BUENOS AIRES"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5 ml-1">ISO ID</label>
                                        <input 
                                            type="text" 
                                            value={formData.iso_id}
                                            onChange={(e) => setFormData({...formData, iso_id: e.target.value})}
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                                            placeholder="Ej: AR-B"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5 ml-1">ID Georef</label>
                                        <input 
                                            type="number" 
                                            value={formData.id_georef}
                                            onChange={(e) => setFormData({...formData, id_georef: e.target.value})}
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                                            placeholder="Ej: 6"
                                        />
                                    </div>
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
                                        editingItem ? 'Guardar Cambios' : 'Crear Provincia'
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
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
            />
        </div>
    );
};

export default ProvinciaManagement;
