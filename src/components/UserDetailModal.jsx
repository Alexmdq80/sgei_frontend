import { useEffect, useState } from "react";
import {
  X,
  Mail,
  ShieldCheck,
  UserCheck,
  IdCard,
  BadgeCheck,
  AlertTriangle,
  Phone,
  Smartphone,
  UserX,
  Link2,
  Link2Off,
  Loader2,
  Pencil,
} from "lucide-react";
import userService from "../services/userService";

const UserDetailModal = ({
  user,
  isOpen,
  onClose,
  onVincularPersona,
  onDesvincularPersona,
  isLinkingPersona,
  onEdit,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const [candidatos, setCandidatos] = useState([]);
  const [isSearchingCandidatos, setIsSearchingCandidatos] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

   useEffect(() => {
    // Resetear estado al cambiar de usuario o al cerrar el modal
    setCandidatos([]);
    setHasSearched(false);

    // Condiciones de guarda: modal cerrado, sin ID, sin documento, o ya vinculado
    if (!isOpen || !user?.id || !user?.documento_numero || user?.persona) return;

    // Búsqueda automática cuando el usuario no tiene persona vinculada
    setIsSearchingCandidatos(true);
    setHasSearched(true);
    userService
      .getCandidatosPersona(user.id)
      .then((response) => setCandidatos(response.data || []))
      .catch(() => setCandidatos([]))
      .finally(() => setIsSearchingCandidatos(false));
  }, [isOpen, user]);

  if (!isOpen) return null;

  const isProtected =
    user?.es_administrador || user?.roles?.some((r) => r.name === "superuser");

  const getEstadoConfig = (estado) => {
    const configs = {
      activo: {
        label: "Activo",
        classes: "bg-green-100 text-green-700 border-green-200",
        dot: "bg-green-500",
      },
      email_pendiente: {
        label: "Email Pendiente",
        classes: "bg-amber-100 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      },
      esperando_activacion: {
        label: "Esperando Activación",
        classes: "bg-amber-100 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      },
      vinculacion_pendiente: {
        label: "Vinculación Pendiente",
        classes: "bg-purple-100 text-purple-700 border-purple-200",
        dot: "bg-purple-500",
      },
      email_verificado: {
        label: "Email Verificado",
        classes: "bg-blue-100 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      },
    };
    return (
      configs[estado] || {
        label: estado || "Desconocido",
        classes: "bg-secondary-100 text-secondary-600 border-secondary-200",
        dot: "bg-secondary-400",
      }
    );
  };

  const estadoConfig = getEstadoConfig(user?.estado);

  const getInitials = () => {
    if (!user?.nombre) return "?";
    return user.nombre.charAt(0).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const roleLabels = {
    superuser: "Superusuario",
  };

  const getRoleLabel = (name) => roleLabels[name] || name.replace("_", " ");


  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del usuario"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col border border-secondary-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 px-8 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          {!isProtected && (
            <button
              onClick={onEdit}
              className="absolute top-4 right-14 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Editar usuario"
              title="Editar información del usuario"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-black border-2 border-white/40 shadow-lg">
              {getInitials()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white truncate">
                {user?.nombre || "Sin nombre"}
              </h2>
              <p className="text-white/80 text-sm font-medium truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {isProtected
                  ? "Información protegida"
                  : user?.email || "Sin email"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${estadoConfig.classes}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${estadoConfig.dot} animate-pulse`}
              ></span>
              {estadoConfig.label}
            </span>
          </div>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Sección: Identidad y Documentación */}
          <section>
            <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
              <IdCard className="w-4 h-4" /> Identidad y Documentación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">
                  Tipo Documento
                </p>
                <p className="text-sm font-bold text-secondary-900">
                  {isProtected
                    ? "Protegido"
                    : user?.documento_tipo?.nombre || "S/D"}
                </p>
              </div>
              <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">
                  Número Documento
                </p>
                <p className="text-sm font-bold text-secondary-900 tracking-wider">
                  {isProtected ? "Protegido" : user?.documento_numero || "S/N"}
                </p>
              </div>
              <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">
                  ID Interno
                </p>
                <p className="text-sm font-bold text-secondary-900 font-mono">
                  {isProtected ? "Protegido" : user?.id || "—"}
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-secondary-50 border border-secondary-200 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">
                  Verificación de Email
                </p>
                {user?.email_verified_at ? (
                  <p className="text-sm font-bold text-green-700 flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4" /> Verificado el{" "}
                    {formatDate(user.email_verified_at)}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Sin verificar
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Sección: Roles y Privilegios */}
          <section>
            <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Roles y Privilegios
            </h3>
            <div className="flex flex-wrap gap-2">
              {user?.es_administrador && (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-black uppercase rounded-full border border-red-200 shadow-sm">
                  Administrador
                </span>
              )}
              {user?.roles?.map((role) => (
                <span
                  key={role.id}
                  className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-black uppercase rounded-full border border-primary-200 shadow-sm"
                >
                  {getRoleLabel(role.name)}
                </span>
              ))}
              {user?.escuelas_personas?.map((ep) => (
                <span
                  key={ep.id}
                  className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black uppercase rounded-full border border-indigo-100 shadow-sm"
                  title={ep.escuela?.nombre}
                >
                  {ep.role?.name?.replace("_", " ")}: {ep.escuela?.nombre}
                </span>
              ))}
              {!user?.es_administrador &&
                (!user?.roles || user.roles.length === 0) &&
                (!user?.escuelas_personas ||
                  user.escuelas_personas.length === 0) && (
                  <span className="px-3 py-1 bg-secondary-100 text-secondary-500 text-xs font-bold uppercase rounded-full italic">
                    Usuario Estándar
                  </span>
                )}
            </div>
          </section>

          {/* Sección: Vinculación con Padrón */}
          <section>
            <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Vinculación con Padrón de
              Personas
            </h3>
            {isProtected ? (
              <div className="p-6 bg-secondary-50 border border-secondary-200 rounded-2xl flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-secondary-400" />
                <div>
                  <p className="text-sm font-black text-secondary-500 uppercase tracking-wide">
                    Cuenta Protegida
                  </p>
                  <p className="text-xs text-secondary-400 font-medium mt-0.5">
                    No se permite la vinculación de cuentas de superusuario o
                    administrador con el padrón de personas.
                  </p>
                </div>
              </div>
            ) : user?.persona ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-black uppercase rounded-full border border-green-200 shadow-sm flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5" /> Vinculado al Padrón
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">
                      ID Persona
                    </p>
                    <p className="text-sm font-bold text-secondary-900 font-mono">
                      {user.persona.id}
                    </p>
                  </div>
                  <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">
                      CUIL
                    </p>
                    <p className="text-sm font-bold text-secondary-900">
                      {user.persona.cuil || "S/D"}
                    </p>
                  </div>
                  <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">
                      Nombre en Padrón
                    </p>
                    <p className="text-sm font-bold text-secondary-900">
                      {user.persona.nombre_completo || "S/D"}
                    </p>
                  </div>
                </div>
                {user.persona.contacto && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Teléfono Fijo
                      </p>
                      <p className="text-sm font-bold text-secondary-900">
                        {user.persona.contacto.telefono_fijo || "S/D"}
                      </p>
                    </div>
                    <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" /> Celular
                      </p>
                      <p className="text-sm font-bold text-secondary-900">
                        {user.persona.contacto.telefono_movil || "S/D"}
                      </p>
                    </div>
                    <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> Email Padrón
                      </p>
                      <p className="text-sm font-bold text-secondary-900">
                        {user.persona.contacto.email || "S/D"}
                      </p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => onDesvincularPersona?.(user.id)}
                  disabled={isLinkingPersona}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs font-black uppercase rounded-xl border border-red-200 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isLinkingPersona ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2Off className="w-4 h-4" />
                  )}
                  Desvincular Persona
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                  <UserX className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="text-sm font-black text-amber-700 uppercase tracking-wide">
                      Usuario sin vincular al Padrón
                    </p>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">
                      Este usuario no posee un registro asociado en el padrón de
                      personas.
                    </p>
                  </div>
                </div>

                {/* Indicador de búsqueda automática de candidatos */}
                {isSearchingCandidatos && (
                  <div className="flex items-center gap-2 text-xs font-black text-secondary-500 uppercase tracking-widest">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                    Buscando candidatos en el padrón...
                  </div>
                )}

                {/* Resultados de búsqueda */}
                {hasSearched &&
                  !isSearchingCandidatos &&
                  (candidatos.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-black text-secondary-500 uppercase tracking-widest">
                        {candidatos.length} candidato(s) encontrado(s) con DNI y
                        Email coincidentes:
                      </p>
                      {candidatos.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-secondary-900">
                              {c.nombre_completo}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {c.documento_tipo}: {c.documento_numero} •{" "}
                              {c.email}
                            </p>
                            {c.relaciones?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {c.relaciones.map((r, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded border border-indigo-100"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => onVincularPersona?.(user.id, c.id)}
                            disabled={isLinkingPersona}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 shrink-0"
                          >
                            {isLinkingPersona ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5" />
                            )}
                            Vincular
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl text-center">
                      <p className="text-sm font-bold text-secondary-500">
                        No se encontraron personas candidatas en el padrón con
                        DNI y Email coincidentes.
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-secondary-100 bg-secondary-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-3 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;
