import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import sexoService from '../../services/sexoService';
import ConfirmationModal from '../../components/ConfirmationModal';

const SexoManagement = () => {
    const { showNotification } = useAuth();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        nombre: '',
        letra: '',
        orden: 100,
        vigente: true
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
            const data = await sexoService.getAll();
            setItems(data);
        } catch (error) {
            showNotification(parseError(error, 'Error al cargar los sexos.'), 'error');
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
                letra: item.letra || '',
                orden: item.orden || 100,
                vigente: item.vigente === 1 || item.vigente === true
            });
        } else {
            setEditingItem(null);
            setFormData({ nombre: '', letra: '', orden: 100, vigente: true });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (editingItem) {
                await sexoService.update(editingItem.id, formData);
                showNotification('Sexo actualizado correctamente.', 'success');
            } else {
                await sexoService.create(formData);
                showNotification('Sexo creado correctamente.', 'success');
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            showNotification(parseError(error), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Sexo',
            message: '¿Estás seguro de que deseas eliminar este registro?',
            onConfirm: async () => {
                try {
                    await sexoService.delete(id);
                    showNotification('Registro eliminado.', 'success');
                    fetchData();
                } catch (error) {
                    showNotification(parseError(error, 'No se puede eliminar el registro porque está en uso.'), 'error');
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
        <div className="container mx-auto px-4 py-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900">Gestión de Sexos</h1>
                    <p className="text-sm font-medium text-secondary-500">Administra las categorías de sexo registradas en el sistema.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl transition-all font-bold shadow-lg shadow-primary-200"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Registro
                </button>
            </header>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-100 mb-6">
                <div className="relative max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-secondary-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        className="block w-full pl-11 pr-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-100">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-secondary-400 uppercase tracking-widest w-16">Orden</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-secondary-400 uppercase tracking-widest w-16 text-center">Letra</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-secondary-400 uppercase tracking-widest">Nombre</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-secondary-400 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-secondary-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-100">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-5">
                                            <div className="h-4 bg-secondary-100 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-bold text-secondary-400">{item.orden}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-xs font-black text-primary-600 bg-primary-50 w-8 h-8 flex items-center justify-center rounded-lg mx-auto border border-primary-100">{item.letra}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-secondary-900">{item.nombre}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${
                                                item.vigente 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                                {item.vigente ? 'Vigente' : 'No Vigente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <p className="text-secondary-400 font-bold">No se encontraron registros.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeInUp">
                        <form onSubmit={handleSubmit}>
                            <div className="px-8 pt-8 pb-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-secondary-900">
                                        {editingItem ? 'Editar Sexo' : 'Nuevo Sexo'}
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-2 text-secondary-400 hover:text-secondary-600 rounded-xl transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1 ml-1">
                                                Nombre
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                                placeholder="Masculino, Femenino..."
                                            />
                                        </div>

                                        <div className="flex-none">
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1 ml-1 text-center">
                                                Letra
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                maxLength={1}
                                                className="w-16 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-center uppercase"
                                                value={formData.letra}
                                                onChange={(e) => setFormData({...formData, letra: e.target.value.toUpperCase()})}
                                                placeholder="M"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1 ml-1">
                                            Orden de Prioridad
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            max="255"
                                            className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            value={formData.orden}
                                            onChange={(e) => setFormData({...formData, orden: e.target.value})}
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-secondary-50 border border-secondary-200 rounded-xl">
                                        <div className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ring-0">
                                            <input
                                                type="checkbox"
                                                className="peer absolute h-0 w-0 opacity-0"
                                                id="vigente-toggle-sex"
                                                checked={formData.vigente}
                                                onChange={(e) => setFormData({...formData, vigente: e.target.checked})}
                                            />
                                            <label 
                                                htmlFor="vigente-toggle-sex"
                                                className={`absolute inset-0 cursor-pointer rounded-full transition-colors duration-200 ${
                                                    formData.vigente ? 'bg-primary-600' : 'bg-secondary-300'
                                                }`}
                                            >
                                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    formData.vigente ? 'translate-x-5' : 'translate-x-0'
                                                }`} />
                                            </label>
                                        </div>
                                        <label htmlFor="vigente-toggle-sex" className="text-sm font-bold text-secondary-700 cursor-pointer select-none">
                                            Sexo Vigente
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="px-8 py-6 bg-secondary-50 flex flex-row-reverse gap-3">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl transition-all font-bold shadow-lg shadow-primary-200 disabled:opacity-50"
                                >
                                    {isSaving ? 'Procesando...' : (editingItem ? 'Actualizar' : 'Guardar')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-white border border-secondary-200 text-secondary-600 px-6 py-3 rounded-xl transition-all font-bold hover:bg-secondary-100"
                                >
                                    Cancelar
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
                variant="danger"
            />
        </div>
    );
};

export default SexoManagement;
