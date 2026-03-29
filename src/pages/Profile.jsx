import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';

/**
 * Página de gestión del perfil de usuario.
 * Se renderiza dentro del Layout principal.
 */
const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [profileData, setProfileData] = useState({ 
        nombre: user?.nombre || '', 
        email: user?.email || '' 
    });
    const [passwordData, setPasswordData] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(user?.avatar_url || null);
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [isSubmittingAvatar, setIsSubmittingAvatar] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Sincronizar datos de perfil cuando el usuario cargue
    useEffect(() => {
        if (user) {
            setProfileData({
                nombre: user.nombre || '',
                email: user.email || ''
            });
            setPreview(user.avatar_url);
        }
    }, [user]);

    const handleProfileChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
    const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

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
        setSuccess(null);
        setIsSubmittingProfile(true);
        try {
            await userService.updateProfile(profileData);
            await checkAuth(); // Refrescar datos globales
            setSuccess('Perfil actualizado con éxito.');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error al actualizar el perfil.';
            setError(msg);
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    const handleAvatarSubmit = async (e) => {
        e.preventDefault();
        if (!avatar) return;
        setError(null);
        setSuccess(null);
        setIsSubmittingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('avatar', avatar);
            await userService.updateAvatar(formData);
            await checkAuth();
            setAvatar(null); 
            setSuccess('Foto de perfil actualizada.');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error al subir el avatar.';
            setError(msg);
        } finally {
            setIsSubmittingAvatar(false);
        }
    };

    const handleAvatarDelete = async () => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) return;
        setError(null);
        setSuccess(null);
        setIsSubmittingAvatar(true);
        try {
            await userService.deleteAvatar();
            await checkAuth();
            setAvatar(null);
            setPreview(null);
            setSuccess('Foto de perfil eliminada.');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error al eliminar el avatar.';
            setError(msg);
        } finally {
            setIsSubmittingAvatar(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSubmittingPassword(true);
        try {
            await userService.updatePassword(passwordData);
            setPasswordData({ current_password: '', password: '', password_confirmation: '' });
            setSuccess('Contraseña cambiada con éxito.');
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const validationErrors = Object.values(err.response.data.errors).flat();
                setError(validationErrors.join(' '));
            } else {
                const msg = err.response?.data?.error || err.response?.data?.message || 'Error al cambiar la contraseña.';
                setError(msg);
            }
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            {/* Mensajes de feedback */}
            {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg flex items-center shadow-sm">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-green-700 font-medium">{success}</p>
                </div>
            )}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center shadow-sm">
                    <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            )}

            {/* CARD DE ESTADO ESCOLAR (NUEVA) */}
            {!user?.es_administrador && user?.estado !== 'activo' && (
                <div className={`p-6 rounded-2xl shadow-sm border-2 flex flex-col md:flex-row items-center justify-between gap-6 ${user?.estado === 'espera_aprobacion' ? 'bg-yellow-50 border-yellow-200' : 'bg-primary-50 border-primary-200'}`}>
                    <div className="flex items-center text-center md:text-left">
                        <div className={`p-3 rounded-xl mr-5 ${user?.estado === 'espera_aprobacion' ? 'bg-yellow-100 text-yellow-600' : 'bg-primary-100 text-primary-600'}`}>
                            {user?.estado === 'espera_aprobacion' ? (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${user?.estado === 'espera_aprobacion' ? 'text-yellow-800' : 'text-primary-800'}`}>
                                {user?.estado === 'espera_aprobacion' ? 'Solicitud en Revisión' : 'Paso Requerido: Vinculación Escolar'}
                            </h3>
                            <p className={`text-sm font-medium ${user?.estado === 'espera_aprobacion' ? 'text-yellow-600' : 'text-primary-600'}`}>
                                {user?.estado === 'espera_aprobacion' 
                                    ? 'Tu solicitud para unirte a la escuela está pendiente de aprobación por un administrador.' 
                                    : 'Para acceder a todas las funciones del sistema, primero debes seleccionar tu institución educativa.'}
                            </p>
                        </div>
                    </div>
                    <Link 
                        to={user?.estado === 'espera_aprobacion' ? '/pending-approval' : '/select-school'}
                        className={`px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 whitespace-nowrap ${user?.estado === 'espera_aprobacion' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-primary-600 hover:bg-primary-700'}`}
                    >
                        {user?.estado === 'espera_aprobacion' ? 'Ver Solicitud' : 'Seleccionar Escuela'}
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Avatar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="p-6 border-b border-secondary-200 bg-secondary-50">
                            <h2 className="font-bold text-secondary-900">Foto de Perfil</h2>
                        </div>
                        <div className="p-8 flex flex-col items-center">
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
                                <label className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-primary-700 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input type="file" className="hidden" onChange={handleAvatarChange} accept="image/*" />
                                </label>
                            </div>
                            
                            <p className="mt-4 text-xs text-secondary-500 text-center uppercase tracking-wider font-bold">Formatos: JPG, PNG o GIF</p>
                            
                            <div className="w-full mt-8 space-y-3">
                                <button
                                    onClick={handleAvatarSubmit}
                                    disabled={isSubmittingAvatar || !avatar}
                                    className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isSubmittingAvatar ? 'Subiendo...' : 'Subir Nueva Foto'}
                                </button>
                                {user?.avatar_url && (
                                    <button
                                        onClick={handleAvatarDelete}
                                        disabled={isSubmittingAvatar}
                                        className="w-full text-red-600 py-2.5 font-bold hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    >
                                        Eliminar Foto
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Información y Seguridad */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Vinculaciones Escolares */}
                    {!user?.es_administrador && (
                        <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                            <div className="p-6 border-b border-secondary-200 bg-secondary-50 flex items-center justify-between">
                                <h2 className="font-bold text-secondary-900">Vinculaciones Escolares</h2>
                                {user?.escuela_usuarios?.length === 0 && (
                                    <Link to="/select-school" className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider">
                                        + Vincular Nueva
                                    </Link>
                                )}
                            </div>
                            <div className="p-0">
                                {user?.escuela_usuarios?.length > 0 ? (
                                    <div className="divide-y divide-secondary-100">
                                        {user.escuela_usuarios.map((vinculo) => (
                                            <div key={vinculo.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-secondary-900">{vinculo.escuela?.nombre}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                            vinculo.verified_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {vinculo.verified_at ? 'Verificado' : 'Pendiente'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 text-xs text-secondary-500 font-medium">
                                                        <p className="flex items-center">
                                                            <svg className="w-3.5 h-3.5 mr-1 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            Rol: {vinculo.rol_escolar?.nombre || 'No asignado'}
                                                        </p>
                                                        <p className="flex items-center">
                                                            <svg className="w-3.5 h-3.5 mr-1 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            Solicitado el: {new Date(vinculo.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                {!vinculo.verified_at && (
                                                    <Link 
                                                        to="/pending-approval" 
                                                        className="text-xs font-bold text-secondary-400 hover:text-secondary-600 transition-colors uppercase tracking-widest"
                                                    >
                                                        Gestionar
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 text-center">
                                        <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4 text-secondary-300">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <p className="text-secondary-500 font-medium italic mb-4">No tienes vinculaciones activas ni pendientes.</p>
                                        <Link to="/select-school" className="inline-flex px-6 py-2 bg-primary-600 text-white font-bold rounded-lg text-sm hover:bg-primary-700 transition-all shadow-md active:scale-95">
                                            Buscar Institución
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Información General */}
                    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="p-6 border-b border-secondary-200 bg-secondary-50">
                            <h2 className="font-bold text-secondary-900">Información de la Cuenta</h2>
                        </div>
                        <form onSubmit={handleProfileSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Nombre de Usuario (Alias)</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={profileData.nombre}
                                    onChange={handleProfileChange}
                                    className="w-full px-4 py-3 bg-secondary-50 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                    required
                                />
                                <p className="mt-2 text-xs text-secondary-500 italic">Este es tu nombre de acceso al sistema.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Correo Electrónico</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleProfileChange}
                                    className="w-full px-4 py-3 bg-secondary-50 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                    required
                                />
                            </div>
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmittingProfile}
                                    className="px-8 py-3 bg-secondary-900 text-white rounded-lg font-bold shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingProfile ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Seguridad */}
                    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="p-6 border-b border-secondary-200 bg-secondary-50">
                            <h2 className="font-bold text-secondary-900">Actualizar Contraseña</h2>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Contraseña Actual</label>
                                <input
                                    type="password"
                                    name="current_password"
                                    value={passwordData.current_password}
                                    onChange={handlePasswordChange}
                                    className="w-full px-4 py-3 bg-secondary-50 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-secondary-700 mb-2">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={passwordData.password}
                                        onChange={handlePasswordChange}
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                        required
                                    />
                                    <div className="mt-4 grid grid-cols-1 gap-2">
                                        {[
                                            { label: '10+ caracteres', met: passwordData.password.length >= 10 },
                                            { label: 'A-Z', met: /[A-Z]/.test(passwordData.password) },
                                            { label: '0-9', met: /[0-9]/.test(passwordData.password) },
                                            { label: 'Símbolo', met: /[^A-Za-z0-9]/.test(passwordData.password) },
                                        ].map((req, i) => (
                                            <div key={i} className={`flex items-center text-[10px] font-bold uppercase tracking-wider ${req.met ? 'text-green-600' : 'text-secondary-400'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${req.met ? 'bg-green-600' : 'bg-secondary-300'}`}></div>
                                                {req.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-secondary-700 mb-2">Confirmar Contraseña</label>
                                    <input
                                        type="password"
                                        name="password_confirmation"
                                        value={passwordData.password_confirmation}
                                        onChange={handlePasswordChange}
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmittingPassword}
                                    className="px-8 py-3 bg-accent-600 text-white rounded-lg font-bold shadow-lg hover:bg-accent-700 transition-all active:scale-95 disabled:opacity-50"
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
