import { useState, useEffect } from "react";
import { X, Home, Save, SkipForward } from "lucide-react";
import personaService from "../../../../services/personaService";
import useGeografiaCascade from "../hooks/useGeografiaCascade";

export default function PersonaDomicilioModal({
  personaId,
  isOpen,
  onClose,
  onOmit,
  onSaved,
}) {
  const [domicilio, setDomicilio] = useState({
    provincia_id: "",
    departamento_id: "",
    localidad_id: "",
    calle_id: "",
    calle_entre_1_id: "",
    calle_entre_2_id: "",
    numero: "",
    piso: "",
    departamento: "",
    torre: "",
    codigo_postal: "",
    otros: "", // sigue para "observaciones" libres si querés
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado de calles
  const [calles, setCalles] = useState([]); // calle principal
  const [callesEntre1, setCallesEntre1] = useState([]);
  const [callesEntre2, setCallesEntre2] = useState([]);
  const [q, setQ] = useState(""); // calle principal
  const [qEntre1, setQEntre1] = useState(""); // entrecalle 1
  const [qEntre2, setQEntre2] = useState(""); // entrecalle 2

  const {
    provincias,
    departamentos,
    localidades,
    handleProvinciaChange,
    handleDepartamentoChange,
  } = useGeografiaCascade();

  // Sanea campos numéricos (solo dígitos)
  const soloNumeros = (valor) => valor.replace(/\D/g, "");

  const setDomicilioField = (key) => (e) => {
    const raw = e.target.value;
    const esNumerico = ["numero", "piso", "torre", "codigo_postal"].includes(
      key,
    );
    setDomicilio((p) => ({ ...p, [key]: esNumerico ? soloNumeros(raw) : raw }));
  };

  // Autocompletado de calles (busca por localidad + texto)
  useEffect(() => {
    if (!domicilio.localidad_id || !q) {
      setCalles([]);
      return;
    }
    let active = true;
    personaService
      .searchCalles({ localidad_id: domicilio.localidad_id, q })
      .then((r) => {
        if (active) setCalles(r?.data?.data || r?.data || r || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [domicilio.localidad_id, q]);

  useEffect(() => {
    if (!domicilio.localidad_id || !qEntre1) {
      setCallesEntre1([]);
      return;
    }
    let active = true;
    personaService
      .searchCalles({ localidad_id: domicilio.localidad_id, q: qEntre1 })
      .then((r) => {
        if (active) setCallesEntre1(r?.data?.data || r?.data || r || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [domicilio.localidad_id, qEntre1]);

  useEffect(() => {
    if (!domicilio.localidad_id || !qEntre2) {
      setCallesEntre2([]);
      return;
    }
    let active = true;
    personaService
      .searchCalles({ localidad_id: domicilio.localidad_id, q: qEntre2 })
      .then((r) => {
        if (active) setCallesEntre2(r?.data?.data || r?.data || r || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [domicilio.localidad_id, qEntre2]);

  // Precarga los datos actuales del domicilio al abrir el modal
  useEffect(() => {
    if (!isOpen || !personaId) return;
    let active = true;
    setLoading(true);
    personaService
      .getDomicilio(personaId)
      .then((r) => {
        // DomicilioResource: el payload viene directo en r.data (o null si no hay).
        // Nota: el backend NO expone provincia_id/departamento_id; solo localidad_id.
        const d = r?.data || r || {};
        if (!active) return;
        setDomicilio((prev) => ({
          ...prev,
          localidad_id: d.localidad_id ?? prev.localidad_id ?? "",
          calle_id: d.calle_id ?? prev.calle_id ?? "",
          calle_entre_1_id: d.calle_entre_1_id ?? prev.calle_entre_1_id ?? "",
          calle_entre_2_id: d.calle_entre_2_id ?? prev.calle_entre_2_id ?? "",
          numero: d.numero ?? prev.numero ?? "",
          piso: d.piso ?? prev.piso ?? "",
          departamento: d.departamento ?? prev.departamento ?? "",
          torre: d.torre ?? prev.torre ?? "",
          codigo_postal: d.codigo_postal ?? prev.codigo_postal ?? "",
          otros: d.otros ?? prev.otros ?? "",
        }));
        // Si hay localidad, precompletá el texto de búsqueda de la calle principal
        if (d.calle_nombre) setQ(d.calle_nombre);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, personaId]);

  function CalleCombo({
    label,
    q,
    onQChange,
    calles,
    onSelect,
    disabled,
    placeholder,
  }) {
    const labelCls =
      "text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block";
    const inputCls =
      "w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none";

    return (
      <div>
        <label className={labelCls}>{label}</label>
        <input
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          className={inputCls}
        />
        {calles.length > 0 && (
          <ul className="mt-1 bg-white border border-secondary-200 rounded-xl max-h-40 overflow-y-auto">
            {calles.map((c) => (
              <li
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-secondary-50"
              >
                {c.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!isOpen || !personaId) return null;

  const handleSave = async () => {
    if (!personaId) return;
    setSaving(true);
    try {
      // Se envía el payload del domicilio. El backend solo lee las claves
      // válidas de PersonaDomicilioRequest; las extra aquí son inofensivas.
      await personaService.saveDomicilio(personaId, { ...domicilio });
      onSaved();
    } catch {
      // mostrá acá tu alerta de error si el proyecto usa una
    } finally {
      setSaving(false);
    }
  };

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
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-scaleIn flex flex-col border border-secondary-100 max-h-[90vh]">
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
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Domicilio</h2>
              <p className="text-white/80 text-sm font-medium">
                Completá la ubicación y el domicilio de la persona
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6">
          {/* Sección 1: Domicilio */}
          <section>
            <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
              <Home className="w-4 h-4" /> Domicilio
            </h3>
            {loading && (
              <p className="text-sm text-secondary-500">
                Cargando datos actuales…
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Provincia */}
              <div>
                <label className={labelCls}>Provincia</label>
                <select
                  value={domicilio.provincia_id}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDomicilio((p) => ({
                      ...p,
                      provincia_id: v,
                      departamento_id: "",
                      localidad_id: "",
                      calle_id: "",
                    }));
                    handleProvinciaChange(v);
                  }}
                  className={inputCls}
                >
                  <option value="">Seleccionar...</option>
                  {provincias.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {/* Departamento */}
              <div>
                <label className={labelCls}>Departamento</label>
                <select
                  value={domicilio.departamento_id}
                  disabled={!domicilio.provincia_id}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDomicilio((p) => ({
                      ...p,
                      departamento_id: v,
                      localidad_id: "",
                      calle_id: "",
                    }));
                    handleDepartamentoChange(v);
                  }}
                  className={inputCls}
                >
                  <option value="">Seleccionar...</option>
                  {departamentos.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {/* Localidad */}
              <div>
                <label className={labelCls}>Localidad</label>
                <select
                  value={domicilio.localidad_id}
                  disabled={!domicilio.departamento_id}
                  onChange={(e) =>
                    setDomicilio((p) => ({
                      ...p,
                      localidad_id: e.target.value,
                      calle_id: "",
                    }))
                  }
                  className={inputCls}
                >
                  <option value="">Seleccionar...</option>
                  {localidades.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {/* Calle principal */}
              <CalleCombo
                label="Calle principal"
                q={q}
                onQChange={setQ}
                calles={calles}
                disabled={!domicilio.localidad_id}
                placeholder="Ej: Av. Rivadavia"
                onSelect={(id) => setDomicilio((p) => ({ ...p, calle_id: id }))}
              />
              {/* Entrecalle 1 */}
              <CalleCombo
                label="Entrecalle 1"
                q={qEntre1}
                onQChange={setQEntre1}
                calles={callesEntre1}
                disabled={!domicilio.localidad_id}
                placeholder="Ej: Entre calle..."
                onSelect={(id) =>
                  setDomicilio((p) => ({ ...p, calle_entre_1_id: id }))
                }
              />
              {/* Entrecalle 2 */}
              <CalleCombo
                label="Entrecalle 2"
                q={qEntre2}
                onQChange={setQEntre2}
                calles={callesEntre2}
                disabled={!domicilio.localidad_id}
                placeholder="Ej: Entre calle..."
                onSelect={(id) =>
                  setDomicilio((p) => ({ ...p, calle_entre_2_id: id }))
                }
              />

              {/* Número */}
              <div>
                <label className={labelCls}>Número</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  value={domicilio.numero}
                  onChange={setDomicilioField("numero")}
                  className={inputCls}
                />
              </div>
              {/* Piso */}
              <div>
                <label className={labelCls}>Piso</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={domicilio.piso}
                  onChange={setDomicilioField("piso")}
                  className={inputCls}
                />
              </div>
              {/* Departamento (unidad) */}
              <div>
                <label className={labelCls}>Departamento (unidad)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={domicilio.departamento}
                  onChange={setDomicilioField("departamento")}
                  className={inputCls}
                />
              </div>
              {/* Torre */}
              <div>
                <label className={labelCls}>Torre</label>
                <input
                  type="text"
                  maxLength={10}
                  value={domicilio.torre}
                  onChange={setDomicilioField("torre")}
                  className={inputCls}
                />
              </div>
              {/* Código Postal */}
              <div>
                <label className={labelCls}>Código Postal</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={domicilio.codigo_postal}
                  onChange={setDomicilioField("codigo_postal")}
                  className={inputCls}
                />
              </div>
            </div>
          </section>
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
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg"
          >
            <Save className="w-4 h-4" /> Guardar Domicilio
          </button>
        </div>
      </div>
    </div>
  );
}
