import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import documentoTipoService from '../services/documentoTipoService';

/**
 * Página de gestión del perfil de usuario.
 * Se renderiza dentro del Layout principal.
 * Muestra información personal, seguridad y vinculaciones institucionales (CUPOF).
 */
const Profile = () => {
    const { user, checkAuth, showNotification } = useAuth();
    const [profileData, setProfileData] = useState({ 
        nombre: user?.nombre || '', 
        email: user?.email || '',
        documento_tipo_id: user?.documento_tipo_id || '',
        documento_numero: user?.documento_numero || ''
    });
    const [documentoTipos, setDocumentoTipos] = useState([]);
    const [passwordData, setPasswordData] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(user?.avatar_url || null);
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [isSubmittingAvatar, setIsSubmittingAvatar] = useState(false);
    const [resendStatus, setResendStatus] = useState({ loading: false, success: false, message: '' });
    const [error, setError] = useState(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Sincronizar datos de perfil cuando el usuario cargue
    useEffect(() => {
        if (user) {
            setProfileData({
                nombre: user.nombre || '',
                email: user.email || '',
                documento_tipo_id: user.documento_tipo_id || '',
                documento_numero: user.documento_numero || ''
            });
            setPreview(user.avatar_url);
        }
    }, [user]);

    // Cargar tipos de documentos
    useEffect(() => {
        const fetchDocumentoTipos = async () => {
            try {
                const data = await documentoTipoService.getAll();
                setDocumentoTipos(data);
            } catch (err) {
                console.error('Error al cargar tipos de documento:', err);
            }
        };
        fetchDocumentoTipos();
    }, []);

    const handleProfileChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
    const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

    const handleResendVerification = async () => {
        setResendStatus({ loading: true, success: false, message: '' });
        setError(null);
        try {
            const authService = (await import('../services/authService')).default;
            await authService.resendVerification(user.email);
            setResendStatus({ 
                loading: false, 
                success: true, 
                message: 'Enlace de verificación enviado. Revisa tu correo.' 
            });
            showNotification('Enlace de verificación enviado. Revisa tu correo.', 'success');
        } catch (err) {
            setResendStatus({ loading: false, success: false, message: '' });
            if (err.response?.status === 429) {
                const msg = 'Has realizado demasiados intentos. Por favor, espera unos minutos antes de reintentar.';
                setError(msg);
                showNotification(msg, 'error');
            } else {
                const msg = err.response?.data?.error || err.response?.data?.message || 'Error al enviar la verificación.';
                setError(msg);
                showNotification(msg, 'error');
            }
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmittingProfile(true);
        try {
            await userService.updateProfile(profileData);
            await checkAuth(); // Refrescar datos globales
            showNotification('Perfil actualizado con éxito.', 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error al actualizar el perfil.';
            setError(msg);
            showNotification(msg, 'error');
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    const handleAvatarSubmit = async (e) => {
        e.preventDefault();
        if (!avatar) return;
        setError(null);
        setIsSubmittingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('avatar', avatar);
            await userService.updateAvatar(formData);
            await checkAuth();
            setAvatar(null); 
            showNotification('Foto de perfil actualizada.', 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error al subir el avatar.';
            setError(msg);
            showNotification(msg, 'error');
        } finally {
            setIsSubmittingAvatar(false);
        }
    };

    const handleAvatarDelete = async () => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) return;
        setError(null);
        setIsSubmittingAvatar(true);
        try {
            await userService.deleteAvatar();
            await checkAuth();
            setAvatar(null);
            setPreview(null);
            showNotification('Foto de perfil eliminada.', 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error al eliminar el avatar.';
            setError(msg);
            showNotification(msg, 'error');
        } finally {
            setIsSubmittingAvatar(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmittingPassword(true);
        try {
            await userService.updatePassword(passwordData);
            setPasswordData({ current_password: '', password: '', password_confirmation: '' });
            showNotification('Contraseña cambiada con éxito.', 'success');
        } catch (err) {
            let msg = 'Error al cambiar la contraseña.';
            if (err.response?.status === 422 && err.response?.data?.errors) {
                msg = Object.values(err.response.data.errors).flat().join(' ');
            } else {
                msg = err.response?.data?.error || err.response?.data?.message || msg;
            }
            setError(msg);
            showNotification(msg, 'error');
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    // Filtrar vinculaciones verificadas (las que vienen del CUPOF)
    const verifiedLinks = user?.escuela_usuarios?.filter(link => link.verified_at) || [];

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            {/* Cabecera con botón de refresco */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Mi Perfil</h1>
                    <p className="text-secondary-500 mt-1 font-medium italic">Gestiona tu información personal y seguridad</p>
                </div>
                <button 
                    onClick={async () => {
                        setIsSubmittingProfile(true);
                        try {
                            await checkAuth();
                            showNotification('Datos actualizados.', 'success');
                        } catch (err) {
                            showNotification('Error al refrescar datos.', 'error');
                        } finally {
                            setIsSubmittingProfile(false);
                        }
                    }}
                    disabled={isSubmittingProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-secondary-200 text-secondary-600 rounded-xl font-bold shadow-sm hover:bg-secondary-50 hover:text-primary-600 transition-all active:scale-95 disabled:opacity-50 group"
                >
                    <svg 
                        className={`w-4 h-4 transition-transform duration-500 ${isSubmittingProfile ? 'animate-spin' : 'group-hover:rotate-180'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refrescar Datos
                </button>
            </div>

            {/* CARD DE VERIFICACIÓN DE EMAIL */}
            {!user?.email_verified_at && (
                <div className="p-6 rounded-2xl shadow-sm border-2 flex flex-col md:flex-row items-center justify-between gap-6 bg-red-50 border-red-200 animate-pulse-once">
                    <div className="flex items-center text-center md:text-left">
                        <div className="p-3 rounded-xl mr-5 bg-red-100 text-red-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-800">
                                Correo Electrónico No Verificado
                            </h3>
                            <p className="text-sm font-medium text-red-600">
                                Tu acceso está limitado hasta que verifiques tu cuenta en <span className="font-bold">{user?.email}</span>.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleResendVerification}
                        disabled={resendStatus.loading}
                        className={`px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 whitespace-nowrap bg-red-600 hover:bg-red-700 ${resendStatus.loading ? 'opacity-50' : ''}`}
                    >
                        {resendStatus.loading ? 'Enviando...' : 'Reenviar Verificación'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Avatar e Info Institucional */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Avatar */}
                    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="p-6 border-b border-secondary-200 bg-secondary-50">
                            <h2 className="font-bold text-secondary-900">Foto de Perfil</h2>
                        </div>
                        <div className="p-8 flex flex-col items-center relative">
                            {!user?.email_verified_at && (
                                <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-b-2xl">
                                    <span className="bg-secondary-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Verificar Email</span>
                                </div>
                            )}
                            <div className="relative group">
                                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-lg ring-1 ring-secondary-200">
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-secondary-100 text-secondary-400 text-4xl font-bold uppercase">
                                            {user?.nombre?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                {user?.email_verified_at && (
                                    <label className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-primary-700 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
                                    </label>
                                )}
                            </div>
                            
                            <div className="w-full mt-8 space-y-3">
                                <button
                                    onClick={handleAvatarSubmit}
                                    disabled={isSubmittingAvatar || !avatar || !user?.email_verified_at}
                                    className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isSubmittingAvatar ? 'Subiendo...' : 'Subir Nueva Foto'}
                                </button>
                                {user?.avatar_url && (
                                    <button
                                        onClick={handleAvatarDelete}
                                        disabled={isSubmittingAvatar || !user?.email_verified_at}
                                        className="w-full text-red-600 py-2.5 font-bold hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-30"
                                    >
                                        Eliminar Foto
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Vinculaciones Institucionales (CUPOF) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="p-6 border-b border-secondary-200 bg-secondary-50">
                            <h2 className="font-bold text-secondary-900">Instituciones y Roles</h2>
                            <p className="text-[10px] text-secondary-500 font-bold uppercase tracking-wider mt-1">Asignaciones vía CUPOF</p>
                        </div>
                        <div className="p-0">
                            {verifiedLinks.length > 0 ? (
                                <div className="divide-y divide-secondary-100">
                                    {verifiedLinks.map((vinculo) => (
                                        <div key={vinculo.id} className="p-4 bg-white hover:bg-secondary-50 transition-colors">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-xs font-black text-secondary-900 truncate uppercase">{vinculo.escuela?.nombre}</p>
                                                    <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{vinculo.role?.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded">Activo</span>
                                                <span className="text-[9px] text-secondary-400 font-medium">Desde {new Date(vinculo.verified_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-3 text-secondary-300">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-secondary-500 font-bold italic px-4">
                                        No se registran cargos activos en el sistema. La vinculación se realiza automáticamente vía CUPOF.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Información y Seguridad */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Información General */}
                    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="p-6 border-b border-secondary-200 bg-secondary-50">
                            <h2 className="font-bold text-secondary-900">Información de la Cuenta</h2>
                        </div>
                        <form onSubmit={handleProfileSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-secondary-400 uppercase mb-2">Nombre de Usuario (Alias)</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={profileData.nombre}
                                        onChange={handleProfileChange}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none font-bold ${!user?.email_verified_at ? 'bg-secondary-50 border-secondary-200 cursor-not-allowed text-secondary-400' : 'bg-secondary-50 border-secondary-300'}`}
                                        required
                                        disabled={!user?.email_verified_at}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-secondary-400 uppercase mb-2">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileData.email}
                                        onChange={handleProfileChange}
                                        className="w-full px-4 py-3 bg-white border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none shadow-sm font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-secondary-100">
                                <div>
                                    <label className="block text-xs font-black text-secondary-400 uppercase mb-2">Tipo de Documento</label>
                                    <select
                                        name="documento_tipo_id"
                                        value={profileData.documento_tipo_id}
                                        onChange={handleProfileChange}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none font-bold appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em] ${!user?.email_verified_at ? 'bg-secondary-50 border-secondary-200 cursor-not-allowed text-secondary-400' : 'bg-secondary-50 border-secondary-300'}`}
                                        disabled={!user?.email_verified_at}
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236B7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")' }}
                                    >
                                        <option value="">Seleccionar Tipo</option>
                                        {documentoTipos.map((tipo) => (
                                            <option key={tipo.id} value={tipo.id}>
                                                {tipo.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-secondary-400 uppercase mb-2">Número de Documento</label>
                                    <input
                                        type="text"
                                        name="documento_numero"
                                        value={profileData.documento_numero}
                                        onChange={handleProfileChange}
                                        placeholder="Ej: 30123456"
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none font-bold ${!user?.email_verified_at ? 'bg-secondary-50 border-secondary-200 cursor-not-allowed text-secondary-400' : 'bg-secondary-50 border-secondary-300'}`}
                                        disabled={!user?.email_verified_at}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-2xl border border-primary-100">
                                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-[11px] text-primary-700 font-bold leading-tight">
                                    Tu información personal es validada contra el Padrón de Agentes. Cualquier discrepancia en tu DNI debe ser gestionada en la oficina de personal.
                                </p>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmittingProfile}
                                    className="px-10 py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingProfile ? 'Guardando...' : 'Actualizar Perfil'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Seguridad */}
                    <div className={`bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden relative ${!user?.email_verified_at ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                        {!user?.email_verified_at && (
                            <div className="absolute inset-0 z-10 bg-white/20 backdrop-blur-[1px] flex items-center justify-center">
                                <span className="bg-secondary-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-xl">Bloqueado</span>
                            </div>
                        )}
                        <div className="p-6 border-b border-secondary-200 bg-secondary-50">
                            <h2 className="font-bold text-secondary-900">Actualizar Contraseña</h2>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-secondary-400 uppercase mb-2">Contraseña Actual</label>
                                <div className="relative group">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        name="current_password"
                                        value={passwordData.current_password}
                                        onChange={handlePasswordChange}
                                        className="w-full pl-4 pr-12 py-3 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none font-bold"
                                        required
                                        disabled={!user?.email_verified_at}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary-400 hover:text-primary-500 transition-colors focus:outline-none"
                                        disabled={!user?.email_verified_at}
                                    >
                                        {showCurrentPassword ? (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-secondary-400 uppercase mb-2">Nueva Contraseña</label>
                                    <div className="relative group">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            name="password"
                                            value={passwordData.password}
                                            onChange={handlePasswordChange}
                                            className="w-full pl-4 pr-12 py-3 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none font-bold"
                                            required
                                            disabled={!user?.email_verified_at}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary-400 hover:text-primary-500 transition-colors focus:outline-none"
                                            disabled={!user?.email_verified_at}
                                        >
                                            {showNewPassword ? (
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-secondary-400 uppercase mb-2">Confirmar Contraseña</label>
                                    <div className="relative group">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="password_confirmation"
                                            value={passwordData.password_confirmation}
                                            onChange={handlePasswordChange}
                                            className="w-full pl-4 pr-12 py-3 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none font-bold"
                                            required
                                            disabled={!user?.email_verified_at}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary-400 hover:text-primary-500 transition-colors focus:outline-none"
                                            disabled={!user?.email_verified_at}
                                        >
                                            {showConfirmPassword ? (
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmittingPassword || !user?.email_verified_at}
                                    className="px-10 py-4 bg-accent-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-accent-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
