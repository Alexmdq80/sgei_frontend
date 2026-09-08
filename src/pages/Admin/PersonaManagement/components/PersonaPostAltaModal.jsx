import { X, Phone, Home, CheckCircle2 } from "lucide-react";

/**
 * Diálogo de "Siguientes Pasos" posterior al alta de una persona.
 * Permite cargar datos de contacto y/o domicilio del registro recién creado,
 * o finalizar y volver al padrón.
 */
export default function PersonaPostAltaModal({
  isOpen,
  persona,
  onCargarContacto,
  onCargarDomicilio,
  onClose,
}) {
  if (!isOpen || !persona) return null;

  const iniciales =
    `${persona.apellido?.charAt(0) || ""}${persona.nombre?.charAt(0) || ""}`
      .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Persona registrada con éxito"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-secondary-100 overflow-hidden animate-scaleIn flex flex-col">
        {/* Cabecera con badge de éxito */}
        <div className="relative bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 px-8 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white border-2 border-white/40 shadow-lg">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                ¡Persona registrada con éxito!
              </h2>
              <p className="text-white/80 text-sm font-medium">
                Alta en el Padrón
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-8 py-6 space-y-4">
          <div className="flex items-center gap-4">
            {persona.foto_url ? (
              <img
                src={persona.foto_url}
                crossOrigin="use-credentials"
                alt="Foto de perfil"
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-xl border-4 border-white shadow-lg">
                {iniciales || "?"}
              </div>
            )}
            <div>
              <p className="text-base font-black text-secondary-900 uppercase">
                {persona.apellido}, {persona.nombre}
              </p>
              <p className="text-sm font-bold text-secondary-600">
                DNI {persona.documento_numero || "—"}
              </p>
            </div>
          </div>

          <p className="text-sm text-secondary-600 font-medium italic">
            ¿Deseas completar información adicional ahora?
          </p>
        </div>

        {/* Acciones */}
        <div className="px-8 py-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onCargarContacto}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-md text-xs"
            >
              <Phone className="w-4 h-4" /> Cargar Datos de Contacto
            </button>
            <button
              type="button"
              onClick={onCargarDomicilio}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black uppercase tracking-widest bg-sky-600 text-white hover:bg-sky-700 transition-all active:scale-[0.98] shadow-md text-xs"
            >
              <Home className="w-4 h-4" /> Cargar Domicilio
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all active:scale-[0.98]"
          >
            Finalizar e ir al Padrón
          </button>
        </div>
      </div>
    </div>
  );
}
