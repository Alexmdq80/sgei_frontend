import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import userService from '../../services/userService';
import documentoTipoService from '../../services/documentoTipoService';
import ConfirmationModal from '../../components/ConfirmationModal';

/**
 * Página de administración integral de usuarios.
 * Incluye el listado/CRUD de usuarios y la gestión de roles institucionales.
 */
const UserManagement = () => {
    const { user: authUser, showNotification, hasPermission } = useAuth();
    
    const isSuperUser = authUser?.es_administrador || authUser?.roles?.some(r => r.name === 'superuser');
    const isConduccion = authUser?.roles?.some(r => ['director', 'vicedirector', 'secretario', 'prosecretario'].includes(r.name));
    const isJefeProvincial = authUser?.roles?.some(r => r.name === 'jefe_provincial');
    
    const hasAccess = isSuperUser || isConduccion || isJefeProvincial;
    
    // Estados para Usuarios
    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(true);
    const [isUpdatingRole, setIsUpdatingRole] = useState(null);
    const [userSearch, setUserSearch] = useState('');
    const [filterCueAnexo, setFilterCueAnexo] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    
    const [processingId, setProcessingId] = useState(null);

    // Catálogos
    const [docTipos, setDocTipos] = useState([]);

    // Estados para Formulario (Modal)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        documento_tipo_id: '',
        documento_numero: ''
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
                page,
                per_page: 10 
            });
            setUsers(response.data || []);
            setPagination(response.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            showNotification(parseError(error, 'Error al cargar el listado de usuarios.'), 'error');
        } finally {
            setIsUsersLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const docs = await documentoTipoService.getAll({ per_page: 500 });
            setDocTipos(docs.data || docs);
        } catch (error) {
            console.error('Error al cargar catálogos:', error);
        }
    };
    useEffect(() => {
        const isCueEmpty = filterCueAnexo.length === 0;
        const isCueComplete = filterCueAnexo.length === 9;

        if (isCueEmpty || isCueComplete) {
            fetchUsers(1);
        }
    }, [filterCueAnexo]);

    useEffect(() => {
        fetchCatalogs();
    }, []);

    // --- ACCIONES DE USUARIOS (GESTIÓN) ---

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(1);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            nombre: user.nombre || '',
            email: user.email || '',
            documento_tipo_id: user.documento_tipo_id || '',
            documento_numero: user.documento_numero || ''
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
        if (!editingUser) return;

        try {
            await userService.update(editingUser.id, formData);
            showNotification('Usuario actualizado con éxito.', 'success');
            setIsModalOpen(false);
            fetchUsers(pagination.current_page);
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            showNotification(parseError(error, 'Ocurrió un error al procesar el usuario.'), 'error');
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
                    showNotification(parseError(error, 'Error al eliminar el usuario.'), 'error');
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const handleConfirmVinculation = async (user) => {
        openConfirm({
            title: 'Confirmar Vinculación al Padrón',
            message: `¿Confirmas que el usuario ${user.nombre} (${user.email}) coincide con el registro del padrón detectado automáticamente para el documento ${user.documento_numero}?`,
            confirmText: 'Confirmar y Activar',
            variant: 'primary',
            onConfirm: async () => {
                try {
                    setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                    const response = await userService.confirmPersona(user.id);
                    showNotification(response.message, 'success');
                    fetchUsers(pagination.current_page);
                    closeConfirm();
                } catch (error) {
                    showNotification(parseError(error, 'Error al confirmar la vinculación.'), 'error');
                    closeConfirm();
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    const handleResendActivation = async (user) => {
        openConfirm({
            title: 'Forzar Re-Activación / Verificación',
            message: `¿Deseas reenviar el email de activación a ${user.email}? El usuario deberá configurar su contraseña nuevamente y verificar su correo.`,
            confirmText: 'Reenviar Invitación',
            variant: 'warning',
            onConfirm: async () => {
                try {
                    setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                    const response = await userService.resendActivation(user.id);
                    showNotification(response.message, 'success');
                    fetchUsers(pagination.current_page);
                    closeConfirm();
                } catch (error) {
                    showNotification(parseError(error, 'Error al reenviar la invitación.'), 'error');
                    closeConfirm();
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    if (!hasAccess) {
        return (
            <div className="p-10 text-center bg-white rounded-3xl border border-secondary-200 shadow-sm animate-fadeIn">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-black text-secondary-900 uppercase">Acceso Denegado</h2>
                <p className="text-secondary-500 mt-2 font-medium">No tienes los privilegios necesarios para gestionar usuarios.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-secondary-500 mt-1 font-medium italic">
                        {isSuperUser ? 'Administración global de cuentas de acceso' : 'Gestión de usuarios vinculados a su institución'}
                    </p>
                </div>
                {isSuperUser && (
                    <button 
                        onClick={() => {
                            setEditingUser(null);
                            setFormData({ nombre: '', email: '', password: '', documento_tipo_id: '', documento_numero: '' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Usuario
                    </button>
                )}
            </div>

            {/* Contenido: Listado de Usuarios */}
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
                                    onChange={(e) => setUserSearch(e.target.value)}
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
                        </div>
                    </div>
                </div>

                {isUsersLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-medium italic">Cargando usuarios...</p>
                    </div>
                ) : users.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Identidad</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Roles Globales</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border-2 border-white shadow-sm">
                                                    {user.nombre?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-900">{user.nombre}</p>
                                                    <p className="text-xs text-secondary-500">{user.email}</p>
                                                    {user.persona ? (
                                                        <p className="text-[10px] text-green-600 font-bold mt-0.5 uppercase tracking-tighter flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            Padrón Vinculado
                                                        </p>
                                                    ) : user.documento_numero && (
                                                        <p className="text-[10px] text-primary-600 font-black mt-0.5">{user.documento_tipo?.nombre}: {user.documento_numero}</p>
                                                    )}
                                                    {user.estado === 'vinculacion_pendiente' && (
                                                        <div className="mt-1">
                                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded border border-amber-200 shadow-sm animate-pulse">
                                                                Confirmación de Padrón Requerida
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {user.es_administrador && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded shadow-sm">Admin</span>
                                                )}
                                                {user.roles?.map(role => (
                                                    <span key={role.id} className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-black uppercase rounded shadow-sm">
                                                        {role.name.replace('_', ' ')}
                                                    </span>
                                                ))}
                                                {(!user.es_administrador && (!user.roles || user.roles.length === 0)) && (
                                                    <span className="px-2 py-0.5 bg-secondary-100 text-secondary-500 text-[10px] font-bold uppercase rounded italic">Usuario Estándar</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* Botón de Reenviar Activación (SOLO SUPERUSUARIO) */}
                                                {isSuperUser && (
                                                    <button
                                                        onClick={() => handleResendActivation(user)}
                                                        className="p-2 text-secondary-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Reenviar Invitación de Activación (Forzar Verificación)"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Botón de Confirmar Vinculación Pendiente (Conducción o SuperUser) */}
                                                {user.estado === 'vinculacion_pendiente' && (isSuperUser || isConduccion) && (
                                                    <button
                                                        onClick={() => handleConfirmVinculation(user)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-amber-700 transition-all shadow-md active:scale-95 animate-pulse"
                                                        title="Confirmar Identidad en Padrón"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Confirmar
                                                    </button>
                                                )}

                                                {/* Botones de Editar y Eliminar */}
                                                {!(user.es_administrador || user.roles?.some(r => r.name === 'superuser')) ? (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(user)}
                                                            className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                            title={isSuperUser ? "Editar Información" : "Visualizar Información"}
                                                        >
                                                            {isSuperUser ? (
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                        {/* Botón de Eliminar (SOLO SUPERUSUARIO) */}
                                                        {isSuperUser && user.id !== authUser.id && (
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Eliminar Cuenta"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    (user.es_administrador || user.roles?.some(r => r.name === 'superuser')) && (
                                                        <div className="p-2 text-secondary-300 italic text-[10px] font-bold uppercase tracking-widest">
                                                            Protegido
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-20 text-center text-secondary-500 font-bold italic">
                        No se encontraron usuarios que coincidan con los filtros.
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
                                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                                Página {pagination.current_page} de {pagination.last_page}
                            </span>
                            <button
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => fetchUsers(pagination.current_page + 1)}
                                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL PARA VISUALIZACIÓN / EDICIÓN DE ROLES */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                            <h2 className="text-xl font-black text-secondary-900">
                                Información del Usuario
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1">
                            <div className="p-8 space-y-8">
                                {/* Datos de Identidad y Cuenta */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2">Datos de Cuenta e Identidad</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-secondary-50 border border-secondary-200 rounded-2xl">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Nombre de Usuario</p>
                                            <p className="text-sm font-bold text-secondary-900">{editingUser?.nombre || 'No especificado'}</p>
                                        </div>
                                        <div className="space-y-0.5 border-t md:border-t-0 md:border-l border-secondary-200 pt-3 md:pt-0 md:pl-5">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Email</p>
                                            <p className="text-sm font-bold text-secondary-900">{editingUser?.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-secondary-50 border border-secondary-200 rounded-2xl">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Tipo Doc.</p>
                                            <p className="text-sm font-bold text-secondary-700">
                                                {docTipos.find(t => t.id == editingUser?.documento_tipo_id)?.nombre || 'S/D'}
                                            </p>
                                        </div>
                                        <div className="space-y-0.5 border-t md:border-t-0 md:border-l border-secondary-200 pt-3 md:pt-0 md:pl-5">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Número Doc.</p>
                                            <p className="text-sm font-bold text-secondary-900 tracking-wider">
                                                {editingUser?.documento_numero || 'S/N'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-full px-6 py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-lg"
                                    >
                                        Cerrar Vista
                                    </button>
                                </div>
                            </div>
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
