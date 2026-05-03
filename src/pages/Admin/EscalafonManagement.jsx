import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import escalafonService from '../../services/escalafonService';
import ConfirmationModal from '../../components/ConfirmationModal';

const EscalafonManagement = () => {
    const { showNotification } = useAuth();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        nombre: '',
        orden: '',
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
            const data = await escalafonService.getAll();
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            showNotification(parseError(error, 'Error al cargar los escalafones.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                nombre: item.nombre,
                orden: item.orden || '',
                vigente: !!item.vigente
            });
        } else {
            setEditingItem(null);
            setFormData({
                nombre: '',
                orden: '',
                vigente: true
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
                await escalafonService.update(editingItem.id, formData);
                showNotification('Escalafón actualizado correctamente.', 'success');
            } else {
                await escalafonService.create(formData);
                showNotification('Escalafón creado correctamente.', 'success');
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
            title: 'Eliminar Escalafón',
            message: `¿Está seguro que desea eliminar "${item.nombre}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                try {
                    await escalafonService.delete(item.id);
                    showNotification('Registro eliminado correctamente.', 'success');
                    fetchItems();
                } catch (error) {
                    showNotification(parseError(error, 'Error al eliminar el registro.'), 'error');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const filteredItems = items.filter(item => 
        item.nombre.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900">Gestión de Escalafones</h1>
                    <p className="text-secondary-500 text-sm mt-1">Administre los escalafones del sistema (Docente, Auxiliar, etc.).</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Nuevo Escalafón
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
                            placeholder="Buscar escalafón..." 
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
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest border-b border-secondary-100 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="3" className="px-6 py-4"><div className="h-4 bg-secondary-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-secondary-900 uppercase">{item.nombre}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                item.vigente 
                                                ? 'bg-green-50 text-green-700 border-green-100' 
                                                : 'bg-red-50 text-red-700 border-red-100'
                                            }`}>
                                                {item.vigente ? 'Vigente' : 'No Vigente'}
                                            </span>
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
                                    <td colSpan="3" className="px-6 py-12 text-center text-secondary-500 font-medium">No se encontraron escalafones.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                        <div className="px-8 py-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900">{editingItem ? 'Editar Escalafón' : 'Nuevo Escalafón'}</h3>
                                <p className="text-secondary-500 text-xs mt-1">Defina el nombre del escalafón.</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-secondary-200/50 rounded-xl transition-colors text-secondary-400 hover:text-secondary-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-secondary-500 uppercase tracking-widest mb-1.5">Nombre</label>
                                    <input type="text" required value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-2xl text-sm" placeholder="Ej: DOCENTE, AUXILIAR" />
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-2xl border border-secondary-100">
                                    <span className="text-sm font-bold text-secondary-700">¿Se encuentra vigente?</span>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, vigente: !formData.vigente})}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${formData.vigente ? 'bg-primary-600' : 'bg-secondary-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.vigente ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-6 py-3 border border-secondary-200 text-secondary-600 rounded-2xl font-bold hover:bg-secondary-50">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 disabled:opacity-50">
                                    {isSaving ? 'Guardando...' : (editingItem ? 'Guardar Cambios' : 'Crear Escalafón')}
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

export default EscalafonManagement;
