import { X, User, ShieldCheck, Mail, Loader2 } from "lucide-react";

/**
 * Modal de detalle de una persona.
 */
export default function PersonaDetailModal({
  persona,
  isLinkingUser,
  onClose,
  onResendActivation,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de la persona"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
          <div>
            <h2 className="text-xl font-black text-secondary-900 uppercase">
              Detalle de la Persona
            </h2>
            <p className="text-xs text-secondary-500 font-bold tracking-widest mt-0.5 uppercase">
              Identificador de Padrón: {persona.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none"
            aria-label="Cerrar"
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
              {persona.foto_url && (
                <div className="flex -mt-2">
                  <img
                    src={persona.foto_url}
                    crossOrigin="use-credentials"
                    alt="Foto de perfil"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                    Apellido y Nombre
                  </p>
                  <p className="text-lg font-black text-secondary-900 uppercase">
                    {persona.nombre_completo}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                    Documento
                  </p>
                  <p className="text-sm font-bold text-secondary-900 uppercase">
                    {persona.documento_tipo_nombre}: {persona.documento_numero}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-secondary-100 pb-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest">
                  Seguridad y Vinculación
                </h3>
              </div>
              <div className="p-6 bg-green-50/50 border border-green-100 rounded-2xl">
                {persona.usuario_email ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                        Cuenta de Usuario Vinculada
                      </p>
                      <p className="text-sm font-black text-secondary-900 mt-1">
                        {persona.usuario_email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!persona.usuario?.email_verified_at && (
                        <button
                          onClick={() => onResendActivation(persona.id)}
                          disabled={isLinkingUser === persona.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors"
                          title="Reenviar correo de activación"
                        >
                          {isLinkingUser === persona.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          Reenviar Invitación
                        </button>
                      )}
                      <span
                        className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${persona.usuario?.email_verified_at ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                      >
                        {persona.usuario?.email_verified_at
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
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-lg"
              >
                Cerrar Vista
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
