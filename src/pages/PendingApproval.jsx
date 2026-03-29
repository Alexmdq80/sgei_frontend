import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import escuelaService from '../services/escuelaService';

/**
 * Vista informativa de espera de aprobación.
 */
const PendingApproval = () => {
    const { user, logout, checkAuth } = useAuth();
    const [isCancelling, setIsCancelling] = useState(false);
    const navigate = useNavigate();

    const handleCancel = async (escuelaId = null) => {
        const msg = escuelaId 
            ? "¿Estás seguro de que deseas cancelar la solicitud para esta escuela específica?"
            : "¿Estás seguro de que deseas cancelar TODAS tus solicitudes?";
            
        if (!window.confirm(msg)) {
            return;
        }

        setIsCancelling(true);
        try {
            // Si pasamos escuelaId, el backend debería soportarlo. 
            // Por ahora cancelJoin cancela todo según el service actual, 
            // pero vamos a simularlo o mejorarlo después si es necesario.
            await escuelaService.cancelJoin(escuelaId);
            await checkAuth();
        } catch (err) {
            console.error("Error al cancelar solicitud:", err);
            alert("No se pudo cancelar la solicitud. Intente nuevamente.");
        } finally {
            setIsCancelling(false);
        }
    };

    const pendingRequests = user?.escuela_usuarios?.filter(v => !v.verified_at) || [];

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-100 px-4 py-12 font-sans">
            <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-secondary-200 p-8 md:p-10 text-center animate-fadeIn">
                <div className="inline-block p-4 bg-yellow-50 rounded-full mb-6 text-yellow-600 animate-pulse">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                
                <h1 className="text-3xl font-extrabold text-secondary-900 mb-2 tracking-tight">Solicitud en Proceso</h1>
                <p className="text-secondary-600 mb-8 font-medium">
                    Hola <span className="text-primary-600 font-bold">{user?.nombre}</span>, tus solicitudes de vinculación están siendo revisadas.
                </p>

                {/* Lista de Escuelas Solicitadas */}
                <div className="text-left mb-8 space-y-3">
                    <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-2 px-1">Escuelas Pendientes</p>
                    {pendingRequests.length > 0 ? (
                        <div className="space-y-3">
                            {pendingRequests.map((req) => (
                                <div key={req.id} className="p-4 bg-secondary-50 border border-secondary-200 rounded-xl flex items-center justify-between group">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">
                                            {req.escuela?.nombre}
                                        </h4>
                                        <p className="text-xs text-secondary-500 font-medium">
                                            Rol: {req.rol_escolar?.nombre || 'No asignado'} • {new Date(req.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleCancel(req.escuela_id)}
                                        className="p-2 text-secondary-400 hover:text-red-500 transition-colors"
                                        title="Cancelar esta solicitud"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl text-center">
                            No tienes solicitudes pendientes.
                        </div>
                    )}
                </div>

                <div className="bg-primary-50 rounded-2xl p-6 mb-8 text-sm text-primary-700 border border-primary-100 flex items-start gap-4">
                    <svg className="w-6 h-6 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-left font-medium">Recibirás una notificación una vez que tu acceso sea aprobado. Puedes vincularte a más escuelas si lo necesitas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => checkAuth()}
                        className="py-3.5 bg-secondary-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all active:scale-95"
                    >
                        Actualizar Estado
                    </button>
                    
                    <Link
                        to="/select-school"
                        className="py-3.5 bg-primary-600 text-white font-bold rounded-xl shadow-lg hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Vincular Otra Escuela
                    </Link>
                </div>

                <div className="mt-8 flex flex-col items-center gap-4">
                    <button
                        onClick={logout}
                        className="text-secondary-500 font-bold hover:text-red-500 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar Sesión
                    </button>
                    
                    <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">
                        SGEI - Community Access
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
