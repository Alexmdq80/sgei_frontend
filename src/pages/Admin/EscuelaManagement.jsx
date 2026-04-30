import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import escuelaService from '../../services/escuelaService';
import ambitoService from '../../services/ambitoService';
import dependenciaService from '../../services/dependenciaService';
import escuelaTipoService from '../../services/escuelaTipoService';
import geografiaService from '../../services/geografiaService';
import ConfirmationModal from '../../components/ConfirmationModal';
import SearchableSelect from '../../components/SearchableSelect';

/**
 * Gestión Integral de Instituciones Educativas (Escuelas).
 * Ubicado en Panel General > Escuelas.
 */
const EscuelaManagement = () => {
    const { showNotification } = useAuth();
    const [escuelas, setEscuelas] = useState([]);
    const [meta, setMeta] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEscuela, setEditingEscuela] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    
    // Catálogos
    const [ambitos, setAmbitos] = useState([]);
    const [dependencias, setDependencias] = useState([]);
    const [sectores, setSectores] = useState([]);
    
    // Geografía
    const [provincias, setProvincias] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [selectedProvincia, setSelectedProvincia] = useState('');
    const [selectedDepartamento, setSelectedDepartamento] = useState('');

    const [formData, setFormData] = useState({
        nombre: '',
        numero: '',
        cue_anexo: '',
        clave_provincial: '',
        localidad_id: '',
        ambito_id: '',
        dependencia_id: '',
        sector_id: '',
        domicilio: '',
        telefono: '',
        email: '',
        codigo_postal: ''
    });

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'primary'
    });

    const fetchEscuelas = async () => {
        try {
            setIsLoading(true);
            const response = await escuelaService.getAllAdmin({ 
                search: searchTerm, 
                page: page 
            });
            setEscuelas(response.data);
            setMeta(response);
        } catch (error) {
            showNotification('Error al cargar las escuelas.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const results = await Promise.allSettled([
                ambitoService.getAll({ per_page: 500 }),
                dependenciaService.getAll({ per_page: 500 }),
                escuelaTipoService.getAll({ per_page: 500 }),
                geografiaService.getProvincias({ per_page: 500 })
            ]);
            
            if (results[0].status === 'fulfilled') {
                const val = results[0].value;
                setAmbitos(val.data || val);
            }
            if (results[1].status === 'fulfilled') {
                const val = results[1].value;
                setDependencias(val.data || val);
            }
            if (results[2].status === 'fulfilled') {
                const val = results[2].value;
                setSectores(val.data || val);
            }
            if (results[3].status === 'fulfilled') {
                const val = results[3].value;
                setProvincias(val.data || val);
            }

        } catch (error) {
            console.error("Error cargando catálogos", error);
            showNotification('Error al cargar algunos catálogos.', 'error');
        }
    };

    // Cargar departamentos cuando cambia la provincia
    useEffect(() => {
        if (selectedProvincia) {
            geografiaService.getDepartamentos(selectedProvincia, { per_page: 500 })
                .then(res => setDepartamentos(res.data || res))
                .catch(() => showNotification('Error al cargar departamentos.', 'error'));
        } else {
            setDepartamentos([]);
            setLocalidades([]);
        }
    }, [selectedProvincia]);

    // Cargar localidades cuando cambia el departamento
    useEffect(() => {
        if (selectedDepartamento) {
            geografiaService.getLocalidades(selectedDepartamento, { per_page: 500 })
                .then(res => setLocalidades(res.data || res))
                .catch(() => showNotification('Error al cargar localidades.', 'error'));
        } else {
            setLocalidades([]);
        }
    }, [selectedDepartamento]);

    useEffect(() => {
        fetchEscuelas();
    }, [page]);

    useEffect(() => {
        fetchCatalogs();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchEscuelas();
    };

    const handleOpenCreate = () => {
        setEditingEscuela(null);
        setSelectedProvincia('');
        setSelectedDepartamento('');
        setFormData({
            nombre: '', numero: '', cue_anexo: '', clave_provincial: '',
            localidad_id: '', ambito_id: '', dependencia_id: '', sector_id: '',
            domicilio: '', telefono: '', email: '', codigo_postal: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = async (escuela) => {
        try {
            const fullEscuela = await escuelaService.getById(escuela.id);
            setEditingEscuela(fullEscuela);
            
            // 1. Identificación básica y otros campos
            const baseFormData = {
                nombre: fullEscuela.nombre || '',
                numero: fullEscuela.numero || '',
                cue_anexo: fullEscuela.cue_anexo || '',
                clave_provincial: fullEscuela.clave_provincial || '',
                localidad_id: fullEscuela.localidad_id || '',
                ambito_id: fullEscuela.ambito_id || '',
                dependencia_id: fullEscuela.dependencia_id || '',
                sector_id: fullEscuela.sector_id || '',
                domicilio: fullEscuela.domicilio || '',
                telefono: fullEscuela.telefono || '',
                email: fullEscuela.email || '',
                codigo_postal: fullEscuela.codigo_postal || ''
            };

            // 2. Cargar jerarquía geográfica si existe
            if (fullEscuela.localidad?.departamento) {
                const dep = fullEscuela.localidad.departamento;
                const provId = dep.provincia_id;
                const depId = dep.id;

                // Seteamos provincia (esto disparará el useEffect de deps, pero lo manejaremos manual para velocidad)
                setSelectedProvincia(provId);
                
                // Cargamos y seteamos departamentos manual
                const deps = await geografiaService.getDepartamentos(provId);
                setDepartamentos(deps);
                setSelectedDepartamento(depId);
                
                // Cargamos y seteamos localidades manual
                const locs = await geografiaService.getLocalidades(depId);
                setLocalidades(locs);
            } else {
                setSelectedProvincia('');
                setSelectedDepartamento('');
                setDepartamentos([]);
                setLocalidades([]);
            }

            setFormData(baseFormData);
            setIsModalOpen(true);
        } catch (error) {
            showNotification('Error al cargar datos de la escuela.', 'error');
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEscuela) {
                await escuelaService.update(editingEscuela.id, formData);
                showNotification('Escuela actualizada con éxito.', 'success');
            } else {
                await escuelaService.create(formData);
                showNotification('Escuela creada con éxito.', 'success');
            }
            setIsModalOpen(false);
            fetchEscuelas();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Error al procesar la solicitud.', 'error');
        }
    };

    const handleDelete = (escuela) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Escuela',
            message: `¿Estás seguro de que deseas eliminar la escuela "${escuela.nombre}"? Esta acción no se puede deshacer.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await escuelaService.delete(escuela.id);
                    showNotification('Escuela eliminada con éxito.', 'success');
                    fetchEscuelas();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showNotification('Error al eliminar la escuela.', 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Instituciones Educativas</h1>
                    <p className="text-secondary-500 mt-1 font-medium">Gestión integral del padrón de escuelas del sistema</p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Escuela
                </button>
            </div>

            {/* Buscador */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary-200">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input 
                        type="text"
                        placeholder="Buscar por nombre, número o CUE..."
                        className="flex-grow px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="px-6 py-2 bg-secondary-800 text-white rounded-xl font-bold hover:bg-secondary-900 transition-colors">
                        Buscar
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-bold">Cargando escuelas...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Institución</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">CUE / Nro</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Localidad</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest">Dependencia / Sector</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-secondary-400 uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {escuelas.map((escuela) => (
                                        <tr key={escuela.id} className="hover:bg-secondary-50 transition-colors group text-xs">
                                            <td className="px-6 py-4">
                                                <p className="font-black text-secondary-900 uppercase">{escuela.nombre}</p>
                                                <p className="text-secondary-500 font-medium">{escuela.domicilio}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-secondary-700">{escuela.cue_anexo}</p>
                                                <p className="text-secondary-400">Nro: {escuela.numero}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-secondary-700 uppercase">
                                                    {escuela.localidad?.nombre}
                                                    <span className="block text-[9px] text-secondary-400 font-normal uppercase">{escuela.localidad?.departamento?.nombre}</span>
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold inline-block w-fit uppercase">
                                                        {escuela.dependencia?.nombre || 'S/D'}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded-md font-medium inline-block w-fit uppercase">
                                                        {escuela.sector?.nombre || 'S/S'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleOpenEdit(escuela)}
                                                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(escuela)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                        
                        {/* Paginación */}
                        {meta.last_page > 1 && (
                            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
                                <p className="text-xs text-secondary-500 font-medium">
                                    Mostrando {meta.from} a {meta.to} de {meta.total} escuelas
                                </p>
                                <div className="flex gap-1">
                                    <button 
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                        className="px-3 py-1 bg-white border border-secondary-200 rounded-lg text-secondary-600 disabled:opacity-50"
                                    >
                                        Anterior
                                    </button>
                                    <button 
                                        disabled={page === meta.last_page}
                                        onClick={() => setPage(page + 1)}
                                        className="px-3 py-1 bg-white border border-secondary-200 rounded-lg text-secondary-600 disabled:opacity-50"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal: Crear/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scaleIn flex flex-col">
                        <form onSubmit={handleSubmit} className="flex flex-col h-full">
                            <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                                <h2 className="text-xl font-black text-secondary-900">
                                    {editingEscuela ? 'Editar Escuela' : 'Nueva Escuela'}
                                </h2>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest border-b border-primary-100 pb-1">Identificación</h3>
                                    <div className="flex gap-4">
                                        {/* flex-1 hace que este div crezca para ocupar todo el espacio disponible */}
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">
                                                Nombre Institucional
                                            </label>
                                            <input 
                                                type="text" required
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none uppercase"
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                            />
                                        </div>

                                        {/* Este div solo ocupará el ancho de su contenido (el input de w-32) */}
                                        <div className="flex-none">
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">
                                                Número
                                            </label>
                                            <input 
                                                type="text" required
                                                maxLength={10}
                                                className="w-32 px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                                value={formData.numero}
                                                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">CUE Anexo</label>
                                            <input 
                                                type="text" required
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                                value={formData.cue_anexo}
                                                onChange={(e) => setFormData({...formData, cue_anexo: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Clave Provincial</label>
                                            <input 
                                                type="text"
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                                value={formData.clave_provincial}
                                                onChange={(e) => setFormData({...formData, clave_provincial: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Ámbito</label>
                                            <select 
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none text-xs uppercase"
                                                value={formData.ambito_id}
                                                onChange={(e) => setFormData({...formData, ambito_id: e.target.value})}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {ambitos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Dependencia</label>
                                            <select 
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none text-xs uppercase"
                                                value={formData.dependencia_id}
                                                onChange={(e) => setFormData({...formData, dependencia_id: e.target.value})}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Tipo de Escuela (Sector)</label>
                                        <select 
                                            className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none text-xs uppercase"
                                            value={formData.sector_id}
                                            onChange={(e) => setFormData({...formData, sector_id: e.target.value})}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {sectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest border-b border-primary-100 pb-1">Ubicación Geográfica</h3>
                                    
                                    <SearchableSelect 
                                        label="Provincia"
                                        options={provincias}
                                        value={selectedProvincia}
                                        onChange={(e) => {
                                            setSelectedProvincia(e.target.value);
                                            setSelectedDepartamento('');
                                            setFormData({...formData, localidad_id: ''});
                                        }}
                                        placeholder="Buscar Provincia..."
                                    />

                                    <SearchableSelect 
                                        label="Departamento / Distrito"
                                        options={departamentos}
                                        value={selectedDepartamento}
                                        disabled={!selectedProvincia}
                                        onChange={(e) => {
                                            setSelectedDepartamento(e.target.value);
                                            setFormData({...formData, localidad_id: ''});
                                        }}
                                        placeholder="Buscar Departamento..."
                                    />

                                    <SearchableSelect 
                                        label="Localidad"
                                        options={localidades}
                                        value={formData.localidad_id}
                                        disabled={!selectedDepartamento}
                                        onChange={(e) => setFormData({...formData, localidad_id: e.target.value})}
                                        placeholder="Buscar Localidad..."
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Domicilio</label>
                                            <input 
                                                type="text"
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none uppercase"
                                                value={formData.domicilio}
                                                onChange={(e) => setFormData({...formData, domicilio: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">CP</label>
                                            <input 
                                                type="text"
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                                value={formData.codigo_postal}
                                                onChange={(e) => setFormData({...formData, codigo_postal: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-4 pt-4 border-t border-secondary-100">
                                    <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest border-b border-primary-100 pb-1">Contacto Institucional</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Teléfono</label>
                                            <input 
                                                type="text"
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                                value={formData.telefono}
                                                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-secondary-400 uppercase mb-1">Email</label>
                                            <input 
                                                type="email"
                                                className="w-full px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-white border border-secondary-300 text-secondary-700 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-grow py-3 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 shadow-lg transition-all active:scale-[0.98]">
                                    {editingEscuela ? 'Guardar Cambios' : 'Crear Escuela'}
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

export default EscuelaManagement;
