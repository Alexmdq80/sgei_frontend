import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import { Link } from 'react-router-dom';

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [profileData, setProfileData] = useState({ 
        nombre: user?.nombre || '', 
        apellido: user?.apellido || '', 
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
                apellido: user.apellido || '',
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
            console.error('Error updating profile:', err);
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
            setSuccess('Avatar actualizado con éxito.');
        } catch (err) {
            console.error('Error uploading avatar:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error al subir el avatar.';
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
            console.error('Error changing password:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error al cambiar la contraseña.';
            setError(msg);
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Configuración de Perfil</h1>
                    <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
                        &larr; Volver al Dashboard
                    </Link>
                </div>

                {success && <div className="bg-green-100 border-l-4 border-green-500 p-4 text-green-700">{success}</div>}
                {error && <div className="bg-red-100 border-l-4 border-red-500 p-4 text-red-700">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sección de Avatar */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Avatar</h2>
                        <form onSubmit={handleAvatarSubmit} className="flex flex-col items-center">
                            <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-2 border-gray-200">
                                {preview ? (
                                    <img src={preview} alt="Avatar Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">Sin foto</div>
                                )}
                            </div>
                            <input type="file" onChange={handleAvatarChange} accept="image/*" className="text-sm mb-4" />
                            <button
                                type="submit"
                                disabled={isSubmittingAvatar || !avatar}
                                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {isSubmittingAvatar ? 'Subiendo...' : 'Actualizar Foto'}
                            </button>
                        </form>
                    </div>

                    {/* Sección de Información Básica */}
                    <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Información General</h2>
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={profileData.nombre}
                                        onChange={handleProfileChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Apellido</label>
                                    <input
                                        type="text"
                                        name="apellido"
                                        value={profileData.apellido}
                                        onChange={handleProfileChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleProfileChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmittingProfile}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmittingProfile ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </form>
                    </div>

                    {/* Sección de Seguridad */}
                    <div className="md:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Seguridad / Cambiar Contraseña</h2>
                        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contraseña Actual</label>
                                <input
                                    type="password"
                                    name="current_password"
                                    value={passwordData.current_password}
                                    onChange={handlePasswordChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={passwordData.password}
                                    onChange={handlePasswordChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Confirmar Nueva Contraseña</label>
                                <input
                                    type="password"
                                    name="password_confirmation"
                                    value={passwordData.password_confirmation}
                                    onChange={handlePasswordChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="md:col-span-3 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmittingPassword}
                                    className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
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
