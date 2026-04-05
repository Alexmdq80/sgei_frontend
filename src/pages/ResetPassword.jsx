import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Página para establecer una nueva contraseña mediante un token de recuperación.
 */
const ResetPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Obtener parámetros de la URL (?token=...&email=...)
    const query = new URLSearchParams(location.search);
    const [formData, setFormData] = useState({
        token: query.get('token') || '',
        email: query.get('email') || '',
        password: '',
        password_confirmation: ''
    });

    const [status, setStatus] = useState({ loading: false, success: false, error: null });
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.password_confirmation) {
            setStatus({ ...status, error: 'Las contraseñas no coinciden.' });
            return;
        }

        setStatus({ loading: true, success: false, error: null });

        try {
            await authService.resetPassword(formData);
            setStatus({ loading: false, success: true, error: null });
            // Redirigir después de 3 segundos
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error("Error reseteando clave:", err);
            const msg = err.response?.data?.message || err.response?.data?.error || 'No se pudo restablecer la contraseña. El enlace puede haber expirado.';
            setStatus({ loading: false, success: false, error: msg });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-secondary-200 p-8 md:p-10 animate-fadeIn">
                
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-primary-50 rounded-2xl mb-4 text-primary-600">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.444c-4.735-3.515-8.618-7.864-8.618-12.5 0-2.313.916-4.528 2.548-6.16a11.955 11.955 0 0112.14 0c1.632 1.632 2.548 3.847 2.548 6.16 0 4.636-3.883 8.985-8.618 12.5z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Nueva Contraseña</h1>
                    <p className="text-secondary-500 mt-2 font-medium">Estás a un paso de recuperar el acceso a tu cuenta.</p>
                </div>

                {status.success ? (
                    <div className="space-y-6 text-center animate-scaleIn">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-green-800 mb-2">¡Contraseña Actualizada!</h2>
                            <p className="text-sm text-green-700 font-medium">Tu clave ha sido cambiada con éxito. Serás redirigido al login en unos segundos...</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {status.error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm rounded-r-xl animate-shake">
                                <span className="font-bold">{status.error}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-secondary-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    minLength="8"
                                    className="block w-full pl-12 pr-4 py-3.5 border border-secondary-300 rounded-xl bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium"
                                    placeholder="Mínimo 8 caracteres"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary-400 hover:text-primary-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.225 0 2.37.22 3.425.625m4.316 2.333A10.07 10.07 0 0121.542 12c-1.274 4.057-5.064 7-9.542 7-1.225 0-2.37-.22-3.425-.625M9 9l6 6m0-6l-6 6" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-secondary-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password_confirmation"
                                    required
                                    className="block w-full pl-12 pr-4 py-3.5 border border-secondary-300 rounded-xl bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium"
                                    placeholder="Repite tu nueva clave"
                                    value={formData.password_confirmation}
                                    onChange={handleChange}
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
                                    Restableciendo...
                                </span>
                            ) : 'Cambiar Contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
