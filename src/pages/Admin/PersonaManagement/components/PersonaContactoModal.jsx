import { useState, useEffect } from "react";
import { X, Phone, Save, SkipForward, AlertTriangle } from "lucide-react";
import personaService from "../../../../services/personaService";

export default function PersonaContactoModal({
  personaId,
  isOpen,
  onClose,
  onOmit,
  onSaved,
  isEmailLocked,
}) {
  const [contacto, setContacto] = useState({
    telefono_codigo_area: "",
    telefono: "",
    celular_codigo_area: "",
    celular: "",
    email: "",
    observaciones: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const soloNumeros = (valor) => valor.replace(/\D/g, "");

  // Precarga los datos actuales al abrir el modal
  useEffect(() => {
    if (!isOpen || !personaId) return;
    let active = true;
    setLoading(true);
    personaService
      .getDomicilioContacto(personaId)
      .then((r) => {
        const c = r?.data?.contacto || r?.contacto || {};
        if (active)
          setContacto((prev) => ({
            ...prev,
            email: c.email ?? prev.email ?? "",
            observaciones: c.observaciones ?? prev.observaciones ?? "",
            telefono_codigo_area: c.telefono_codigo_area ?? prev.telefono_codigo_area ?? "",
            telefono: c.telefono ?? prev.telefono ?? "",
            celular_codigo_area: c.celular_codigo_area ?? prev.celular_codigo_area ?? "",
            celular: c.celular ?? prev.celular ?? "",
          }));
      })
      .catch(() => { })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, personaId]);

  const setCampo = (key) => (e) => {
    const valor = e.target.value;
    const esNumerico = [
      "telefono_codigo_area",
      "telefono",
      "celular_codigo_area",
      "celular",
    ].includes(key);
    setContacto((p) => ({ ...p, [key]: esNumerico ? soloNumeros(valor) : valor }));
  };

  const handleSave = async () => {
    if (!personaId) return;
    setSaving(true);
    try {
      await personaService.saveDomicilioContacto(personaId, { ...contacto });
      onSaved();
    } catch {
      // mostrá acá tu alerta de error si el proyecto usa una
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !personaId) return null;

  const inputCls =
    "w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none";
  const labelCls =
    "text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-scaleIn flex flex-col border border-secondary-100 max-h-[90vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 px-8 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Contacto</h2>
              <p className="text-white/80 text-sm font-medium">
                Completá los canales de comunicación de la persona
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6">
          {loading && (
            <p className="text-sm text-secondary-500">Cargando datos actuales…</p>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className={labelCls}>Email de Contacto</label>
            {isEmailLocked && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Esta persona tiene un usuario vinculado; el email no puede editarse aquí.
              </div>
            )}
            <input
              type="email"
              disabled={isEmailLocked}
              value={contacto.email}
              onChange={setCampo("email")}
              placeholder="persona@mail.com"
              className={isEmailLocked
                ? "w-full px-4 py-2.5 rounded-xl text-sm font-bold text-secondary-400 cursor-not-allowed bg-secondary-100 border border-secondary-200"
                : inputCls}
            />
          </div>

          {/* Teléfono Fijo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Cód. Área Teléfono</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="011"
                value={contacto.telefono_codigo_area}
                onChange={setCampo("telefono_codigo_area")}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Teléfono Fijo</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={20}
                placeholder="4812-3456"
                value={contacto.telefono}
                onChange={setCampo("telefono")}
                className={inputCls}
              />
            </div>
          </div>

          {/* Celular */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Cód. Área Celular</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="011"
                value={contacto.celular_codigo_area}
                onChange={setCampo("celular_codigo_area")}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Celular</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={20}
                placeholder="15-1234-5678"
                value={contacto.celular}
                onChange={setCampo("celular")}
                className={inputCls}
              />
            </div>
          </div>
          {/* Observaciones de Contacto */}
          <div className="space-y-1">
            <label className={labelCls}>
              Observaciones de Contacto (Opcional)
            </label>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="Ej: Llamar por la tarde, número de la abuela, canal de emergencia"
              className="w-full px-4 py-2 bg-white border border-secondary-300 rounded-xl text-xs font-medium text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
              value={contacto.observaciones || ""}
              onChange={setCampo("observaciones")}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-secondary-100 bg-white flex items-center gap-3 mt-auto shrink-0">
          <button
            type="button"
            onClick={onOmit}
            className="px-5 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <SkipForward className="w-4 h-4" /> Omitir por ahora
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg"
          >
            <Save className="w-4 h-4" /> Guardar Contacto
          </button>
        </div>
      </div>
    </div>
  );
}
