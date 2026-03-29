import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import escuelaService from '../services/escuelaService';

/**
 * Vista informativa de espera de aprobación.
 */
const PendingApproval = () => {
    const { user, logout, checkAuth } = useAuth();
    const [isCancelling, setIsCancelling] = useState(false);

    const handleCancel = async () => {
        if (!window.confirm("¿Estás seguro de que deseas cancelar la solicitud y elegir otra escuela?")) {
            return;
        }

        setIsCancelling(true);
        try {
            await escuelaService.cancelJoin();
            await checkAuth();
        } catch (err) {
            console.error("Error al cancelar solicitud:", err);
            alert("No se pudo cancelar la solicitud. Intente nuevamente.");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4 py-12 font-sans">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-secondary-200 p-8 md:p-10 text-center">
                <div className="inline-block p-4 bg-yellow-50 rounded-full mb-6 text-yellow-600 animate-pulse">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                
                <h1 className="text-2xl font-extrabold text-secondary-900 mb-2">Solicitud en Proceso</h1>
                <p className="text-secondary-600 mb-6 font-medium">
                    Hola <span className="text-primary-600">{user?.nombre}</span>, tu solicitud para unirte a la institución está siendo revisada por un administrador.
                </p>

                <div className="bg-secondary-50 rounded-lg p-4 mb-8 text-sm text-secondary-500 border border-secondary-100">
                    <p>Recibirás una notificación una vez que tu acceso sea aprobado. Por favor, vuelve a intentar más tarde.</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => checkAuth()}
                        className="w-full py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-all active:scale-95"
                    >
                        Actualizar Estado
                    </button>
                    
                    <button
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="w-full py-3 border border-secondary-300 text-secondary-600 font-bold rounded-lg hover:bg-secondary-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isCancelling ? 'Cancelando...' : 'Elegir otra Escuela'}
                    </button>
                    
                    <button
                        onClick={logout}
                        className="w-full py-3 text-red-500 font-bold hover:underline transition-all"
                    >
                        Cerrar Sesión
                    </button>
                </div>

                <p className="mt-10 text-xs text-secondary-400 font-bold uppercase tracking-widest">
                    SGEI - Community Access
                </p>
            </div>
        </div>
    );
};

export default PendingApproval;
