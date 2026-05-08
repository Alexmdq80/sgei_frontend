import { useState, useEffect } from 'react';
import { 
    Users, Search, Eye, Info, X, 
    User, Mail, Phone, Home, ShieldCheck, MapPin, Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import personaService from '../../services/personaService';

/**
 * Componente para visualizar la Comunidad Educativa de una institución.
 * Muestra personas vinculadas directa (agentes) o indirectamente (familiares).
 */
export default function ComunidadEducativa() {
    const { activeProfile, showNotification } = useAuth();
    const [personas, setPersonas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    // Estados para el Modal de Detalles
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);

    const fetchComunidad = async (page = 1) => {
        if (!activeProfile?.escuela_id) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await personaService.getComunidad({ 
                escuela_id: activeProfile.escuela_id,
                search: searchTerm,
                page,
                per_page: 15
            });
            setPersonas(response.data || []);
            setPagination(response.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (error) {
            console.error('Error al cargar comunidad:', error);
            showNotification(parseError(error, 'No se pudo cargar la comunidad educativa.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchComunidad();
    }, [activeProfile?.escuela_id]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchComunidad(1);
    };

    const handleViewPersona = async (id) => {
        try {
            setIsFetchingDetails(true);
            const response = await personaService.getById(id);
            setSelectedPersona(response.data);
            setIsDetailsModalOpen(true);
        } catch (error) {
            console.error('Error al obtener detalles:', error);
            showNotification(parseError(error, 'No se pudieron cargar los detalles.'), 'error');
        } finally {
            setIsFetchingDetails(false);
        }
    };

    if (!activeProfile?.escuela_id) {
        return (
            <div className="p-10 text-center bg-white rounded-3xl border border-secondary-200 shadow-sm">
                <Info className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-secondary-900 uppercase">Perfil Institucional Requerido</h2>
                <p className="text-secondary-500 mt-2 font-medium">Debe seleccionar una institución para visualizar su comunidad educativa.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Comunidad Educativa</h1>
                    <p className="text-secondary-500 mt-1 font-medium italic">
                        Personas vinculadas a {activeProfile.escuela?.nombre || 'la institución'}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-2xl">
                    <Users className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-black text-primary-700 uppercase tracking-tighter">
                        {pagination.total} Miembros vinculados
                    </span>
                </div>
            </div>

            {/* Buscador */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
                <form onSubmit={handleSearch} className="flex gap-3 w-full lg:max-w-md">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                            <Search className="w-5 h-5" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o DNI..."
                            className="w-full pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="px-6 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors">
                        Buscar
                    </button>
                </form>
            </div>

            {/* Listado */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-medium italic">Cargando comunidad...</p>
                    </div>
                ) : personas.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Apellido y Nombre</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Documento</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Relación</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {personas.map((persona) => (
                                    <tr key={persona.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold border border-primary-100 shadow-sm">
                                                    {persona.apellido.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-secondary-900 uppercase">{persona.apellido}</p>
                                                    <p className="text-xs text-secondary-500 font-bold uppercase">{persona.nombre}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-secondary-700 bg-secondary-100 px-2 py-1 rounded">
                                                {persona.documento_tipo_nombre} {persona.documento_numero}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Aquí se podría inferir la relación si el backend la enviara */}
                                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded border border-green-100">
                                                Vinculado
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleViewPersona(persona.id)}
                                                className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                title="Ver Ficha"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-20 text-center text-secondary-500 font-bold italic">
                        No se encontraron miembros vinculados en la comunidad educativa.
                    </div>
                )}

                {/* Paginación */}
                {pagination.last_page > 1 && (
                    <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
                        <p className="text-xs text-secondary-500 font-bold">Total: {pagination.total} personas</p>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.current_page === 1}
                                onClick={() => fetchComunidad(pagination.current_page - 1)}
                                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                                Página {pagination.current_page} de {pagination.last_page}
                            </span>
                            <button
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => fetchComunidad(pagination.current_page + 1)}
                                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE DETALLES (REUTILIZADO DE PERSONA MANAGEMENT) */}
            {isDetailsModalOpen && selectedPersona && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
                            <div>
                                <h2 className="text-xl font-black text-secondary-900 uppercase">
                                    Ficha del Miembro
                                </h2>
                                <p className="text-xs text-secondary-500 font-bold tracking-widest mt-0.5 uppercase">Comunidad Educativa: {activeProfile.escuela?.nombre}</p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="text-secondary-400 hover:text-secondary-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 p-8 space-y-8">
                             {/* Información de Identidad */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Apellido y Nombre</p>
                                    <p className="text-lg font-black text-secondary-900 uppercase">{selectedPersona.nombre_completo}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">CUIL</p>
                                    <p className="text-lg font-bold text-primary-600 tracking-wider">{selectedPersona.cuil}</p>
                                </div>
                                <div className="space-y-0.5 pt-3 border-t border-secondary-200">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Documento</p>
                                    <p className="text-sm font-bold text-secondary-900">{selectedPersona.documento_tipo_nombre}: {selectedPersona.documento_numero}</p>
                                </div>
                                <div className="space-y-0.5 pt-3 border-t border-secondary-200">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Contacto</p>
                                    <p className="text-sm font-bold text-secondary-900">{selectedPersona.contacto?.email || 'Sin email registrado'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-indigo-500 mt-1" />
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Teléfonos</p>
                                        <p className="text-sm font-bold text-secondary-900 mt-1">{selectedPersona.contacto?.telefono_movil || 'S/D'}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                    <Home className="w-5 h-5 text-amber-500 mt-1" />
                                    <div>
                                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Domicilio</p>
                                        <p className="text-sm font-bold text-secondary-900 mt-1">
                                            {selectedPersona.domicilio?.calle} {selectedPersona.domicilio?.numero}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-secondary-50 border-t border-secondary-100">
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="w-full py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all"
                            >
                                Cerrar Ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
