import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import escuelaService from '../../services/escuelaService';

/**
 * Página de administración para gestionar las solicitudes de unión a escuelas.
 */
const JoinRequests = () => {
    const { showNotification } = useAuth();
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const response = await escuelaService.getPendingRequests();
            setRequests(response.data || []);
        } catch (error) {
            console.error('Error al cargar solicitudes:', error);
            showNotification('No se pudieron cargar las solicitudes pendientes.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas aprobar esta solicitud de acceso?')) return;

        try {
            setProcessingId(id);
            await escuelaService.approveRequest(id);
            showNotification('Solicitud aprobada con éxito.', 'success');
            // Eliminar de la lista local
            setRequests(requests.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error al aprobar:', error);
            showNotification('Error al procesar la aprobación.', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt('Por favor, indica el motivo del rechazo (opcional):');
        if (reason === null) return; // Canceló el prompt

        try {
            setProcessingId(id);
            await escuelaService.rejectRequest(id, reason);
            showNotification('Solicitud rechazada.', 'info');
            // Eliminar de la lista local
            setRequests(requests.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error al rechazar:', error);
            showNotification('Error al procesar el rechazo.', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Gestión de Accesos</h1>
                    <p className="text-secondary-500 mt-1 font-medium">Aprueba o rechaza las solicitudes de vinculación institucional</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-secondary-200 shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-bold text-secondary-700">{requests.length} Solicitudes Pendientes</span>
                </div>
            </div>

            {/* Tabla de Solicitudes */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-medium">Cargando solicitudes...</p>
                    </div>
                ) : requests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Usuario</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Institución</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Rol Solicitado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {requests.map((request) => (
                                    <tr key={request.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                                                    {request.usuario.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-900">{request.usuario.nombre}</p>
                                                    <p className="text-xs text-secondary-500">{request.usuario.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-secondary-800">{request.escuela.nombre}</p>
                                            <p className="text-xs text-secondary-500">CUE: {request.escuela.cue_anexo}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-100 text-secondary-700 uppercase">
                                                {request.rol_escolar.nombre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleReject(request.id)}
                                                    disabled={processingId === request.id}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors title='Rechazar'"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(request.id)}
                                                    disabled={processingId === request.id}
                                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {processingId === request.id ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                    Aprobar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-secondary-900 mb-2">Todo al día</h3>
                        <p className="text-secondary-500 max-w-sm mx-auto">No hay solicitudes de vinculación pendientes de revisión en este momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JoinRequests;
