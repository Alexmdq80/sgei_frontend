import { useState, useEffect } from 'react';
import { 
    Shield, Search, UserPlus, Trash2, 
    Loader2, MapPin, User, Mail, Info, X, Link, Link2Off, UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../utils/errorParser';
import regionUsuarioService from '../../services/regionUsuarioService';
import personaService from '../../services/personaService';
import geografiaService from '../../services/geografiaService';
import userService from '../../services/userService';
import PersonaCombobox from '../../components/PersonaCombobox';

/**
 * Gestión de Jefes Regionales.
 * Exclusivo para Jefes Provinciales y Superusuarios. Permite vincular usuarios con regiones.
 */
export default function RegionUsuarioManagement() {
    const { user, showNotification } = useAuth();
    const isSuperUser = user?.es_administrador || user?.roles?.some(r => r.name === 'superuser');
    const isJefeProvincial = user?.roles?.some(r => r.name === 'jefe_provincial');
    const hasAccess = isSuperUser || isJefeProvincial;

    const [associations, setAssociations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsCreateModalOpen] = useState(false);
    const [isProcessingAction, setIsProcessingAction] = useState(null);

    // Datos para el formulario
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [regions, setRegions] = useState([]);
    const [formData, setFormData] = useState({
        persona_id: '',
        region_id: ''
    });

    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const provinciaId = isJefeProvincial ? user?.provincia_usuario?.provincia_id : null;
            
            const [assocRes, regionsRes] = await Promise.all([
                regionUsuarioService.getAll(),
                geografiaService.getRegiones(provinciaId ? { provincia_id: provinciaId } : {})
            ]);
            
            setAssociations(assocRes || []);
            setRegions(regionsRes || []);
        } catch (error) {
            showNotification(parseError(error, 'Error al cargar datos de regiones.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasAccess) {
            fetchData();
        }
    }, [user]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!selectedPersona) return;
        try {
            setIsSaving(true);
            await personaService.assignJefeRegional(selectedPersona.id, formData.region_id);
            showNotification('Jefe Regional asignado con éxito.', 'success');
            setIsCreateModalOpen(false);
            setSelectedPersona(null);
            setFormData({ persona_id: '', region_id: '' });
            fetchData();
        } catch (error) {
            showNotification(parseError(error, 'No se pudo asignar el jefe regional.'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setSelectedPersona(null);
        setFormData({ persona_id: '', region_id: '' });
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta asignación de región? El rol de Jefe Regional será removido.')) return;
        try {
            await regionUsuarioService.delete(id);
            showNotification('Asignación eliminada con éxito.', 'success');
            fetchData();
        } catch (error) {
            showNotification('Error al eliminar asignación.', 'error');
        }
    };

    const handleConfirmVinculation = async (userId) => {
        if (!confirm('¿Confirmas que deseas vincular y activar esta identidad con el padrón de personas?')) return;
        try {
            setIsProcessingAction(userId);
            const response = await userService.confirmPersona(userId);
            showNotification(response.message, 'success');
            fetchData();
        } catch (error) {
            showNotification(parseError(error, 'Error al confirmar la vinculación.'), 'error');
        } finally {
            setIsProcessingAction(null);
        }
    };

    const filteredAssociations = associations.filter(a => 
        a.usuario?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.usuario?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `región ${a.region?.numero}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!hasAccess) {
        return (
            <main className="flex-grow p-8 overflow-y-auto bg-secondary-50/30">
                <div className="p-10 text-center bg-white rounded-3xl border border-secondary-200 shadow-sm animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info w-12 h-12 text-primary-500 mx-auto mb-4" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                    <h2 className="text-xl font-black text-secondary-900 uppercase">Acceso Restringido</h2>
                    <p className="text-secondary-500 mt-2 font-medium">No posee los permisos necesarios para gestionar los Jefes Regionales.</p>
                </div>
            </main>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Gestión de Jefes Regionales</h1>
                    <p className="text-secondary-500 mt-1 font-medium italic">
                        {isSuperUser ? 'Administración de Autoridades Regionales (Global)' : `Autoridades Regionales - Provincia de ${user?.provincia_usuario?.provincia?.nombre || ''}`}
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-primary-700 transition-all active:scale-95"
                >
                    <UserPlus className="w-5 h-5" />
                    Asignar Jefe
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
                <div className="relative max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                        <Search className="w-5 h-5" />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o región..."
                        className="w-full pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Listado */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-secondary-500 font-medium">Cargando autoridades...</p>
                    </div>
                ) : filteredAssociations.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Usuario / Agente</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Región Educativa</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Vinculación</th>
                                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {filteredAssociations.map((assoc) => (
                                    <tr key={assoc.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold border border-primary-100 shadow-sm">
                                                    <Shield className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-secondary-900 uppercase">
                                                        {assoc.usuario?.persona?.apellido || ''} {assoc.usuario?.persona?.nombre || assoc.usuario?.nombre}
                                                    </p>
                                                    <p className="text-xs text-secondary-500 font-bold">{assoc.usuario?.email}</p>
                                                    {assoc.usuario?.documento_numero && (
                                                        <p className="text-[10px] text-secondary-400 font-bold">DNI {assoc.usuario.documento_numero}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-primary-500" />
                                                <span className="text-sm font-bold text-secondary-700 uppercase">
                                                    Región {assoc.region?.numero} ({assoc.region?.provincia?.nombre}) 
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {assoc.usuario?.persona ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                    <UserCheck className="w-3.5 h-3.5" /> Vinculado
                                                </span>
                                            ) : assoc.usuario?.estado === 'vinculacion_pendiente' ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm animate-pulse">
                                                        Pendiente Confirmación
                                                    </span>
                                                    <button
                                                        onClick={() => handleConfirmVinculation(assoc.usuario.id)}
                                                        disabled={isProcessingAction === assoc.usuario.id}
                                                        className="px-2.5 py-1 bg-amber-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-amber-700 transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                                                        title="Vincular con Persona en el Padrón"
                                                    >
                                                        {isProcessingAction === assoc.usuario.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            'Confirmar'
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-500 italic">
                                                    Sin vincular
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(assoc.id)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar Asignación"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-20 text-center text-secondary-500 font-bold italic">
                        No hay jefes regionales asignados.
                    </div>
                )}
            </div>

            {/* MODAL DE ASIGNACIÓN */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-visible animate-scaleIn">
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-primary-50 rounded-t-3xl">
                            <h2 className="text-xl font-black text-primary-900 uppercase">Asignar Jefe Regional</h2>
                            <button type="button" onClick={handleCloseModal} className="text-primary-400 hover:text-primary-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-8 space-y-6 min-h-[340px]">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Persona</label>
                                    <div className="mt-1">
                                        <PersonaCombobox
                                            value={selectedPersona}
                                            onChange={(p) => {
                                                setSelectedPersona(p);
                                                setFormData({ ...formData, persona_id: p?.id || '' });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1">Región Educativa</label>
                                    <select 
                                        required
                                        className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        value={formData.region_id}
                                        onChange={(e) => setFormData({...formData, region_id: e.target.value})}
                                    >
                                        <option value="">Seleccionar región...</option>
                                        {regions.map(r => (
                                            <option key={r.id} value={r.id}>
                                                Región {r.numero} {/*({r.provincia?.nombre || 'Provincia'})*/}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-6 py-4 bg-secondary-100 text-secondary-600 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !selectedPersona || !formData.region_id}
                                    className="flex-[2] px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
