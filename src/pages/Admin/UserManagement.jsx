import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import escuelaService from '../../services/escuelaService';
import documentoTipoService from '../../services/documentoTipoService';
import roleService from '../../services/roleService';
import SearchableSelect from '../../components/SearchableSelect';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Página de administración integral de usuarios.
 * Incluye el listado/CRUD de usuarios y la gestión de solicitudes de unión con asignación de roles.
 */
const UserManagement = () => {
    const { user, showNotification } = useAuth();
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'requests'
    
    // Estados para Usuarios
    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(true);
    const [userSearch, setUserUsersSearch] = useState('');
    const [filterCueAnexo, setFilterCueAnexo] = useState('');
    const [filterVinculation, setFilterVinculation] = useState('all'); // 'all' | 'vinculated' | 'pending'
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    
    // Estados para Solicitudes
    const [requests, setRequests] = useState([]);
    const [isRequestsLoading, setIsRequestsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    // Catálogos
    const [docTipos, setDocTipos] = useState([]);
    const [rolEscolares, setRolEscolares] = useState([]);
    const [escuelasCatalog, setEscuelasCatalog] = useState([]);

    // Estados para Formulario (Modal)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        documento_tipo_id: '',
        documento_numero: '',
        es_administrador: false
    });

    // Estados para el Modal de Confirmación Global
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirmar',
        variant: 'primary',
        onConfirm: () => {},
        showInput: false,
        inputPlaceholder: '',
        isLoading: false
    });

    const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

    const openConfirm = (config) => {
        setConfirmConfig({
            isOpen: true,
            title: config.title || '¿Estás seguro?',
            message: config.message || '',
            confirmText: config.confirmText || 'Confirmar',
            variant: config.variant || 'primary',
            onConfirm: config.onConfirm,
            showInput: config.showInput || false,
            inputPlaceholder: config.inputPlaceholder || '',
            isLoading: false
        });
    };

    // --- CARGA DE DATOS ---

    const fetchUsers = async (page = 1) => {
        try {
            setIsUsersLoading(true);
            const response = await userService.getAll({ 
                search: userSearch, 
                cue_anexo: filterCueAnexo,
                vinculation: filterVinculation,
                page,
                per_page: 10 
            });
            setUsers(response.data || []);
            setPagination(response.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            showNotification('Error al cargar el listado de usuarios.', 'error');
        } finally {
            setIsUsersLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            setIsRequestsLoading(true);
            const response = await escuelaService.getPendingRequests();
            // Añadir un estado local para el rol seleccionado en cada solicitud
            const requestsWithSelection = (response.data || []).map(r => ({
                ...r,
                selected_role_id: r.role?.id || 5
            }));
            setRequests(requestsWithSelection);
        } catch (error) {
            console.error('Error al cargar solicitudes:', error);
            showNotification('No se pudieron cargar las solicitudes pendientes.', 'error');
        } finally {
            setIsRequestsLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [docs, roles] = await Promise.all([
                documentoTipoService.getAll(),
                roleService.getAll()
            ]);
            setDocTipos(docs);
            setRolEscolares(roles);
        } catch (error) {
            console.error('Error al cargar catálogos:', error);
        }
    };

    useEffect(() => {
        // Evitamos parpadeo y peticiones innecesarias: 
        // Solo filtramos si el CUE está vacío o si tiene la longitud completa (9 dígitos)
        const isCueEmpty = filterCueAnexo.length === 0;
        const isCueComplete = filterCueAnexo.length === 9;

        if (activeTab === 'users') {
            if (isCueEmpty || isCueComplete) {
                fetchUsers(1);
            }
        }
        
        if (activeTab === 'requests') fetchRequests();
    }, [activeTab, filterCueAnexo, filterVinculation]);

    useEffect(() => {
        fetchCatalogs();
    }, []);

    // --- LÓGICA DE FILTRADO DE ROLES ---
    
    const filteredRoles = useMemo(() => {
        const hierarchicalRoleNames = ['director', 'vicedirector', 'secretario', 'prosecretario'];
        
        if (!user) return [];
        
        if (user.es_administrador) {
            // El Super Admin solo gestiona roles jerárquicos
            return rolEscolares.filter(r => hierarchicalRoleNames.includes(r.name));
        } else {
            // Los directivos de escuela solo gestionan roles operativos
            return rolEscolares.filter(r => !hierarchicalRoleNames.includes(r.name));
        }
    }, [user, rolEscolares]);

    // --- ACCIONES DE USUARIOS (CRUD) ---

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(1);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            nombre: '',
            email: '',
            password: '',
            documento_tipo_id: '',
            documento_numero: '',
            es_administrador: false
        });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            nombre: user.nombre || '',
            email: user.email || '',
            password: '', 
            documento_tipo_id: user.documento_tipo_id || '',
            documento_numero: user.documento_numero || '',
            es_administrador: !!user.es_administrador
        });
        setIsModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await userService.update(editingUser.id, formData);
                showNotification('Usuario actualizado con éxito.', 'success');
            } else {
                await userService.create(formData);
                showNotification('Usuario creado con éxito.', 'success');
            }
            setIsModalOpen(false);
            fetchUsers(pagination.current_page);
        } catch (error) {
            console.error('Error en el formulario de usuario:', error);
            const msg = error.response?.data?.error || error.response?.data?.message || 'Ocurrió un error al procesar el usuario.';
            showNotification(msg, 'error');
        }
    };

    const handleDeleteUser = async (id) => {
        openConfirm({
            title: '¿Eliminar usuario?',
            message: 'Esta acción aplicará un Soft Delete. El usuario podrá ser recuperado posteriormente por un administrador de base de datos.',
            confirmText: 'Eliminar',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                    await userService.delete(id);
                    showNotification('Usuario eliminado con éxito.', 'success');
                    fetchUsers(pagination.current_page);
                    closeConfirm();
                } catch (error) {
                    showNotification('Error al eliminar el usuario.', 'error');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const handleUpdateUserLink = async (requestId, roleId) => {
        try {
            setProcessingId(requestId);
            await escuelaService.updateLink(requestId, roleId);
            showNotification('Rol institucional actualizado.', 'success');
            // Refrescar usuario editando si es necesario
            if (editingUser) {
                const updatedUsers = users.map(u => {
                    if (u.id === editingUser.id) {
                        return {
                            ...u,
                            escuela_usuarios: u.escuela_usuarios.map(l => 
                                l.id === requestId ? { ...l, role_id: roleId, role: rolEscolares.find(r => r.id == roleId) } : l
                            )
                        };
                    }
                    return u;
                });
                setUsers(updatedUsers);
                setEditingUser(updatedUsers.find(u => u.id === editingUser.id));
            }
        } catch (error) {
            showNotification('Error al actualizar el rol.', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    // --- ACCIONES DE SOLICITUDES (JOIN REQUESTS) ---

    const handleRequestRolChange = (requestId, roleId) => {
        setRequests(requests.map(r => 
            r.id === requestId ? { ...r, selected_role_id: parseInt(roleId) } : r
        ));
    };

    const handleApprove = (request) => {
        const roleName = rolEscolares.find(r => r.id === request.selected_role_id)?.name;
        openConfirm({
            title: 'Aprobar Acceso',
            message: `¿Confirmas el acceso de ${request.usuario.nombre} como ${roleName}?`,
            confirmText: 'Aprobar Acceso',
            variant: 'success',
            onConfirm: async () => {
                try {
                    setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                    await escuelaService.approveRequest(request.id, request.selected_role_id);
                    showNotification('Solicitud aprobada con éxito.', 'success');
                    setRequests(requests.filter(r => r.id !== request.id));
                    closeConfirm();
                } catch (error) {
                    showNotification('Error al procesar la aprobación.', 'error');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const handleReject = (id) => {
        openConfirm({
            title: 'Rechazar Solicitud',
            message: 'Por favor, indica el motivo del rechazo para informar al usuario.',
            confirmText: 'Rechazar',
            variant: 'danger',
            showInput: true,
            inputPlaceholder: 'Ej: La documentación adjunta no es legible...',
            onConfirm: async (reason) => {
                try {
                    setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                    await escuelaService.rejectRequest(id, reason);
                    showNotification('Solicitud rechazada.', 'info');
                    setRequests(requests.filter(r => r.id !== id));
                    closeConfirm();
                } catch (error) {
                    showNotification('Error al procesar el rechazo.', 'error');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-secondary-500 mt-1 font-medium">Panel integral para la administración de cuentas y roles institucionales</p>
                </div>
                {activeTab === 'users' && (
                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Nuevo Usuario
                    </button>
                )}
            </div>

            {/* Selector de Pestañas */}
            <div className="flex gap-2 p-1 bg-secondary-100 rounded-2xl w-full md:w-fit">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        activeTab === 'users' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                    }`}
                >
                    Todos los Usuarios
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'requests' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                    }`}
                >
                    Solicitudes de Unión
                    {requests.length > 0 && (
                        <span className="bg-primary-100 text-primary-600 text-[10px] px-1.5 py-0.5 rounded-full">
                            {requests.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Contenido: Listado de Usuarios */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                    {/* Filtros */}
                    <div className="p-6 border-b border-secondary-100 bg-secondary-50/50 space-y-4">
                        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                            {/* Buscador */}
                            <form onSubmit={handleSearch} className="flex gap-3 w-full lg:max-w-sm">
                                <div className="relative flex-1">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, email o DNI..."
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-medium"
                                        value={userSearch}
                                        onChange={(e) => setUserUsersSearch(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="px-4 py-2 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors shadow-sm">
                                    Buscar
                                </button>
                            </form>

                            {/* Selectores Adicionales */}
                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                {/* Filtro por CUE */}
                                <div className="flex-1 lg:flex-none relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="CUE Escuela..."
                                        className="w-full lg:w-48 pl-9 pr-4 py-2 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        value={filterCueAnexo}
                                        onChange={(e) => setFilterCueAnexo(e.target.value)}
                                    />
                                </div>

                                {/* Toggle de Vinculación */}
                                <div className="flex p-1 bg-secondary-200 rounded-xl w-full lg:w-auto">
                                    <button
                                        onClick={() => setFilterVinculation('all')}
                                        className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            filterVinculation === 'all' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                                        }`}
                                    >
                                        Ambas
                                    </button>
                                    <button
                                        onClick={() => setFilterVinculation('vinculated')}
                                        className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            filterVinculation === 'vinculated' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                                        }`}
                                    >
                                        Vinculadas
                                    </button>
                                    <button
                                        onClick={() => setFilterVinculation('pending')}
                                        className={`flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            filterVinculation === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
                                        }`}
                                    >
                                        Pendientes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isUsersLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-secondary-500 font-medium">Cargando usuarios...</p>
                        </div>
                    ) : users.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Identificación</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Vinculaciones</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-secondary-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                                                        ) : (
                                                            user.nombre.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-secondary-900">{user.nombre}</p>
                                                            {user.es_administrador && (
                                                                <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Admin</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-secondary-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-secondary-800">
                                                    {user.documento_numero || 'Sin DNI'}
                                                </p>
                                                <p className="text-[10px] text-secondary-500 font-medium">
                                                    {user.documento_tipo?.sigla || 'No especificado'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.escuela_usuarios?.length > 0 ? (
                                                    <div className="flex flex-col gap-2">
                                                        {user.escuela_usuarios.map(link => (
                                                            <div key={link.id} className="flex flex-col p-2 rounded-xl bg-secondary-50 border border-secondary-200">
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className="text-[10px] font-black text-secondary-900 uppercase truncate max-w-[120px]">
                                                                        {link.escuela.nombre}
                                                                    </span>
                                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${
                                                                        link.verified_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                                    }`}>
                                                                        {link.verified_at ? 'Activo' : 'Pendiente'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-[9px] font-bold">
                                                                    <span className="text-secondary-500">CUE: {link.escuela.cue_anexo}</span>
                                                                    <span className="text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 uppercase">
                                                                        {link.role?.name || 'S/R'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-secondary-400 italic">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
                                                        </svg>
                                                        <span className="text-[10px] font-medium">Sin vinculación</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                    ) : (
                        <div className="p-20 text-center text-secondary-500">
                            No se encontraron usuarios que coincidan con la búsqueda.
                        </div>
                    )}

                    {/* Paginación */}
                    {pagination.last_page > 1 && (
                        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
                            <p className="text-xs text-secondary-500 font-bold">Total: {pagination.total} usuarios</p>
                            <div className="flex gap-2">
                                <button
                                    disabled={pagination.current_page === 1}
                                    onClick={() => fetchUsers(pagination.current_page - 1)}
                                    className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                                    Página {pagination.current_page} de {pagination.last_page}
                                </span>
                                <button
                                    disabled={pagination.current_page === pagination.last_page}
                                    onClick={() => fetchUsers(pagination.current_page + 1)}
                                    className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Contenido: Solicitudes de Unión (Join Requests) */}
            {activeTab === 'requests' && (
                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                    {isRequestsLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-secondary-500 font-medium">Cargando solicitudes...</p>
                        </div>
                    ) : requests.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Institución</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Asignar Rol</th>
                                        <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {requests.map((request) => (
                                        <tr key={request.id} className="hover:bg-secondary-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                                                        {request.usuario.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-secondary-900">{request.usuario.nombre}</p>
                                                        <p className="text-xs text-secondary-500">{request.usuario.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-secondary-800">{request.escuela.nombre}</p>
                                                <p className="text-xs text-secondary-500">CUE: {request.escuela.cue_anexo}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    className="px-3 py-1.5 bg-secondary-50 border border-secondary-300 rounded-lg text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-500"
                                                    value={request.selected_role_id}
                                                    onChange={(e) => handleRequestRolChange(request.id, e.target.value)}
                                                >
                                                    {filteredRoles.map(rol => (
                                                        <option key={rol.id} value={rol.id}>{rol.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleReject(request.id)}
                                                        disabled={processingId === request.id}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Rechazar"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(request)}
                                                        disabled={processingId === request.id}
                                                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {processingId === request.id ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                        Aprobar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Todo al día</h3>
                            <p className="text-secondary-500 max-w-sm mx-auto">No hay solicitudes de vinculación pendientes de revisión.</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL PARA CREAR / EDITAR USUARIO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                            <h2 className="text-xl font-black text-secondary-900">
                                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1">
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                {/* Datos Básicos */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2">Información de Cuenta</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label htmlFor="nombre" className="text-xs font-black text-secondary-500 uppercase tracking-wider">Nombre de Usuario (Alias)</label>
                                            <input
                                                id="nombre"
                                                type="text"
                                                name="nombre"
                                                required
                                                className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-secondary-800"
                                                value={formData.nombre}
                                                onChange={handleFormChange}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="email" className="text-xs font-black text-secondary-500 uppercase tracking-wider">Email</label>
                                            <input
                                                id="email"
                                                type="email"
                                                name="email"
                                                required
                                                className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-secondary-800"
                                                value={formData.email}
                                                onChange={handleFormChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label htmlFor="documento_tipo_id" className="text-xs font-black text-secondary-500 uppercase tracking-wider">Tipo Documento</label>
                                            <select
                                                id="documento_tipo_id"
                                                name="documento_tipo_id"
                                                className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-secondary-800"
                                                value={formData.documento_tipo_id}
                                                onChange={handleFormChange}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {docTipos.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="documento_numero" className="text-xs font-black text-secondary-500 uppercase tracking-wider">Número Documento</label>
                                            <input
                                                id="documento_numero"
                                                type="text"
                                                name="documento_numero"
                                                className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-secondary-800"
                                                value={formData.documento_numero}
                                                onChange={handleFormChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="password" title="password-label" className="text-xs font-black text-secondary-500 uppercase tracking-wider">
                                            Contraseña {editingUser && '(Opcional)'}
                                        </label>
                                        <input
                                            id="password"
                                            type="password"
                                            name="password"
                                            required={!editingUser}
                                            placeholder={editingUser ? 'Dejar en blanco para no cambiar' : ''}
                                            className="w-full px-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-secondary-800"
                                            value={formData.password}
                                            onChange={handleFormChange}
                                        />
                                    </div>

                                    {user?.es_administrador && (
                                        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-2xl border border-primary-100">
                                            <input
                                                type="checkbox"
                                                name="es_administrador"
                                                id="es_administrador"
                                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                                                checked={formData.es_administrador}
                                                onChange={handleFormChange}
                                            />
                                            <label htmlFor="es_administrador" className="text-sm font-bold text-primary-800 cursor-pointer">
                                                Asignar permisos de administrador (Superuser)
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Vinculaciones Institucionales (Solo Edición) */}
                                {editingUser && (
                                    <div className="space-y-4 pt-4">
                                        <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2">Roles Institucionales</h3>
                                        {editingUser.escuela_usuarios?.length > 0 ? (
                                            <div className="space-y-3">
                                                {editingUser.escuela_usuarios.map(link => (
                                                    <div key={link.id} className="flex items-center justify-between p-3 bg-secondary-50 border border-secondary-200 rounded-xl">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-secondary-900">{link.escuela.nombre}</span>
                                                            <span className="text-xs text-secondary-500 italic">CUE: {link.escuela.cue_anexo}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                className="px-3 py-1.5 bg-white border border-secondary-300 rounded-lg text-xs font-bold text-secondary-700 outline-none focus:ring-2 focus:ring-primary-500"
                                                                value={link.role_id}
                                                                onChange={(e) => handleUpdateUserLink(link.id, e.target.value)}
                                                                disabled={processingId === link.id}
                                                            >
                                                                {filteredRoles.map(rol => (
                                                                    <option key={rol.id} value={rol.id}>{rol.name}</option>
                                                                ))}
                                                            </select>
                                                            {processingId === link.id && (
                                                                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-secondary-50 rounded-xl border border-secondary-100 text-center">
                                                <p className="text-xs text-secondary-400 font-medium italic">El usuario no tiene vinculaciones escolares activas.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-3 bg-secondary-100 text-secondary-600 rounded-xl font-bold hover:bg-secondary-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                                    >
                                        {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN GLOBAL */}
            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                variant={confirmConfig.variant}
                showInput={confirmConfig.showInput}
                inputPlaceholder={confirmConfig.inputPlaceholder}
                isLoading={confirmConfig.isLoading}
            />
        </div>
    );
};

export default UserManagement;
