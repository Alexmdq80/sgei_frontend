import { X, Link2Off, AlertTriangle } from "lucide-react";

/**
 * Modal de confirmación destructiva cuando se intenta cambiar el email
 * de una Persona que tiene un Usuario vinculado.
 */
export default function ConfirmUnlinkUserModal({
  isOpen,
  onConfirm,
  onCancel,
  context,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-red-100">
        <div className="p-8">
          {/* Icono y Título */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-50 text-red-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-secondary-900 leading-tight">
              ¿Confirmar desvinculación?
            </h2>
          </div>

          {/* Detalle de la acción */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 space-y-2">
            <p className="text-sm font-bold text-secondary-800 leading-relaxed">
              El usuario con email{" "}
              <span className="text-red-600 font-black break-all">
                {context?.usuario_email || "desconocido"}
              </span>{" "}
              será desvinculado y perderá todos sus roles.
            </p>
            {context?.nuevo_email && (
              <p className="text-xs font-bold text-secondary-500 break-all">
                Nuevo email de contacto:{" "}
                <span className="text-primary-600 font-black">
                  {context.nuevo_email}
                </span>
              </p>
            )}
            <p className="text-xs font-medium text-secondary-400 italic">
              Esta acción revocará los roles e institucionales del usuario afectado.
            </p>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-secondary-100 text-secondary-600 rounded-2xl font-bold hover:bg-secondary-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-[2] px-6 py-3 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Link2Off className="w-5 h-5" />
              Sí, confirmar desvinculación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
