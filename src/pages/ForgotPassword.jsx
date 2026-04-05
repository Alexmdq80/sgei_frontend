import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Página para solicitar el enlace de recuperación de contraseña.
 */
const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ loading: false, success: false, error: null });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, success: false, error: null });

        try {
            await authService.forgotPassword(email);
            setStatus({ loading: false, success: true, error: null });
        } catch (err) {
            console.error("Error solicitando reset:", err);
            
            // Si el error es "usuario no encontrado" (422 o 404), aplicamos 'Silent Success'
            // No revelamos si el usuario existe por seguridad.
            const status = err.response?.status;
            const errorMsg = err.response?.data?.message || "";

            if (status === 422 || status === 404 || errorMsg.includes('passwords.user')) {
                setStatus({ loading: false, success: true, error: null });
                return;
            }

            // Errores reales (429 Throttle, 500 Server Error)
            const msg = status === 429 
                ? 'Demasiados intentos. Por favor, espera unos minutos.' 
                : 'Ocurrió un error en el servidor. Intente más tarde.';
                
            setStatus({ loading: false, success: false, error: msg });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-secondary-200 p-8 md:p-10 animate-fadeIn">
                
                {/* Cabecera */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-primary-50 rounded-2xl mb-4 text-primary-600">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight leading-tight">¿Olvidaste tu contraseña?</h1>
                    <p className="text-secondary-500 mt-2 font-medium">No te preocupes, ingresa tu email y te enviaremos un enlace para restablecerla.</p>
                </div>

                {status.success ? (
                    <div className="space-y-6 text-center animate-scaleIn">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <h2 className="text-lg font-bold text-green-800 mb-1">¡Correo enviado!</h2>
                            <p className="text-sm text-green-700 font-medium">Hemos enviado las instrucciones a <span className="font-bold underline">{email}</span>. Revisa tu bandeja de entrada y spam.</p>
                        </div>
                        <Link to="/login" className="block w-full py-3.5 bg-secondary-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all active:scale-95">
                            Volver al Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {status.error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm rounded-r-xl animate-shake">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-bold">{status.error}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-secondary-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-12 pr-4 py-3.5 border border-secondary-300 rounded-xl bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium"
                                    placeholder="ingresa@tu-correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={status.loading}
                            className={`w-full flex justify-center py-4 px-4 rounded-xl shadow-xl text-sm font-black text-white bg-primary-600 hover:bg-primary-700 focus:outline-none transition-all active:scale-[0.98] ${status.loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {status.loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Enviando enlace...
                                </span>
                            ) : 'Enviar enlace de recuperación'}
                        </button>

                        <div className="pt-2 text-center">
                            <Link to="/login" className="text-secondary-500 font-bold hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
