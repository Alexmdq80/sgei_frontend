import { useState, useEffect } from "react";
import {
  UserPlus,
  Search,
  Eye,
  Pencil,
  Link,
  Link2Off,
  Loader2,
  Mail,
  ShieldCheck,
  X,
  User,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { parseError } from "../../utils/errorParser";
import personaService from "../../services/personaService";
import cupofService from "../../services/cupofService";
import documentoTipoService from "../../services/documentoTipoService";
import ConfirmUnlinkUserModal from "../../components/ConfirmUnlinkUserModal";

/**
 * Componente para la gestión integral del Padrón de Personas (Agentes).
 */
export default function PersonaManagement() {
  const { user: authUser, showNotification } = useAuth();

  // Jerarquía de Roles para Gestión de Personas
  const isSuperUser =
    authUser?.roles?.some((r) => r.name === "superuser") ||
    authUser?.es_administrador;
  const isConduccion = authUser?.roles?.some((r) =>
    ["director", "vicedirector", "secretario", "prosecretario"].includes(
      r.name,
    ),
  );

  // Permiso Global de Gestión (CRUD del Padrón)
  const canManage = isSuperUser;

  // Estados de Datos
  const [personas, setPersonas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [docTipos, setDocTipos] = useState([]);

  // Estados de Modales y Selección
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(null);
  const [editingPersonaId, setEditingPersonaId] = useState(null);
  const [isEmailLocked, setIsEmailLocked] = useState(false);

  // Estados de Asignación (CUPOF)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [cupofSearchTerm, setCupofSearchTerm] = useState("");
  const [availableCupofs, setAvailableCupofs] = useState([]);
  const [isSearchingCupof, setIsSearchingCupof] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    cupof_id: "",
    situacion_revista: "titular",
    fecha_inicio: new Date().toISOString().split("T")[0],
    resolucion: "",
  });

  // Estados de Roles Administrativos (Hierarchy Rules)

  // Estados de Carga Específicos
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [isLinkingUser, setIsLinkingUser] = useState(null);

  // Formulario
  const [personaFormData, setPersonaFormData] = useState({
    apellido: "",
    nombre: "",
    documento_tipo_id: "",
    documento_numero: "",
    email: "",
  });

  const fetchPersonas = async (page = 1) => {
    if (!canManage) return;
    try {
      setIsLoading(true);
      const response = await personaService.getAll({
        search: searchTerm,
        page,
        per_page: 15,
      });
      setPersonas(response.data || []);
      setPagination(
        response.meta || { current_page: 1, last_page: 1, total: 0 },
      );
    } catch (error) {
      console.error("Error al cargar personas:", error);
      showNotification(
        parseError(error, "Error al cargar el padrón."),
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocTipos = async () => {
    try {
      const response = await documentoTipoService.getAll();
      setDocTipos(response || []);
    } catch (error) {
      console.error("Error al cargar tipos de documento:", error);
    }
  };






  useEffect(() => {
    fetchPersonas();
    fetchDocTipos();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPersonas(1);
  };

  const refreshSelectedPersona = async (id) => {
    try {
      const response = await personaService.getById(id || selectedPersona.id);
      setSelectedPersona(response.data);
      return response.data;
    } catch (error) {
      console.error("Error al refrescar detalles de la persona:", error);
    }
  };








  const handleViewPersona = async (id) => {
    try {
      setIsFetchingDetails(true);
      const response = await personaService.getById(id);
      setSelectedPersona(response.data);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error("Error al obtener detalles de la persona:", error);
      showNotification(
        parseError(error, "No se pudieron cargar los detalles del registro."),
        "error",
      );
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleDeletePersona = async (persona) => {
    if (
      !window.confirm(
        `¿Está seguro de que deseas eliminar a ${persona.nombre_completo} del padrón? Esta acción es irreversible.`,
      )
    ) {
      return;
    }
    try {
      await personaService.delete(persona.id);
      showNotification("Registro eliminado con éxito.", "success");
      fetchPersonas(pagination.current_page);
    } catch (error) {
      console.error("Error al eliminar persona:", error);
      showNotification(
        parseError(error, "No se pudo eliminar el registro."),
        "error",
      );
    }
  };

  const handleSearchCupof = async (e) => {
    e.preventDefault();
    if (cupofSearchTerm.length < 3) {
      showNotification(
        "Ingresa al menos 3 caracteres para buscar un CUPOF.",
        "warning",
      );
      return;
    }
    try {
      setIsSearchingCupof(true);
      const response = await cupofService.getAll({
        search: cupofSearchTerm,
        only_available: true,
      });
      setAvailableCupofs(response.data || []);
      if (response.data?.length === 0) {
        showNotification(
          "No se encontraron CUPOF vacantes con ese criterio.",
          "info",
        );
      }
    } catch (error) {
      console.error("Error al buscar CUPOF:", error);
      showNotification(
        parseError(error, "Error al buscar posiciones disponibles."),
        "error",
      );
    } finally {
      setIsSearchingCupof(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignmentData.cupof_id) {
      showNotification("Debes seleccionar un puesto (CUPOF).", "warning");
      return;
    }
    try {
      setIsSavingAssignment(true);
      await cupofService.assign(assignmentData.cupof_id, {
        persona_id: selectedPersona.id,
        situacion_revista: assignmentData.situacion_revista,
        fecha_inicio: assignmentData.fecha_inicio,
        resolucion: assignmentData.resolucion,
      });

      showNotification("Asignación realizada con éxito.", "success");
      setIsAssignModalOpen(false);
      setIsDetailsModalOpen(false);
      fetchPersonas(pagination.current_page);
    } catch (error) {
      console.error("Error al asignar CUPOF:", error);
      showNotification(
        parseError(error, "No se pudo completar la asignación."),
        "error",
      );
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleEditPersona = (persona) => {
    setIsEditMode(true);
    setIsEmailLocked(!!persona.usuario_id); // Bloquear email y DNI si tiene usuario vinculado
    setEditingPersonaId(persona.id);
    setPersonaFormData({
      apellido: persona.apellido,
      nombre: persona.nombre,
      documento_tipo_id: persona.documento_tipo_id,
      documento_numero: persona.documento_numero,
      email: persona.contacto?.email || persona.usuario_email || "",
    });
    setIsCreateModalOpen(true);
  };

  const handleCreatePersona = () => {
    setIsEditMode(false);
    setIsEmailLocked(false);
    setEditingPersonaId(null);
    setPersonaFormData({
      apellido: "",
      nombre: "",
      documento_tipo_id: "",
      documento_numero: "",
      email: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleSubmitPersona = async (e) => {
    e.preventDefault();
    try {
      setIsSavingPersona(true);
      if (isEditMode) {
        await personaService.update(editingPersonaId, personaFormData);
        showNotification(
          "Registro de persona actualizado con éxito.",
          "success",
        );
      } else {
        await personaService.create(personaFormData);
        showNotification(
          "Persona registrada con éxito en el padrón.",
          "success",
        );
      }
      setIsCreateModalOpen(false);
      fetchPersonas(isEditMode ? pagination.current_page : 1);
    } catch (error) {
      if (error.isConfirmationRequired) {
        // Guardar el contexto y el payload para reenviar con confirmación
        setConfirmationPending({
          payload: { ...personaFormData },
          context: error.confirmationContext,
        });
        return;
      }
      console.error("Error al procesar persona:", error);
      showNotification(
        parseError(
          error,
          `No se pudo ${isEditMode ? "actualizar" : "registrar"} la persona.`,
        ),
        "error",
      );
    } finally {
      setIsSavingPersona(false);
    }
  };

  const handleConfirmUnlink = async () => {
    if (!confirmationPending) return;
    try {
      setIsSavingPersona(true);
      await personaService.update(editingPersonaId, {
        ...confirmationPending.payload,
        confirmed: true,
      });
      setConfirmationPending(null);
      setIsCreateModalOpen(false);
      showNotification(
        "Email actualizado. El usuario fue desvinculado y re-vinculado con el nuevo email.",
        "success",
      );
      fetchPersonas(pagination.current_page);
    } catch (error) {
      console.error("Error al confirmar desvinculación:", error);
      showNotification(
        parseError(error, "No se pudo completar la actualización del email."),
        "error",
      );
    } finally {
      setIsSavingPersona(false);
    }
  };

  const handleCancelUnlink = () => {
    setConfirmationPending(null); // No se hace nada
  };

  const handleLinkUser = async (personaId) => {
    try {
      setIsLinkingUser(personaId);
      const response = await personaService.tryLinkUser(personaId);
      showNotification(response.message, "success");
      fetchPersonas(pagination.current_page);
    } catch (error) {
      console.error("Error al vincular usuario:", error);
      showNotification(
        parseError(error, "No se pudo realizar la vinculación.", "warning"),
        "warning",
      );
    } finally {
      setIsLinkingUser(null);
    }
  };

  const handleUnlinkUser = async (personaId) => {
    try {
      setIsLinkingUser(personaId);
      const response = await personaService.unlinkUser(personaId);
      showNotification(response.message, "success");
      fetchPersonas(pagination.current_page);
    } catch (error) {
      console.error("Error al desvincular usuario:", error);
      showNotification(
        parseError(error, "No se pudo realizar la desvinculación."),
        "error",
      );
    } finally {
      setIsLinkingUser(null);
    }
  };

  const handleResendActivation = async (personaId) => {
    try {
      setIsLinkingUser(personaId);
      const response = await personaService.resendActivation(personaId);
      showNotification(response.message, "success");
    } catch (error) {
      console.error("Error al reenviar activación:", error);
      showNotification(
        parseError(error, "No se pudo reenviar la invitación."),
        "error",
      );
    } finally {
      setIsLinkingUser(null);
    }
  };

  if (!canManage) {
    return (
      <div className="p-10 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold">
          Acceso Denegado: No tienes permisos para gestionar el padrón de
          personas.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
            Gestión de Personas
          </h1>
          <p className="text-secondary-500 mt-1 font-medium italic">
            Administración del Padrón
          </p>
        </div>
        <button
          onClick={handleCreatePersona}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-primary-700 transition-all active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          Nueva Persona
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
        <form onSubmit={handleSearch} className="flex gap-3 w-full lg:max-w-md">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o DNI..."
              className="w-full pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Listado */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
            <p className="text-secondary-500 font-medium italic">
              Cargando padrón...
            </p>
          </div>
        ) : personas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                    Apellido y Nombre
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                    Vinculación Usuario
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                    Administración
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {personas.map((persona) => (
                  <tr
                    key={persona.id}
                    className="hover:bg-secondary-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-700 font-bold border border-secondary-200 shadow-sm">
                          {persona.apellido.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-secondary-900 uppercase">
                            {persona.apellido}
                          </p>
                          <p className="text-xs text-secondary-500 font-bold uppercase">
                            {persona.nombre}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-secondary-700 bg-secondary-100 px-2 py-1 rounded">
                        {persona.documento_tipo?.nombre}{" "}
                        {persona.documento_numero}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {persona.usuario_email ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-xs font-bold text-secondary-800">
                              {persona.usuario_email}
                            </span>
                          </div>
                          {isSuperUser && (
                            <button
                              onClick={() => handleUnlinkUser(persona.id)}
                              disabled={isLinkingUser === persona.id}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all border border-red-100 group"
                              title="Desvincular Usuario"
                            >
                              {isLinkingUser === persona.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Link2Off className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-secondary-400 italic">
                            <span className="w-2 h-2 bg-secondary-300 rounded-full"></span>
                            <span className="text-xs font-medium">
                              Sin cuenta
                            </span>
                          </div>
                          {isSuperUser && (
                            <button
                              onClick={() => handleLinkUser(persona.id)}
                              disabled={isLinkingUser === persona.id}
                              className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-lg transition-all border border-primary-100 group"
                              title="Buscar y Vincular Usuario por DNI e Email"
                            >
                              {isLinkingUser === persona.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Link className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] text-secondary-400 font-medium italic">
                          Sin roles administrativos.
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeletePersona(persona)}
                          className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar del Padrón"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleViewPersona(persona.id)}
                          disabled={isFetchingDetails}
                          className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Visualizar Registro"
                        >
                          {isFetchingDetails ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditPersona(persona)}
                          className="p-2 text-secondary-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar Registro"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center text-secondary-500 font-bold italic">
            No se encontraron registros en el padrón.
          </div>
        )}

        {/* Paginación */}
        {pagination.last_page > 1 && (
          <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
            <p className="text-xs text-secondary-500 font-bold">
              Total: {pagination.total} personas
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.current_page === 1}
                onClick={() => fetchPersonas(pagination.current_page - 1)}
                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                Página {pagination.current_page} de {pagination.last_page}
              </span>
              <button
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchPersonas(pagination.current_page + 1)}
                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLES */}
      {isDetailsModalOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
              <div>
                <h2 className="text-xl font-black text-secondary-900 uppercase">
                  Detalle de la Persona
                </h2>
                <p className="text-xs text-secondary-500 font-bold tracking-widest mt-0.5 uppercase">
                  Identificador de Padrón: {selectedPersona.id}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-secondary-100 pb-2">
                    <User className="w-5 h-5 text-primary-500" />
                    <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest">
                      Información de Identidad
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Apellido y Nombre
                      </p>
                      <p className="text-lg font-black text-secondary-900 uppercase">
                        {selectedPersona.nombre_completo}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Documento
                      </p>
                      <p className="text-sm font-bold text-secondary-900 uppercase">
                        {selectedPersona.documento_tipo_nombre}:{" "}
                        {selectedPersona.documento_numero}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seguridad y Vinculación */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-secondary-100 pb-2">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest">
                      Seguridad y Vinculación
                    </h3>
                  </div>
                  <div className="p-6 bg-green-50/50 border border-green-100 rounded-2xl">
                    {selectedPersona.usuario_email ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                            Cuenta de Usuario Vinculada
                          </p>
                          <p className="text-sm font-black text-secondary-900 mt-1">
                            {selectedPersona.usuario_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!selectedPersona.usuario?.email_verified_at && (
                            <button
                              onClick={() =>
                                handleResendActivation(selectedPersona.id)
                              }
                              disabled={isLinkingUser === selectedPersona.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors"
                              title="Reenviar correo de activación"
                            >
                              {isLinkingUser === selectedPersona.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              Reenviar Invitación
                            </button>
                          )}
                          <span
                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${selectedPersona.usuario?.email_verified_at ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                          >
                            {selectedPersona.usuario?.email_verified_at
                              ? "Activa"
                              : "Pendiente Activación"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between italic">
                        <p className="text-sm text-secondary-500 font-medium tracking-tight">
                          Esta persona no posee una cuenta de usuario vinculada.
                        </p>
                        <span className="px-3 py-1 bg-secondary-100 text-secondary-400 text-[10px] font-black uppercase rounded-full border border-secondary-200">
                          Desvinculado
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  {(isSuperUser || isConduccion) && (
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="flex-1 px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                    >
                      <Link className="w-5 h-5" />
                      Asignar CUPOF
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-lg"
                  >
                    Cerrar Vista
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col border border-secondary-100">
            <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 px-8 py-5">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-black border-2 border-white/40 shadow-lg">
                  {personaFormData.apellido?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white truncate">
                    {isEditMode ? "Modificar Registro" : "Registrar Persona"}
                  </h2>
                  <p className="text-white/80 text-sm font-medium truncate">
                    {isEditMode
                      ? `${personaFormData.apellido}, ${personaFormData.nombre}`
                      : "Alta en el Padrón"}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitPersona} className="overflow-y-auto flex-1 p-6 space-y-6">
              <section>
                <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Datos de Identidad
                </h3>
                {isEditMode && isEmailLocked && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                    Esta persona tiene un usuario vinculado. Los campos DNI y
                    Email están bloqueados para preservar la integridad del
                    vínculo.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                    Apellido
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    value={personaFormData.apellido}
                    onChange={(e) =>
                      setPersonaFormData((prev) => ({
                        ...prev,
                        apellido: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    value={personaFormData.nombre}
                    onChange={(e) =>
                      setPersonaFormData((prev) => ({
                        ...prev,
                        nombre: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                    Tipo Documento
                  </label>
                  <select
                    required
                    disabled={isEmailLocked}
                    title={
                      isEmailLocked
                        ? "El tipo de documento está bloqueado porque la persona tiene un usuario vinculado."
                        : ""
                    }
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold ${
                      isEmailLocked
                        ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                        : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                    }`}
                    value={personaFormData.documento_tipo_id}
                    onChange={(e) =>
                      setPersonaFormData((prev) => ({
                        ...prev,
                        documento_tipo_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleccionar...</option>
                    {docTipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                    Número Documento
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEmailLocked}
                    title={
                      isEmailLocked
                        ? "El número de documento está bloqueado porque la persona tiene un usuario vinculado."
                        : ""
                    }
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold ${
                      isEmailLocked
                        ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                        : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                    }`}
                    value={personaFormData.documento_numero}
                    onChange={(e) =>
                      setPersonaFormData((prev) => ({
                        ...prev,
                        documento_numero: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                    Email (Opcional)
                  </label>
                  <input
                    type="email"
                    disabled={isEmailLocked}
                    title={
                      isEmailLocked
                        ? "El email está bloqueado porque la persona tiene un usuario vinculado."
                        : ""
                    }
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold lowercase ${
                      isEmailLocked
                        ? "bg-secondary-100 text-secondary-400 cursor-not-allowed"
                        : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                    }`}
                    value={personaFormData.email}
                    onChange={(e) =>
                      setPersonaFormData((prev) => ({
                        ...prev,
                        email: e.target.value.toLowerCase(),
                      }))
                    }
                  />
                </div>
                </div>
              </section>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all active:scale-[0.98]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPersona}
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
                >
                  {isSavingPersona
                    ? "Guardando..."
                    : isEditMode
                      ? "Guardar Cambios"
                      : "Registrar Persona"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNACIÓN CUPOF */}
      {isAssignModalOpen && selectedPersona && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-primary-100">
            <div className="p-6 border-b border-secondary-100 bg-primary-50 flex items-center justify-between">
              <h2 className="text-xl font-black text-primary-900 uppercase">
                Vincular a Cargo (CUPOF)
              </h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-primary-400 hover:text-primary-600"
              >
                <X />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <form onSubmit={handleSearchCupof} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar CUPOF por código o escuela..."
                  className="flex-1 px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold"
                  value={cupofSearchTerm}
                  onChange={(e) => setCupofSearchTerm(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isSearchingCupof}
                  className="px-6 py-3 bg-secondary-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest disabled:opacity-50"
                >
                  {isSearchingCupof ? "..." : "Buscar"}
                </button>
              </form>
              {availableCupofs.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {availableCupofs.map((cupof) => (
                    <button
                      key={cupof.id}
                      onClick={() =>
                        setAssignmentData((prev) => ({
                          ...prev,
                          cupof_id: cupof.id,
                        }))
                      }
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${assignmentData.cupof_id === cupof.id ? "border-primary-500 bg-primary-50 ring-2" : "border-secondary-100 hover:border-primary-200"}`}
                    >
                      <p className="text-xs font-black text-secondary-900 uppercase">
                        {cupof.codigo_cupof} - {cupof.tipo_puesto}
                      </p>
                      <p className="text-[10px] text-secondary-500 font-bold uppercase">
                        {cupof.escuela?.nombre}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {assignmentData.cupof_id && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-secondary-100 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                      Revista
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold"
                      value={assignmentData.situacion_revista}
                      onChange={(e) =>
                        setAssignmentData((prev) => ({
                          ...prev,
                          situacion_revista: e.target.value,
                        }))
                      }
                    >
                      <option value="titular">Titular</option>
                      <option value="provisional">Provisional</option>
                      <option value="suplente">Suplente</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                      Inicio
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold"
                      value={assignmentData.fecha_inicio}
                      onChange={(e) =>
                        setAssignmentData((prev) => ({
                          ...prev,
                          fecha_inicio: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 py-4 bg-secondary-100 text-secondary-600 rounded-2xl font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAssignment}
                  disabled={isSavingAssignment || !assignmentData.cupof_id}
                  className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                >
                  {isSavingAssignment
                    ? "Confirmando..."
                    : "Confirmar Asignación"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DESVINCULACIÓN POR CAMBIO DE EMAIL */}
      <ConfirmUnlinkUserModal
        isOpen={!!confirmationPending}
        onConfirm={handleConfirmUnlink}
        onCancel={handleCancelUnlink}
        context={confirmationPending?.context}
      />
    </div>
  );
}
