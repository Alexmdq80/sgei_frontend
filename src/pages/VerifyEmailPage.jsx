import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Página que procesa la verificación de correo electrónico.
 * Se encarga de recibir el token y el email por URL y llamar al backend.
 */
const VerifyEmailPage = () => {
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('Verificando tu cuenta, por favor espera...');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const token = query.get('token');
        const email = query.get('email');

        if (!token || !email) {
            setStatus('error');
            setMessage('Faltan parámetros de verificación. El enlace puede estar incompleto.');
            return;
        }

        const verify = async () => {
            try {
                await authService.verifyEmail(email, token);
                setStatus('success');
                setMessage('¡Tu correo electrónico ha sido verificado con éxito!');
            } catch (err) {
                console.error("Error en la verificación:", err);
                setStatus('error');
                setMessage(err.response?.data?.message || 'Error al verificar el correo. El enlace puede haber expirado o ser inválido.');
            }
        };

        verify();
    }, [location]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-secondary-200 p-8 md:p-10 text-center animate-fadeIn">
                
                {/* Ícono dinámico según el estado */}
                <div className={`inline-block p-4 rounded-full mb-6 ${
                    status === 'verifying' ? 'bg-primary-50 text-primary-600' :
                    status === 'success' ? 'bg-green-50 text-green-600' :
                    'bg-red-50 text-red-600'
                }`}>
                    {status === 'verifying' && (
                        <svg className="w-16 h-16 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {status === 'success' && (
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {status === 'error' && (
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                <h1 className="text-2xl font-extrabold text-secondary-900 mb-4 tracking-tight">
                    {status === 'verifying' ? 'Verificando Correo' : 
                     status === 'success' ? '¡Verificación Completada!' : 
                     'Error de Verificación'}
                </h1>
                
                <p className="text-secondary-600 mb-8 font-medium italic">
                    {message}
                </p>

                <div className="space-y-4">
                    {status === 'success' ? (
                        <Link
                            to="/login"
                            className="block w-full py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-all active:scale-[0.98] text-center"
                        >
                            Ir al Iniciar Sesión
                        </Link>
                    ) : status === 'error' ? (
                        <Link
                            to="/login"
                            className="block w-full py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-secondary-600 hover:bg-secondary-700 transition-all active:scale-[0.98] text-center"
                        >
                            Volver al Inicio
                        </Link>
                    ) : null}
                </div>

                <div className="mt-10 pt-6 border-t border-secondary-100 text-xs text-secondary-400 font-bold uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} SGEI - Full Access
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
