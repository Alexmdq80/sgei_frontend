import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import documentoTipoService from '../services/documentoTipoService';
import authService from '../services/authService';
import logoAjal from '../assets/logo.png';

/**
 * Página de Login con soporte para Email y Documento.
 */
const Login = () => {
    // Estados del formulario
    const [loginMethod, setLoginMethod] = useState('email'); // 'email' o 'documento'
    const [credentials, setCredentials] = useState({ 
        email: '', 
        documento_tipo_id: '', 
        documento_numero: '', 
        password: '' 
    });
    
    // Estados de datos y UI
    const [documentoTipos, setDocumentoTipos] = useState([]);
    const [error, setError] = useState(null);
    const [resendStatus, setResendStatus] = useState({ loading: false, success: false, message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [showAuthor, setShowAuthor] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    /**
     * Cargar tipos de documento al montar si se elige el método correspondiente.
     */
    useEffect(() => {
        const fetchDocumentoTipos = async () => {
            setIsLoadingData(true);
            try {
                const data = await documentoTipoService.getAll();
                setDocumentoTipos(data);
                if (data.length > 0) {
                    setCredentials(prev => ({ ...prev, documento_tipo_id: data[0].id }));
                }
            } catch (err) {
                console.error("Error cargando tipos de documento:", err);
                setError("No se pudieron cargar los tipos de documento. Intente recargar la página.");
            } finally {
                setIsLoadingData(false);
            }
        };

        if (loginMethod === 'documento' && documentoTipos.length === 0) {
            fetchDocumentoTipos();
        }
    }, [loginMethod]);

    /**
     * Maneja el cambio en los campos del formulario.
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
        // Limpiar estados de error y reenvío al escribir
        setError(null);
        setResendStatus({ loading: false, success: false, message: '' });
    };

    /**
     * Procesa el reenvío de la verificación de correo electrónico.
     */
    const handleResendVerification = async () => {
        if (!credentials.email) {
            setError("Por favor, ingrese su correo electrónico para reenviar la verificación.");
            return;
        }

        setResendStatus({ loading: true, success: false, message: '' });
        try {
            await authService.resendVerification(credentials.email);
            setResendStatus({ 
                loading: false, 
                success: true, 
                message: 'Se ha enviado un nuevo enlace de verificación a su correo.' 
            });
            setError(null);
        } catch (err) {
            console.error("Error reenviando verificación:", err);
            setResendStatus({ 
                loading: false, 
                success: false, 
                message: '' 
            });
            if (err.response?.status === 429) {
                setError('Demasiados intentos. Por favor, espera unos minutos antes de solicitar otro enlace.');
            } else {
                setError(err.response?.data?.error || err.response?.data?.message || 'Error al reenviar la verificación. Intente más tarde.');
            }
        }
    };

    /**
     * Procesa el envío del formulario.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setResendStatus({ loading: false, success: false, message: '' });
        setIsSubmitting(true);

        // Preparar credenciales según el método
        const loginData = loginMethod === 'email' 
            ? { email: credentials.email, password: credentials.password }
            : { 
                documento_tipo_id: credentials.documento_tipo_id, 
                documento_numero: credentials.documento_numero, 
                password: credentials.password 
              };

        try {
            await login(loginData);
            navigate('/');
        } catch (err) {
            // Manejar error específico de email no verificado
            const errorData = err.response?.data;
            if (errorData?.errors?.email_unverified) {
                setError("Tu cuenta no está verificada. Revisa tu correo o solicita un nuevo enlace.");
            } else {
                setError(errorData?.error || 'Credenciales inválidas o error de conexión con el servidor.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-secondary-200 p-8 md:p-10 transition-all">
                
                {/* Cabecera */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-primary-50 rounded-2xl mb-4 text-primary-600">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight">SGEI</h1>
                    <p className="text-secondary-500 mt-1 font-medium italic">Acceso al Sistema</p>
                </div>

                {/* Switcher de Método de Login */}
                <div className="flex p-1 bg-secondary-100 rounded-lg mb-8">
                    <button 
                        onClick={() => setLoginMethod('email')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${loginMethod === 'email' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Email
                    </button>
                    <button 
                        onClick={() => setLoginMethod('documento')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${loginMethod === 'documento' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Documento
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Alertas de Error */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm rounded-r-lg animate-fadeIn">
                            <div className="flex flex-col">
                                <div className="flex items-center mb-2">
                                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold">{error}</span>
                                </div>
                                
                                {error.includes("verificada") && loginMethod === 'email' && (
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={resendStatus.loading}
                                        className="text-left text-xs text-red-800 font-bold underline hover:text-red-600 transition-colors ml-7"
                                    >
                                        {resendStatus.loading ? 'Enviando enlace...' : 'Reenviar enlace de verificación'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Alertas de Éxito (Reenvío) */}
                    {resendStatus.success && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 text-green-700 text-sm rounded-r-lg animate-fadeIn">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>{resendStatus.message}</span>
                            </div>
                        </div>
                    )}

                    {/* CAMPOS SEGÚN MÉTODO */}
                    {loginMethod === 'email' ? (
                        <div>
                            <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                    placeholder="ejemplo@correo.com"
                                    value={credentials.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-fadeIn">
                            <div>
                                <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Tipo de Documento</label>
                                <select
                                    name="documento_tipo_id"
                                    required
                                    disabled={isLoadingData}
                                    className="block w-full px-3 py-3 border border-secondary-300 rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all appearance-none"
                                    value={credentials.documento_tipo_id}
                                    onChange={handleChange}
                                >
                                    {isLoadingData ? (
                                        <option>Cargando...</option>
                                    ) : (
                                        documentoTipos.map(tipo => (
                                            <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Número de Documento</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        name="documento_numero"
                                        required
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        placeholder="DNI (solo números)"
                                        value={credentials.documento_numero}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            setCredentials(prev => ({ ...prev, documento_numero: value }));
                                            setError(null);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CAMPO DE CONTRASEÑA COMÚN */}
                    <div>
                        <label className="block text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 ml-1">Contraseña</label>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400 group-focus-within:text-primary-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                className="block w-full pl-10 pr-12 py-3 border border-secondary-300 rounded-lg bg-secondary-50 text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                placeholder="••••••••"
                                value={credentials.password}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-secondary-400 hover:text-primary-500 transition-colors focus:outline-none"
                                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {showPassword ? (
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
                        <div className="flex justify-end mt-1">
                            <Link 
                                to="/forgot-password" 
                                className="text-[11px] font-bold text-secondary-500 hover:text-primary-600 transition-colors uppercase tracking-wider"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || isLoadingData}
                        className={`w-full flex justify-center py-3.5 px-4 rounded-lg shadow-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none transition-all active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed shadow-none' : ''}`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Autenticando...
                            </span>
                        ) : 'Entrar al SGEI'}
                    </button>

                    <div className="pt-2 text-center">
                        <p className="text-secondary-500 text-sm font-medium">
                            ¿No tienes una cuenta? {' '}
                            <Link to="/register" className="text-primary-600 font-bold hover:underline">
                                Registrar Usuario
                            </Link>
                        </p>
                    </div>
                </form>

                <div className="mt-8 flex flex-col items-center gap-2">
                    <div className="text-xs text-secondary-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <span>&copy; {new Date().getFullYear()} SGEI - AJAL Software</span>
                        <img 
                            src={logoAjal} 
                            alt="AJAL Logo" 
                            className="h-4 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer active:scale-90" 
                            onClick={() => setShowAuthor(!showAuthor)}
                        />
                    </div>
                    {showAuthor && (
                        <p className="text-[10px] text-primary-500 font-bold animate-fadeInUp">
                            by Alex Javier Actis Lobos
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
