import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  X,
  Home,
  Save,
  SkipForward,
  MapPin,
  Building2,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eraser,
  AlertTriangle,
} from "lucide-react";
import personaService from "../../../../services/personaService";
import geografiaService from "../../../../services/geografiaService";
import SearchableSelect from "../../../../components/SearchableSelect";
import useGeografiaCascade from "../hooks/useGeografiaCascade";
import { esNacionArgentina } from "../utils/nacionUtils";

export default function PersonaDomicilioModal({
  persona,
  personaId,
  isOpen,
  nacions = [],
  onClose,
  onOmit,
  onSaved,
}) {
  const [step, setStep] = useState(1);
  const [domicilioDesconocido, setDomicilioDesconocido] = useState(false);
  const [noGeo, setNoGeo] = useState({
    provincia: false,
    departamento: false,
    localidad: false,
  });
  const [paisTipo, setPaisTipo] = useState("argentina"); // "argentina" | "extranjero"
  const [modoUbicacion, setModoUbicacion] = useState("omnibox"); // "omnibox" | "cascada" (fallback clásico)
  const [qLocalidad, setQLocalidad] = useState("");
  const [localidadesSearch, setLocalidadesSearch] = useState([]);
  const [buscandoLocalidades, setBuscandoLocalidades] = useState(false);
  const [ubicacionSeleccion, setUbicacionSeleccion] = useState({
    provincia: "",
    departamento: "",
    localidad: "",
  });
  const nomPorId = (lista, id) =>
    (lista.find((i) => String(i.id) === String(id))?.nombre || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const nacionArgentina = nacions.find(
    (n) => String(n.nombre).trim().toUpperCase() === "ARGENTINA",
  );
  const nacionsSinArgentina = nacions.filter(
    (n) => !esNacionArgentina([n], n.id),
  );
  const [domicilio, setDomicilio] = useState({
    nacion_id: "",
    provincia_id: "",
    departamento_id: "",
    localidad_id: "",
    calle_id: "",
    calle_entre_1_id: "",
    calle_entre_2_id: "",
    numero: "",
    piso: "",
    unidad: "",
    torre: "",
    codigo_postal: "",
    observaciones: "",
  });

  // Texto visible de los autocompletados de calles
  const [q, setQ] = useState("");
  const [qEntre1, setQEntre1] = useState("");
  const [qEntre2, setQEntre2] = useState("");
  const [calles, setCalles] = useState([]);
  const [callesEntre1, setCallesEntre1] = useState([]);
  const [callesEntre2, setCallesEntre2] = useState([]);

  const {
    provincias,
    departamentos,
    localidades,
    handleNacionChange,
    handleProvinciaChange,
    handleDepartamentoChange,
    clearGeoArgentina,
    loadDepartamentos,
    loadLocalidades,
  } = useGeografiaCascade();

  const ETAPAS = [
    { n: 1, label: "Ubicación", Icon: MapPin },
    { n: 2, label: "Calles y Vivienda", Icon: Building2 },
    { n: 3, label: "Resumen y Observaciones", Icon: ClipboardCheck },
  ];

  const esArgentina = esNacionArgentina(nacions, domicilio.nacion_id);
  const esExtranjero = Boolean(domicilio.nacion_id) && !esArgentina;
  // Argentina con geografía incompleta: hay país, pero no localidad ⇒ sin calles ni vivienda
  const esGeoParcial = esArgentina && !domicilio.localidad_id;

  const inputCls =
    "w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none";
  const labelCls =
    "text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block";

  const soloNumeros = (valor) => valor.replace(/\D/g, "");

  const setDomicilioField = (key) => (e) => {
    const raw = e.target.value;
    const esNumerico = ["numero", "piso", "torre", "codigo_postal"].includes(
      key,
    );
    setDomicilio((p) => ({ ...p, [key]: esNumerico ? soloNumeros(raw) : raw }));
  };
  const onNacionChange = (value) => {
    const esAR = esNacionArgentina(nacions, value);
    if (value) setPaisTipo(esAR ? "argentina" : "extranjero"); // no pisar el chip si vino ""
    // Limpiar TODO: geografía + calles + vivienda (evita datos "sucios")
    setDomicilio((p) => ({
      ...p,
      nacion_id: value,
      provincia_id: "",
      departamento_id: "",
      localidad_id: "",
      calle_id: "",
      calle_entre_1_id: "",
      calle_entre_2_id: "",
      numero: "",
      piso: "",
      unidad: "",
      torre: "",
      codigo_postal: "",
    }));
    setQ("");
    setQEntre1("");
    setQEntre2("");
    setCalles([]);
    setCallesEntre1([]);
    setCallesEntre2([]);

    setDomicilioDesconocido(false);

    if (!value) {
      // Sin país: quedamos en el Paso 1
      setStep(1);
      clearGeoArgentina();
      return;
    }
    if (!esAR) {
      // País extranjero: paso a blanco y salta directo al resumen/observaciones
      setStep(3);
      clearGeoArgentina();
      return;
    }
    // Argentina: volvemos al Paso 1 para completar la cascada
    setStep(1);
    handleNacionChange(value);
  };

  const onPaisTipoChange = (tipo) => {
    // (a) Guard anti-borrado: re-clickar el chip ya activo no hace nada
    if (tipo === paisTipo) return;

    // (b/c) Cambio de chip: actualizo el estado visual y el aviso de desconocido
    setPaisTipo(tipo);
    setDomicilioDesconocido(false);
    setUbicacionSeleccion({ provincia: "", departamento: "", localidad: "" });

    // (c) Chip Argentina: setear la nación ARGENTINA de una sola vez
    if (tipo === "argentina") {
      onNacionChange(nacionArgentina?.id || "");
    } else {
      // (b) Chip Extranjero: dejar sin país para elegir del SearchableSelect
      onNacionChange("");
    }
  };


  const onProvinciaChange = (value) => {
    setDomicilio((p) => ({
      ...p,
      provincia_id: value,
      departamento_id: "",
      localidad_id: "",
    }));
    handleProvinciaChange(value);
  };

  const onDepartamentoChange = (value) => {
    setDomicilio((p) => ({ ...p, departamento_id: value, localidad_id: "" }));
    handleDepartamentoChange(value);
  };

  // Clave: cambiar la localidad resetea calles y entrecalles
  const onLocalidadChange = (value) => {
    setDomicilio((p) => ({
      ...p,
      localidad_id: value,
      calle_id: "",
      calle_entre_1_id: "",
      calle_entre_2_id: "",
    }));
    setQ("");
    setQEntre1("");
    setQEntre2("");
    setCalles([]);
    setCallesEntre1([]);
    setCallesEntre2([]);
    setUbicacionSeleccion({
      provincia: nomPorId(provincias, domicilio.provincia_id),
      departamento: nomPorId(departamentos, value),
      localidad: nomPorId(localidades, value),
    });
  };

  // Omnibox de localidades: debounce de 250ms y mínimo 2 caracteres
  useEffect(() => {
    const term = (qLocalidad || "").trim();
    if (
      paisTipo !== "argentina" ||
      !esArgentina ||
      domicilioDesconocido ||
      modoUbicacion !== "omnibox" ||
      term.length < 2
    ) {
      setLocalidadesSearch([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setBuscandoLocalidades(true);
      geografiaService
        .searchLocalidades(term, 15)
        .then((r) => {
          if (active)
            setLocalidadesSearch(Array.isArray(r) ? r : r?.data || []);
        })
        .catch(() => {
          if (active) setLocalidadesSearch([]);
        })
        .finally(() => {
          if (active) setBuscandoLocalidades(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    paisTipo,
    esArgentina,
    domicilioDesconocido,
    modoUbicacion,
    qLocalidad,
  ]);

  // Selección desde el omnibox: autocompleta toda la jerarquía de una sola vez
  const onSelectOmnibox = (item) => {
    const depto = item.departamento;
    const prov = depto?.provincia;
    setDomicilio((p) => ({
      ...p,
      nacion_id: nacionArgentina?.id || p.nacion_id,
      provincia_id: prov?.id ?? "",
      departamento_id: depto?.id ?? item.departamento_id ?? "",
      localidad_id: item.id,
      calle_id: "",
      calle_entre_1_id: "",
      calle_entre_2_id: "",
    }));
    setUbicacionSeleccion({
      provincia: prov?.nombre ?? "",
      departamento: depto?.nombre ?? "",
      localidad: item.nombre ?? "",
    });
    setQLocalidad(item.nombre);
    setLocalidadesSearch([]);
    setQ("");
    setQEntre1("");
    setQEntre2("");
    setCalles([]);
    setCallesEntre1([]);
    setCallesEntre2([]);
    setNoGeo({ provincia: false, departamento: false, localidad: false });
    // Mantener la cascada coherente si el usuario alterna al modo clásico
    if (prov?.id) loadDepartamentos(prov.id);
    if (depto?.id) loadLocalidades(depto.id);
    setModoUbicacion("omnibox");
  };

  // Domicilio nuevo sin país: preseleccionar Argentina por defecto
  useEffect(() => {
    if (!nacionArgentina || domicilio.nacion_id || paisTipo !== "argentina")
      return;
    onNacionChange(nacionArgentina.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nacionArgentina?.id, domicilio.nacion_id, paisTipo]);

  useEffect(() => {
    if (!isOpen || !personaId) return;
    let active = true;
    setLoading(true);
    setStep(1);
    setDomicilioDesconocido(false);

    personaService
      .getDomicilio(personaId)
      .then((r) => {
        const d = r?.data || r || null;
        if (!active || !d) return;

        // Domicilio desconocido => sin país, sin geo y con observación cargada
        const esDesconocido =
          !d.nacion_id &&
          !d.localidad_id &&
          !d.calle_id &&
          Boolean(d.observaciones);
        setDomicilioDesconocido(esDesconocido);
        setStep(esDesconocido ? 3 : 1);

        setDomicilio({
          nacion_id: d.nacion_id ?? "",
          provincia_id: d.provincia_id ?? "",
          departamento_id: d.departamento_id ?? "",
          localidad_id: d.localidad_id ?? "",
          calle_id: d.calle_id ?? "",
          calle_entre_1_id: d.calle_entre_1_id ?? "",
          calle_entre_2_id: d.calle_entre_2_id ?? "",
          numero: d.numero ?? "",
          piso: d.piso ?? "",
          unidad: d.unidad ?? "",
          torre: d.torre ?? "",
          codigo_postal: d.codigo_postal ?? "",
          observaciones: d.observaciones ?? "",
        });
        setQ(d.calle_nombre ?? "");
        setQEntre1(d.calle_entre_1_nombre ?? "");
        setQEntre2(d.calle_entre_2_nombre ?? "");
        // Un valor null persistido ⇒ el nivel se marca como "no dispongo"
        setNoGeo({
          provincia: !d.provincia_id,
          departamento: !d.departamento_id,
          localidad: !d.localidad_id,
        });
        // Sincronizar el segmented de país con el domicilio persistido
        if (nacions.length > 0 && d.nacion_id) {
          setPaisTipo(
            esNacionArgentina(nacions, d.nacion_id) ? "argentina" : "extranjero",
          );
        }
        // En edición, reconstruimos la cascada: arrancar en modo clásico
        setModoUbicacion("cascada");
        // Reconstruir la cascada geográfica para los selects
        if (d.nacion_id) handleNacionChange(d.nacion_id);
        if (d.provincia_id) handleProvinciaChange(d.provincia_id);
        if (d.departamento_id) handleDepartamentoChange(d.departamento_id);
      })
      .catch(() => { })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // Los handlers del hook geográfico son estables (useCallback) pero dependen de
    // `nacions`: incluirlos re-dispararía la carga del domicilio al terminar de
    // cargar los países, pisando lo que el usuario ya haya ingresado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, personaId]);
  useEffect(() => {
    const term = q.trim();
    if (!domicilio.localidad_id || term.length < 3) {
      setCalles([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      personaService
        .searchCalles({ localidad_id: domicilio.localidad_id, q: term })
        .then((r) => {
          if (active) setCalles(r?.data?.data || r?.data || r || []);
        })
        .catch(() => {
          if (active) setCalles([]);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [domicilio.localidad_id, q]);

  useEffect(() => {
    const term = qEntre1.trim();
    if (!domicilio.localidad_id || term.length < 3) {
      setCallesEntre1([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      personaService
        .searchCalles({ localidad_id: domicilio.localidad_id, q: term })
        .then((r) => {
          if (active) setCallesEntre1(r?.data?.data || r?.data || r || []);
        })
        .catch(() => {
          if (active) setCallesEntre1([]);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [domicilio.localidad_id, qEntre1]);

  useEffect(() => {
    const term = qEntre2.trim();
    if (!domicilio.localidad_id || term.length < 3) {
      setCallesEntre2([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      personaService
        .searchCalles({ localidad_id: domicilio.localidad_id, q: term })
        .then((r) => {
          if (active) setCallesEntre2(r?.data?.data || r?.data || r || []);
        })
        .catch(() => {
          if (active) setCallesEntre2([]);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [domicilio.localidad_id, qEntre2]);
  function CalleCombo({
    label,
    q,
    onQChange,
    calles,
    onSelect,
    disabled,
    placeholder,
  }) {
    const cLabelCls =
      "text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block";
    const cInputCls =
      "w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none";

    return (
      <div>
        <label className={cLabelCls}>{label}</label>
        <input
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          className={cInputCls}
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

  const goNext = () => {
    if (step === 1) {
      if (!domicilio.nacion_id) return; // país obligatorio
      // Sin localidad no hay Paso 2 (solo país / solo provincia / desconocido / extranjero)
      if (domicilioDesconocido || esExtranjero || !domicilio.localidad_id) {
        setStep(3);
        return;
      }
      setStep(2);
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const goPrev = () => {
    // Desde el Paso 3 sin localidad se vuelve al Paso 1 (evita el Paso 2)
    if (
      step === 3 &&
      (domicilioDesconocido || esExtranjero || !domicilio.localidad_id)
    ) {
      setStep(1);
      return;
    }
    setStep((s) => Math.max(s - 1, 1));
  };

  const clearForm = () => {
    setStep(1);
    setDomicilioDesconocido(false);
    setDomicilio({
      nacion_id: "",
      provincia_id: "",
      departamento_id: "",
      localidad_id: "",
      calle_id: "",
      calle_entre_1_id: "",
      calle_entre_2_id: "",
      numero: "",
      piso: "",
      unidad: "",
      torre: "",
      codigo_postal: "",
      observaciones: "",
    });
    setPaisTipo("argentina");
    setModoUbicacion("omnibox");
    setQLocalidad("");
    setLocalidadesSearch([]);
    setUbicacionSeleccion({ provincia: "", departamento: "", localidad: "" });
    setQ("");
    setQEntre1("");
    setQEntre2("");
    setCalles([]);
    setCallesEntre1([]);
    setCallesEntre2([]);
    setNoGeo({ provincia: false, departamento: false, localidad: false });
    clearGeoArgentina();
  };

  const handleSave = async () => {
    if (!personaId) return;
    setSaving(true);
    try {
      if (domicilioDesconocido) {
        await personaService.saveDomicilio(personaId, {
          blanquear: true,
          observaciones: domicilio.observaciones || "",
        });
      } else {
        await personaService.saveDomicilio(personaId, {
          nacion_id: domicilio.nacion_id || null,
          provincia_id: domicilio.provincia_id || null,
          departamento_id: domicilio.departamento_id || null,
          localidad_id: domicilio.localidad_id || null,
          calle_id: domicilio.calle_id || null,
          calle_entre_1_id: domicilio.calle_entre_1_id || null,
          calle_entre_2_id: domicilio.calle_entre_2_id || null,
          numero: domicilio.numero || null,
          piso: domicilio.piso || null,
          unidad: domicilio.unidad || null,
          torre: domicilio.torre || null,
          codigo_postal: domicilio.codigo_postal || null,
          observaciones: domicilio.observaciones || "",
        });
      }
      onSaved();
    } catch {
      // mostrar acá tu alerta de error si el proyecto la usa
    } finally {
      setSaving(false);
    }
  };

  const ResumenItem = ({ label, valor }) => (
    <div className="flex justify-between gap-4">
      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest pt-0.5">
        {label}
      </p>
      <p className="text-sm font-bold text-secondary-900 text-right">
        {valor || "—"}
      </p>
    </div>
  );

  const personaNombre = persona?.apellido || persona?.nombre
    ? `${persona.apellido ?? ""}, ${persona.nombre ?? ""}`.replace(/^,\s*|,\s*$/, "").trim()
    : null;

  const BreadcrumbUbicacion = () => {
    if (domicilioDesconocido) {
      return (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-700">
          ⚠️ Ubicación: [ Domicilio Desconocido / Sin Acreditar ]
        </div>
      );
    }
    if (esExtranjero) {
      const nombrePais = nacions.find(
        (n) => String(n.id) === String(domicilio.nacion_id),
      )?.nombre;
      return (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-700">
          🌐 Ubicación: [ {nombrePais || "País extranjero"} ]
        </div>
      );
    }
    if (esArgentina) {
      return (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-xs font-black text-primary-700">
          📍 Ubicación:
          <span className="rounded-full border border-primary-200 bg-white px-2.5 py-0.5">
            🇦🇷 Argentina
          </span>
          {ubicacionSeleccion.provincia && (
            <>
              <span>›</span>
              <span className="rounded-full border border-primary-200 bg-white px-2.5 py-0.5">
                {ubicacionSeleccion.provincia}
              </span>
            </>
          )}
          {ubicacionSeleccion.departamento && (
            <>
              <span>›</span>
              <span className="rounded-full border border-primary-200 bg-white px-2.5 py-0.5">
                {ubicacionSeleccion.departamento}
              </span>
            </>
          )}
          {ubicacionSeleccion.localidad && (
            <>
              <span>›</span>
              <span className="rounded-full border border-primary-200 bg-white px-2.5 py-0.5">
                {ubicacionSeleccion.localidad}
              </span>
            </>
          )}
          {(domicilio.localidad_id || ubicacionSeleccion.localidad) && (
            <button
              type="button"
              onClick={() => {
                setUbicacionSeleccion({ provincia: "", departamento: "", localidad: "" });
                setQLocalidad("");
                setLocalidadesSearch([]);
                setModoUbicacion("omnibox");
                setDomicilio((p) => ({
                  ...p,
                  provincia_id: "",
                  departamento_id: "",
                  localidad_id: "",
                  calle_id: "",
                  calle_entre_1_id: "",
                  calle_entre_2_id: "",
                  numero: "",
                  piso: "",
                  unidad: "",
                  torre: "",
                  codigo_postal: "",
                }));
                setQ("");
                setQEntre1("");
                setQEntre2("");
                setCalles([]);
                setCallesEntre1([]);
                setCallesEntre2([]);
                setStep(1);
              }}
              className="ml-2 text-[10px] font-black underline hover:text-primary-900"
            >
              Cambiar
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="h-[85vh] max-h-[760px] min-h-[580px] w-full max-w-4xl overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border border-secondary-100 animate-scaleIn">
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
              <h2 className="text-xl font-black text-white truncate max-w-[620px]" title={personaNombre}>
                {personaNombre ? `Domicilio · ${personaNombre}` : "Domicilio"}
              </h2>
              <p className="text-white/80 text-sm font-medium">
                Ubicación · Vivienda · Observaciones
              </p>
            </div>
          </div>
        </div>

        {/* Stepper de 3 pasos */}
        <div className="px-8 py-4 border-b border-secondary-100 bg-secondary-50/50">
          <div className="flex items-center">
            {ETAPAS.map(({ n, label, Icon: StepIcon }, idx) => (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${step === n
                      ? "bg-primary-600 border-primary-600 text-white shadow-lg scale-110"
                      : step > n
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-white border-secondary-300 text-secondary-400"
                      }`}
                  >
                    {step > n ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${step === n ? "text-primary-700" : "text-secondary-400"
                      }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < ETAPAS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${step > n ? "bg-green-500" : "bg-secondary-200"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6">
          {loading && (
            <p className="text-xs text-secondary-500 font-medium">
              Cargando datos actuales…
            </p>
          )}
          {step === 1 && (
            <section className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Localidad / Ubicación
              </h3>

              {/* Switch: Domicilio Desconocido */}
              <label className="flex items-center gap-3 rounded-2xl border border-secondary-200 bg-secondary-50 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={domicilioDesconocido}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setDomicilioDesconocido(on);
                    if (on) setStep(3);
                  }}
                />
                <div className="w-11 h-6 bg-secondary-300 peer-focus:outline-none rounded-full relative peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                <div>
                  <p className="text-sm font-black text-secondary-800">
                    Declarar Domicilio Desconocido
                  </p>
                  <p className="text-[10px] text-secondary-500 font-medium">
                    Salta al Paso 3 y podés justificarlo en Observaciones
                  </p>
                </div>
              </label>

              <div className="md:col-span-2">
                <label className={labelCls}>País</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={domicilioDesconocido}
                    onClick={() => onPaisTipoChange("argentina")}
                    className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${paisTipo === "argentina"
                      ? "bg-primary-600 border-primary-600 text-white shadow"
                      : "bg-white border-secondary-200 text-secondary-500 hover:border-primary-300"
                      }`}
                  >
                    🇦🇷 Argentina
                  </button>
                  <button
                    type="button"
                    disabled={domicilioDesconocido}
                    onClick={() => onPaisTipoChange("extranjero")}
                    className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${paisTipo === "extranjero"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow"
                      : "bg-white border-secondary-200 text-secondary-500 hover:border-primary-300"
                      }`}
                  >
                    🌐 Extranjero
                  </button>
                </div>

                {paisTipo === "extranjero" && (
                  <div className="mt-2">
                    <SearchableSelect
                      label="Seleccionar país extranjero"
                      options={nacionsSinArgentina}
                      value={domicilio.nacion_id}
                      placeholder="Buscar país..."
                      disabled={domicilioDesconocido}
                      onChange={(e) => onNacionChange(e.target.value)}
                    />
                    <p className="text-[10px] font-medium text-secondary-500 mt-1">
                      Al elegir un país extranjero el Paso 1 finaliza y pasarás al Resumen
                      (Paso 3).
                    </p>
                  </div>
                )}
              </div>

              {paisTipo === "argentina" && esArgentina && (
                <>
                  {/* Omnibox de localidades */}
                  <div className="md:col-span-2">
                    <label className={labelCls}>Localidad / Ubicación</label>
                    <div className="rounded-2xl border-2 border-primary-300 bg-white overflow-hidden transition-all focus-within:border-primary-500">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <Search className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        <input
                          type="text"
                          value={qLocalidad}
                          disabled={domicilioDesconocido}
                          onChange={(e) => setQLocalidad(e.target.value)}
                          placeholder="Escribí tu localidad (ej. Tandil, Quilmes, San Martín)..."
                          className="w-full bg-transparent outline-none text-sm font-bold"
                        />
                        {buscandoLocalidades && (
                          <Loader2 className="w-4 h-4 text-primary-500 animate-spin flex-shrink-0" />
                        )}
                      </div>
                      {localidadesSearch.length > 0 && (
                        <ul className="border-t border-secondary-100 max-h-56 overflow-y-auto">
                          {localidadesSearch.map((loc) => (
                            <li
                              key={loc.id}
                              onClick={() => onSelectOmnibox(loc)}
                              className="px-4 py-2.5 cursor-pointer hover:bg-primary-50 transition-colors"
                            >
                              <p className="text-sm font-black text-secondary-800">
                                📍 {loc.nombre}
                              </p>
                              <p className="text-[11px] font-medium text-secondary-500">
                                {loc.departamento?.nombre} — {loc.departamento?.provincia?.nombre}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                      {(qLocalidad || "").trim().length > 0 &&
                        localidadesSearch.length === 0 &&
                        !buscandoLocalidades && (
                          <p className="px-4 py-3 text-[11px] italic text-secondary-400">
                            Sin coincidencias. Probá con otro término o usá la cascada clásica.
                          </p>
                        )}
                    </div>

                    {/* Alternancia omnibox <-> cascada clásica */}
                    <div className="text-right mt-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setModoUbicacion((m) =>
                            m === "omnibox" ? "cascada" : "omnibox",
                          )
                        }
                        className="text-[11px] font-black text-primary-600 hover:text-primary-700 underline"
                      >
                        {modoUbicacion === "omnibox"
                          ? "¿No encontrás tu localidad? Usá la cascada clásica →"
                          : "← Volver al buscador rápido"}
                      </button>
                    </div>
                  </div>

                  {/* Breadcrumb: resumen visual de la ubicación */}
                  <div className="md:col-span-2">
                    <BreadcrumbUbicacion />
                  </div>

                  {/* Fallback clásico (cascada con SearchableSelect) */}
                  {modoUbicacion === "cascada" && (
                    <div className="md:col-span-2 rounded-2xl border border-secondary-200 bg-secondary-50 p-4 space-y-4">
                      <SearchableSelect
                        label="Provincia"
                        options={provincias}
                        value={domicilio.provincia_id}
                        placeholder="Seleccionar provincia"
                        disabled={domicilioDesconocido}
                        onChange={(e) => onProvinciaChange(e.target.value)}
                      />
                      <SearchableSelect
                        label="Departamento"
                        options={departamentos}
                        value={domicilio.departamento_id}
                        placeholder="Seleccionar departamento"
                        disabled={!domicilio.provincia_id || domicilioDesconocido}
                        onChange={(e) => onDepartamentoChange(e.target.value)}
                      />
                      <SearchableSelect
                        label="Localidad"
                        options={localidades}
                        value={domicilio.localidad_id}
                        placeholder="Seleccionar localidad"
                        disabled={!domicilio.departamento_id || domicilioDesconocido}
                        onChange={(e) => onLocalidadChange(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          )}
          {step === 2 && (
            <section className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Calles y Vivienda
              </h3>

              {(domicilioDesconocido || esExtranjero) && (
                <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  {domicilioDesconocido
                    ? "Domicilio Desconocido: este paso queda deshabilitado."
                    : "Domicilio en el extranjero: no se registran calles ni vivienda."}
                </p>
              )}

              {!domicilioDesconocido && (esArgentina || esExtranjero) && (
                <div className="flex flex-wrap">
                  <BreadcrumbUbicacion />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CalleCombo
                  label="Calle principal"
                  q={q}
                  onQChange={setQ}
                  calles={calles}
                  disabled={
                    !domicilio.localidad_id ||
                    domicilioDesconocido ||
                    noGeo.localidad
                  }
                  placeholder="Ej: Av. Rivadavia"
                  onSelect={(id) =>
                    setDomicilio((p) => ({ ...p, calle_id: id }))
                  }
                />
                <CalleCombo
                  label="Entrecalle 1"
                  q={qEntre1}
                  onQChange={setQEntre1}
                  calles={callesEntre1}
                  disabled={
                    !domicilio.localidad_id ||
                    domicilioDesconocido ||
                    noGeo.localidad
                  }
                  placeholder="Ej: Entre calle..."
                  onSelect={(id) =>
                    setDomicilio((p) => ({ ...p, calle_entre_1_id: id }))
                  }
                />
                <CalleCombo
                  label="Entrecalle 2"
                  q={qEntre2}
                  onQChange={setQEntre2}
                  calles={callesEntre2}
                  disabled={
                    !domicilio.localidad_id ||
                    domicilioDesconocido ||
                    noGeo.localidad
                  }
                  placeholder="Ej: Entre calle..."
                  onSelect={(id) =>
                    setDomicilio((p) => ({ ...p, calle_entre_2_id: id }))
                  }
                />
                <div>
                  <label className={labelCls}>Número</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={20}
                    value={domicilio.numero}
                    onChange={setDomicilioField("numero")}
                    disabled={
                      domicilioDesconocido || esExtranjero || noGeo.localidad
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Piso</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={domicilio.piso}
                    onChange={setDomicilioField("piso")}
                    disabled={
                      domicilioDesconocido || esExtranjero || noGeo.localidad
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Departamento (unidad)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={domicilio.unidad}
                    onChange={setDomicilioField("unidad")}
                    disabled={
                      domicilioDesconocido || esExtranjero || noGeo.localidad
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Torre</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={domicilio.torre}
                    onChange={setDomicilioField("torre")}
                    disabled={
                      domicilioDesconocido || esExtranjero || noGeo.localidad
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Código Postal</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={domicilio.codigo_postal}
                    onChange={setDomicilioField("codigo_postal")}
                    disabled={
                      domicilioDesconocido || esExtranjero || noGeo.localidad
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            </section>
          )}
          {step === 3 && (
            <section className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-2 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Resumen y Confirmación
              </h3>
              {/* Aviso de geografía parcial (solo país / solo provincia / provincia + departamento) */}
              {!domicilioDesconocido && esGeoParcial && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-sky-600 flex-shrink-0" />
                  <p className="text-xs text-sky-800 font-medium">
                    <span className="font-black uppercase tracking-wide">
                      Geografía parcial:{" "}
                    </span>
                    {domicilio.provincia_id
                      ? domicilio.departamento_id
                        ? "se registrarán país, provincia y departamento; las calles y la vivienda quedarán vacías."
                        : "se registrarán país y provincia; el departamento, las calles y la vivienda quedarán vacíos."
                      : "solo se registrará el país; no se informan provincia, departamento ni localidad."}
                  </p>
                </div>
              )}
              {domicilioDesconocido ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-black text-amber-800 uppercase text-sm">
                      Domicilio Desconocido
                    </p>
                    <p className="text-xs text-amber-700 font-medium">
                      El domicilio geográfico quedará en blanco. Solo se
                      persistirá la observación.
                    </p>
                  </div>
                </div>
              ) : esExtranjero ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="font-black text-indigo-800 uppercase text-sm">
                      Domicilio en el extranjero
                    </p>
                    <p className="text-xs text-indigo-700 font-medium">
                      Solo se guardará el país. Los campos de calles y vivienda
                      quedarán vacíos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-5 space-y-3 shadow-sm">
                  <ResumenItem
                    label="País"
                    valor={
                      domicilio.nacion_id &&
                      nacions.find(
                        (n) => String(n.id) === String(domicilio.nacion_id),
                      )?.nombre
                    }
                  />
                  <ResumenItem
                    label="Provincia"
                    valor={
                      provincias.find(
                        (p) => String(p.id) === String(domicilio.provincia_id),
                      )?.nombre || ubicacionSeleccion.provincia || ""
                    }
                  />
                  <ResumenItem
                    label="Departamento"
                    valor={
                      departamentos.find(
                        (d) =>
                          String(d.id) === String(domicilio.departamento_id),
                      )?.nombre || ubicacionSeleccion.departamento || ""
                    }
                  />
                  <ResumenItem
                    label="Localidad"
                    valor={
                      localidades.find(
                        (l) => String(l.id) === String(domicilio.localidad_id),
                      )?.nombre || ubicacionSeleccion.localidad || ""
                    }
                  />
                  <ResumenItem label="Calle" valor={q} />
                  <ResumenItem label="Número" valor={domicilio.numero} />
                  <ResumenItem
                    label="Piso / Dpto / Torre"
                    valor={[domicilio.piso, domicilio.unidad, domicilio.torre]
                      .filter(Boolean)
                      .join(" / ")}
                  />
                  <ResumenItem
                    label="Entrecalles"
                    valor={[qEntre1, qEntre2].filter(Boolean).join(" y ")}
                  />
                  <ResumenItem
                    label="Código Postal"
                    valor={domicilio.codigo_postal}
                  />
                </div>
              )}

              <div>
                <label className={labelCls}>
                  Observaciones del Domicilio (Opcional)
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  placeholder="Ej: Se desconoce el domicilio actual, vive transitoriamente en..."
                  className="w-full px-4 py-2 bg-white border border-secondary-300 rounded-xl text-xs font-medium text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
                  value={domicilio.observaciones || ""}
                  onChange={(e) =>
                    setDomicilio((p) => ({
                      ...p,
                      observaciones: e.target.value,
                    }))
                  }
                />
              </div>
            </section>
          )}
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
          <button
            type="button"
            onClick={clearForm}
            className="px-5 py-3 border border-red-200 text-red-600 rounded-2xl font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <Eraser className="w-4 h-4" /> Limpiar datos
          </button>
          <div className="flex-1" />
          {step > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="px-5 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-[0.98] shadow-lg flex items-center gap-2"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Guardar Domicilio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
