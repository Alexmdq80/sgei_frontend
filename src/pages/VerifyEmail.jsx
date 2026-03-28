import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

/**
 * Vista para usuarios que aún no han verificado su correo electrónico.
 * Se muestra si el usuario no es administrador y email_verified_at es null.
 */
const VerifyEmail = () => {
    const { user, logout } = useAuth();
    const [resendStatus, setResendStatus] = useState({ loading: false, success: false, message: '' });
    const [error, setError] = useState(null);

    /**
     * Procesa el reenvío de la verificación de correo electrónico.
     */
    const handleResendVerification = async () => {
        setResendStatus({ loading: true, success: false, message: '' });
        setError(null);
        
        try {
            await authService.resendVerification(user.email);
            setResendStatus({ 
                loading: false, 
                success: true, 
                message: 'Se ha enviado un nuevo enlace de verificación a su correo.' 
            });
        } catch (err) {
            console.error("Error reenviando verificación:", err);
            setResendStatus({ loading: false, success: false, message: '' });
            setError(err.response?.data?.message || 'Error al reenviar la verificación. Intente más tarde.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-secondary-200 p-8 md:p-10 text-center animate-fadeIn">
                
                {/* Ícono de Email */}
                <div className="inline-block p-4 bg-primary-50 rounded-full mb-6 text-primary-600">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-extrabold text-secondary-900 mb-2 tracking-tight">¡Hola, {user.nombre}!</h1>
                <p className="text-secondary-600 mb-8 font-medium">
                    Gracias por unirte al SGEI. Para acceder al sistema, primero debes verificar tu dirección de correo electrónico: <br />
                    <span className="font-bold text-primary-600">{user.email}</span>
                </p>

                {/* Mensajes de Estado */}
                {resendStatus.success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6 text-sm flex items-center shadow-sm">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {resendStatus.message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center shadow-sm">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleResendVerification}
                        disabled={resendStatus.loading}
                        className={`w-full py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-all active:scale-[0.98] ${resendStatus.loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {resendStatus.loading ? 'Enviando enlace...' : 'Reenviar Correo de Verificación'}
                    </button>

                    <button
                        onClick={logout}
                        className="w-full py-3 px-4 text-sm font-bold text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50 rounded-xl transition-all"
                    >
                        Cerrar Sesión
                    </button>
                </div>

                <div className="mt-10 pt-6 border-t border-secondary-100 text-xs text-secondary-400 font-bold uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} SGEI - Full Access
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
