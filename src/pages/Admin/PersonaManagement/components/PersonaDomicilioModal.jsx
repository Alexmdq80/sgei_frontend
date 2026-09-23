import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  Loader2,
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
import CalleCombo from "../components/CalleCombo";
import { useCalleSearch } from "../hooks/useCalleSearch";

// Componente auxiliar para el resumen final
const ResumenFila = ({ label, valor }) => (
  <div className="flex justify-between gap-4">
    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest pt-0.5">
      {label}
    </p>
    <p className="text-sm font-bold text-secondary-900 text-right">
      {valor || "—"}
    </p>
  </div>
);

const CAMPOS_VIVIENDA = [
  { key: "numero", label: "Número", numeric: true, max: 20 },
  { key: "piso", label: "Piso", numeric: true, max: 10 },
  { key: "unidad", label: "Departamento (unidad)", max: 10 },
  { key: "torre", label: "Torre", max: 10 },
  { key: "codigo_postal", label: "Código Postal", numeric: true, max: 10 },
];

const ETAPAS = [
  { n: 1, label: "Ubicación", Icon: MapPin },
  { n: 2, label: "Calles y Vivienda", Icon: Building2 },
  { n: 3, label: "Resumen y Observaciones", Icon: ClipboardCheck },
];

const INITIAL_DOMICILIO = {
  nacion_id: "",
  provincia_id: "",
  departamento_id: "",
  localidad_id: "",
  calle_id: "",
  calle_nombre: "",
  calle_entre_1_id: "",
  calle_entre_1_nombre: "",
  calle_entre_2_id: "",
  calle_entre_2_nombre: "",
  numero: "",
  piso: "",
  unidad: "",
  torre: "",
  codigo_postal: "",
  observaciones: "",
};

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
  const [paisTipo, setPaisTipo] = useState("argentina");
  const [modoUbicacion, setModoUbicacion] = useState("omnibox");
  const [saving, setSaving] = useState(false);

  // Control de carga reactivo: evita el pantallazo inicial en el frame 0
  const [lastLoadedId, setLastLoadedId] = useState(null);
  const estaCargando = !isOpen || lastLoadedId !== personaId;

  // Estados de datos
  const [domicilio, setDomicilio] = useState(INITIAL_DOMICILIO);
  const [ubicacionSeleccion, setUbicacionSeleccion] = useState({
    provincia: "",
    departamento: "",
    localidad: "",
  });

  // Textos de búsqueda
  const [qLocalidad, setQLocalidad] = useState("");
  const [q, setQ] = useState("");
  const [qEntre1, setQEntre1] = useState("");
  const [qEntre2, setQEntre2] = useState("");

  // Omnibox localidades
  const [localidadesSearch, setLocalidadesSearch] = useState([]);
  const [buscandoLocalidades, setBuscandoLocalidades] = useState(false);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const skipSearchRef = useRef(false);
  const omniboxRef = useRef(null);

  // Cascada Geográfica
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

  // Búsquedas optimizadas de calles con Hook cancelable
  const searchPrincipal = useCalleSearch(
    domicilio.localidad_id,
    q,
    domicilio.calle_id,
  );
  const searchEntre1 = useCalleSearch(
    domicilio.localidad_id,
    qEntre1,
    domicilio.calle_entre_1_id,
  );
  const searchEntre2 = useCalleSearch(
    domicilio.localidad_id,
    qEntre2,
    domicilio.calle_entre_2_id,
  );

  const nacionArgentina = useMemo(
    () =>
      nacions.find(
        (n) => String(n.nombre).trim().toUpperCase() === "ARGENTINA",
      ),
    [nacions],
  );
  const nacionsSinArgentina = useMemo(
    () => nacions.filter((n) => !esNacionArgentina([n], n.id)),
    [nacions],
  );

  const esArgentina = esNacionArgentina(nacions, domicilio.nacion_id);
  const esExtranjero = Boolean(domicilio.nacion_id) && !esArgentina;
  const esGeoParcial = esArgentina && !domicilio.localidad_id;

  const nomPorId = (lista, id) =>
    lista.find((i) => String(i.id) === String(id))?.nombre || "";

  const resetCalles = useCallback(() => {
    setQ("");
    setQEntre1("");
    setQEntre2("");
  }, []);

  // Cerrar dropdown del omnibox al click fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (omniboxRef.current && !omniboxRef.current.contains(e.target)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Carga inicial del domicilio: SOLO se ejecuta al abrir el modal o cambiar de personaId
  useEffect(() => {
    if (!isOpen || !personaId) {
      setLastLoadedId(null);
      return;
    }

    let active = true;

    personaService
      .getDomicilio(personaId)
      .then((r) => {
        if (!active) return;
        const d = r?.data || r || null;

        // Caso 1: Persona nueva sin domicilio previo
        if (!d || (!d.nacion_id && !d.observaciones)) {
          setStep(1);
          setDomicilioDesconocido(false);
          setPaisTipo("argentina");

          const arId = nacionArgentina?.id || "";
          setDomicilio({ ...INITIAL_DOMICILIO, nacion_id: arId });
          setUbicacionSeleccion({
            provincia: "",
            departamento: "",
            localidad: "",
          });
          setQLocalidad("");
          resetCalles();

          if (arId) handleNacionChange(arId);
          return;
        }

        // Caso 2: Persona con domicilio existente
        const esDesconocido =
          !d.nacion_id &&
          !d.localidad_id &&
          !d.calle_id &&
          Boolean(d.observaciones);

        setDomicilioDesconocido(esDesconocido);
        setStep(esDesconocido ? 3 : 1);

        setDomicilio({ ...INITIAL_DOMICILIO, ...d });
        setQ(d.calle_nombre || "");
        setQEntre1(d.calle_entre_1_nombre || "");
        setQEntre2(d.calle_entre_2_nombre || "");

        // Sincronizar nombres para que el breadcrumb cargue inmediatamente
        setUbicacionSeleccion({
          provincia: d.provincia_nombre || d.provincia?.nombre || "",
          departamento: d.departamento_nombre || d.departamento?.nombre || "",
          localidad: d.localidad_nombre || d.localidad?.nombre || "",
        });
        setQLocalidad(d.localidad_nombre || d.localidad?.nombre || "");

        const esAR = esNacionArgentina(nacions, d.nacion_id);
        setPaisTipo(esAR ? "argentina" : "extranjero");

        if (d.nacion_id) handleNacionChange(d.nacion_id);
        if (d.provincia_id) loadDepartamentos(d.provincia_id);
        if (d.departamento_id) loadLocalidades(d.departamento_id);
      })
      .catch((err) => console.error("Error al cargar domicilio:", err))
      .finally(() => {
        if (active) setLastLoadedId(personaId);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, personaId]);

  // Precarga el catálogo completo de localidades en memoria al abrir el modal
  useEffect(() => {
    if (isOpen) {
      geografiaService.getCatalogoLocalidades().catch(() => { });
    }
  }, [isOpen]);

  // Omnibox de localidades: búsqueda con debounce
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const term = (qLocalidad || "").trim();
    if (
      paisTipo !== "argentina" ||
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
          if (active) {
            setLocalidadesSearch(Array.isArray(r) ? r : r?.data || []);
            setDropdownAbierto(true);
          }
        })
        .catch(() => {
          if (active) setLocalidadesSearch([]);
        })
        .finally(() => {
          if (active) setBuscandoLocalidades(false);
        });
    }, 50);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [paisTipo, domicilioDesconocido, modoUbicacion, qLocalidad]);

  // Manejadores de geografía
  const onNacionChange = (value) => {
    const esAR = esNacionArgentina(nacions, value);
    if (value) setPaisTipo(esAR ? "argentina" : "extranjero");
    setDomicilio({ ...INITIAL_DOMICILIO, nacion_id: value });
    setUbicacionSeleccion({ provincia: "", departamento: "", localidad: "" });
    resetCalles();
    setDropdownAbierto(false);
    setDomicilioDesconocido(false);

    if (!value) {
      setStep(1);
      clearGeoArgentina();
      return;
    }
    if (!esAR) {
      setStep(3);
      clearGeoArgentina();
      return;
    }
    setStep(1);
    handleNacionChange(value);
  };

  const onPaisTipoChange = (tipo) => {
    if (tipo === paisTipo) return;
    setPaisTipo(tipo);
    setDomicilioDesconocido(false);
    setUbicacionSeleccion({ provincia: "", departamento: "", localidad: "" });
    setDropdownAbierto(false);

    if (tipo === "argentina") {
      onNacionChange(nacionArgentina?.id || "");
    } else {
      onNacionChange("");
    }
  };

  const onProvinciaChange = (value) => {
    setDomicilio((p) => ({
      ...p,
      provincia_id: value,
      departamento_id: "",
      localidad_id: "",
      calle_id: "",
      calle_nombre: "",
      calle_entre_1_id: "",
      calle_entre_1_nombre: "",
      calle_entre_2_id: "",
      calle_entre_2_nombre: "",
    }));
    setQLocalidad("");
    resetCalles();
    setUbicacionSeleccion({
      provincia: nomPorId(provincias, value),
      departamento: "",
      localidad: "",
    });
    handleProvinciaChange(value);
  };

  const onDepartamentoChange = (value) => {
    setDomicilio((p) => ({
      ...p,
      departamento_id: value,
      localidad_id: "",
      calle_id: "",
      calle_nombre: "",
      calle_entre_1_id: "",
      calle_entre_1_nombre: "",
      calle_entre_2_id: "",
      calle_entre_2_nombre: "",
    }));
    setQLocalidad("");
    resetCalles();
    setUbicacionSeleccion((prev) => ({
      provincia: nomPorId(provincias, domicilio.provincia_id) || prev.provincia,
      departamento: nomPorId(departamentos, value),
      localidad: "",
    }));
    handleDepartamentoChange(value);
  };

  const onLocalidadChange = (value) => {
    const locNombre = nomPorId(localidades, value);
    setDomicilio((p) => ({
      ...p,
      localidad_id: value,
      calle_id: "",
      calle_nombre: "",
      calle_entre_1_id: "",
      calle_entre_1_nombre: "",
      calle_entre_2_id: "",
      calle_entre_2_nombre: "",
    }));
    setQLocalidad(locNombre);
    resetCalles();
    setUbicacionSeleccion((prev) => ({
      provincia: nomPorId(provincias, domicilio.provincia_id) || prev.provincia,
      departamento:
        nomPorId(departamentos, domicilio.departamento_id) || prev.departamento,
      localidad: locNombre,
    }));
  };

  const onSelectOmnibox = (item) => {
    const depto = item.departamento;
    const prov = depto?.provincia;
    const deptoId = depto?.id ?? item.departamento_id ?? "";

    skipSearchRef.current = true;
    setDropdownAbierto(false);
    setLocalidadesSearch([]);

    setDomicilio((p) => ({
      ...p,
      nacion_id: nacionArgentina?.id || p.nacion_id,
      provincia_id: prov?.id ?? "",
      departamento_id: deptoId,
      localidad_id: item.id,
      calle_id: "",
      calle_nombre: "",
      calle_entre_1_id: "",
      calle_entre_1_nombre: "",
      calle_entre_2_id: "",
      calle_entre_2_nombre: "",
    }));

    setUbicacionSeleccion({
      provincia: prov?.nombre ?? "",
      departamento: depto?.nombre ?? "",
      localidad: item.nombre ?? "",
    });

    setQLocalidad(item.nombre);
    resetCalles();

    if (prov?.id) loadDepartamentos(prov.id);
    if (deptoId) loadLocalidades(deptoId);
    setModoUbicacion("omnibox");
  };

  const clearForm = () => {
    setStep(1);
    setDomicilioDesconocido(false);
    setDomicilio(INITIAL_DOMICILIO);
    setPaisTipo("argentina");
    setModoUbicacion("omnibox");
    setQLocalidad("");
    setLocalidadesSearch([]);
    setDropdownAbierto(false);
    setUbicacionSeleccion({ provincia: "", departamento: "", localidad: "" });
    resetCalles();
    clearGeoArgentina();
    if (nacionArgentina?.id) {
      setDomicilio((p) => ({ ...p, nacion_id: nacionArgentina.id }));
      handleNacionChange(nacionArgentina.id);
    }
  };

  const handleSave = async () => {
    if (!personaId) return;
    setSaving(true);
    try {
      await personaService.saveDomicilio(
        personaId,
        domicilioDesconocido
          ? { blanquear: true, observaciones: domicilio.observaciones || "" }
          : { ...domicilio, observaciones: domicilio.observaciones || "" },
      );
      onSaved();
    } catch (err) {
      console.error("Error al guardar domicilio:", err);
    } finally {
      setSaving(false);
    }
  };

  // Render del Breadcrumb (utilizado en Paso 1 y Paso 2)
  const renderBreadcrumbUbicacion = () => {
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
    if (paisTipo === "argentina") {
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
                setUbicacionSeleccion({
                  provincia: "",
                  departamento: "",
                  localidad: "",
                });
                setQLocalidad("");
                setLocalidadesSearch([]);
                setDropdownAbierto(false);
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
                resetCalles();
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

  if (!isOpen || !personaId) return null;

  const personaNombre =
    persona?.apellido || persona?.nombre
      ? `${persona.apellido ?? ""}, ${persona.nombre ?? ""}`
        .replace(/^,\s*|,\s*$/, "")
        .trim()
      : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-secondary-900/60 transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="h-[85vh] max-h-[760px] min-h-[580px] w-full max-w-4xl overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border border-secondary-100 animate-scaleIn">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 px-8 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white truncate max-w-[620px]">
                {personaNombre ? `Domicilio · ${personaNombre}` : "Domicilio"}
              </h2>
              <p className="text-white/80 text-sm font-medium">
                Ubicación · Vivienda · Observaciones
              </p>
            </div>
          </div>
        </div>

        {/* Stepper */}
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
          {estaCargando ? (
            /* Loader centrado inicial */
            <div className="h-full min-h-[340px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">
                Cargando datos del domicilio…
              </p>
            </div>
          ) : (
            /* Contenedor con transición fadeIn que SOLO se dispara al cambiar de 'step' */
            <div key={step} className="animate-fadeIn">
              {/* PASO 1 */}
              {step === 1 && (
                <section className="space-y-4">
                  <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Localidad / Ubicación
                  </h3>

                  {/* Domicilio Desconocido */}
                  <label className="flex items-center gap-3 rounded-2xl border border-secondary-200 bg-secondary-50 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={domicilioDesconocido}
                      onChange={(e) => {
                        setDomicilioDesconocido(e.target.checked);
                        if (e.target.checked) setStep(3);
                      }}
                    />
                    <div className="w-11 h-6 bg-secondary-300 rounded-full relative peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                    <div>
                      <p className="text-sm font-black text-secondary-800">
                        Declarar Domicilio Desconocido
                      </p>
                      <p className="text-[10px] text-secondary-500 font-medium">
                        Salta al Paso 3 y podés justificarlo en Observaciones
                      </p>
                    </div>
                  </label>

                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      País
                    </label>
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
                      </div>
                    )}
                  </div>

                  {paisTipo === "argentina" && (
                    <>
                      <div>{renderBreadcrumbUbicacion()}</div>

                      <div>
                        {modoUbicacion === "omnibox" && (
                          <div ref={omniboxRef} className="relative">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                              Localidad / Ubicación
                            </label>
                            <div className="rounded-2xl border-2 border-primary-300 bg-white overflow-hidden transition-all focus-within:border-primary-500">
                              <div className="flex items-center gap-2 px-4 py-3">
                                <Search className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                <input
                                  type="text"
                                  value={qLocalidad}
                                  disabled={domicilioDesconocido}
                                  onFocus={() => {
                                    if (localidadesSearch.length > 0)
                                      setDropdownAbierto(true);
                                  }}
                                  onChange={(e) => {
                                    setQLocalidad(e.target.value);
                                    setDropdownAbierto(true);
                                    if (domicilio.localidad_id) {
                                      setDomicilio((p) => ({
                                        ...p,
                                        localidad_id: "",
                                        provincia_id: "",
                                        departamento_id: "",
                                      }));
                                      setUbicacionSeleccion({
                                        provincia: "",
                                        departamento: "",
                                        localidad: "",
                                      });
                                    }
                                  }}
                                  placeholder="Escribí tu localidad (ej. Tandil, Quilmes, San Martín)..."
                                  className="w-full bg-transparent outline-none text-sm font-bold"
                                />
                                {buscandoLocalidades && (
                                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin flex-shrink-0" />
                                )}
                              </div>

                              {dropdownAbierto &&
                                localidadesSearch.length > 0 && (
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
                                          {loc.departamento?.nombre} —{" "}
                                          {loc.departamento?.provincia?.nombre}
                                        </p>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                              {dropdownAbierto &&
                                !domicilio.localidad_id &&
                                (qLocalidad || "").trim().length >= 2 &&
                                localidadesSearch.length === 0 &&
                                !buscandoLocalidades && (
                                  <p className="px-4 py-3 text-[11px] italic text-secondary-400 border-t border-secondary-100">
                                    Sin coincidencias. Probá con otro término o
                                    usá la cascada clásica.
                                  </p>
                                )}
                            </div>
                          </div>
                        )}

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

                        {modoUbicacion === "cascada" && (
                          <div className="mt-2 rounded-2xl border border-secondary-200 bg-secondary-50 p-4 space-y-4">
                            <SearchableSelect
                              label="Provincia"
                              options={provincias}
                              value={domicilio.provincia_id}
                              placeholder="Seleccionar provincia"
                              disabled={domicilioDesconocido}
                              onChange={(e) =>
                                onProvinciaChange(e.target.value)
                              }
                            />
                            <SearchableSelect
                              label="Departamento"
                              options={departamentos}
                              value={domicilio.departamento_id}
                              placeholder="Seleccionar departamento"
                              disabled={
                                !domicilio.provincia_id || domicilioDesconocido
                              }
                              onChange={(e) =>
                                onDepartamentoChange(e.target.value)
                              }
                            />
                            <SearchableSelect
                              label="Localidad"
                              options={localidades}
                              value={domicilio.localidad_id}
                              placeholder="Seleccionar localidad"
                              disabled={
                                !domicilio.departamento_id ||
                                domicilioDesconocido
                              }
                              onChange={(e) =>
                                onLocalidadChange(e.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* PASO 2 */}
              {step === 2 && (
                <section className="space-y-4">
                  <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Calles y Vivienda
                  </h3>

                  {/* Breadcrumb presente en Paso 2 */}
                  {!domicilioDesconocido && (
                    <div className="flex flex-wrap mb-2">
                      {renderBreadcrumbUbicacion()}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CalleCombo
                      label="Calle principal"
                      valueText={q}
                      selectedId={domicilio.calle_id}
                      calles={searchPrincipal.calles}
                      loading={searchPrincipal.loading}
                      disabled={!domicilio.localidad_id || domicilioDesconocido}
                      placeholder="Ej: Av. Rivadavia, San Martín..."
                      onSearchChange={(val) => {
                        setQ(val);
                        setDomicilio((p) => ({
                          ...p,
                          calle_id: "",
                          calle_nombre: val,
                        }));
                      }}
                      onSelectCalle={(calle) => {
                        setQ(calle.nombre);
                        setDomicilio((p) => ({
                          ...p,
                          calle_id: calle.id,
                          calle_nombre: calle.nombre,
                        }));
                      }}
                      onSelectCustom={(nombreLibre) => {
                        setQ(nombreLibre);
                        setDomicilio((p) => ({
                          ...p,
                          calle_id: "",
                          calle_nombre: nombreLibre,
                        }));
                      }}
                      onClearCalle={() => {
                        setQ("");
                        setDomicilio((p) => ({
                          ...p,
                          calle_id: "",
                          calle_nombre: "",
                        }));
                      }}
                    />

                    <CalleCombo
                      label="Entrecalle 1"
                      valueText={qEntre1}
                      selectedId={domicilio.calle_entre_1_id}
                      calles={searchEntre1.calles}
                      loading={searchEntre1.loading}
                      disabled={!domicilio.localidad_id || domicilioDesconocido}
                      placeholder="Ej: Mitre..."
                      onSearchChange={(val) => {
                        setQEntre1(val);
                        setDomicilio((p) => ({
                          ...p,
                          calle_entre_1_id: "",
                          calle_entre_1_nombre: val,
                        }));
                      }}
                      onSelectCalle={(calle) => {
                        setQEntre1(calle.nombre);
                        setDomicilio((p) => ({
                          ...p,
                          calle_entre_1_id: calle.id,
                          calle_entre_1_nombre: calle.nombre,
                        }));
                      }}
                      onSelectCustom={(nombreLibre) => {
                        setQEntre1(nombreLibre);
                        setDomicilio((p) => ({
                          ...p,
                          calle_entre_1_id: "",
                          calle_entre_1_nombre: nombreLibre,
                        }));
                      }}
                      onClearCalle={() => {
                        setQEntre1("");
                        setDomicilio((p) => ({
                          ...p,
                          calle_entre_1_id: "",
                          calle_entre_1_nombre: "",
                        }));
                      }}
                    />

                    <CalleCombo
                      label="Entrecalle 2"
                      valueText={qEntre2}
                      selectedId={domicilio.calle_entre_2_id}
                      calles={searchEntre2.calles}
                      loading={searchEntre2.loading}
                      disabled={!domicilio.localidad_id || domicilioDesconocido}
                      placeholder="Ej: Belgrano..."
                      onSearchChange={(val) => {
                        setQEntre2(val);
                        setDomicilio((p) => ({
                          ...p,
                          calle_entre_2_id: "",
                          calle_entre_2_nombre: val,
                        }));
                      }}
                      onSelectCalle={(calle) => {
                        setQEntre2(calle.nombre);
                        setDomicilio((p) => ({
                          ...p,
                          calle_entre_2_id: calle.id,
                          calle_entre_2_nombre: calle.nombre,
                        }));
                      }}
                      onSelectCustom={(nombreLibre) => {
                        setQEntre2(nombreLibre);
                        setDomicilio((p) => ({
                          ...p,
                          calle_entre_2_id: "",
                          calle_entre_2_nombre: nombreLibre,
                        }));
                      }}
                      onClearCalle={() => {
                        setQEntre2("");
                        setDomicilio((p) => ({
                          ...p,
                          calle_entre_2_id: "",
                          calle_entre_2_nombre: "",
                        }));
                      }}
                    />

                    {/* Campos de vivienda */}
                    {CAMPOS_VIVIENDA.map(({ key, label, numeric, max }) => (
                      <div key={key}>
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                          {label}
                        </label>
                        <input
                          type="text"
                          maxLength={max}
                          value={domicilio[key] || ""}
                          onChange={(e) => {
                            const val = numeric
                              ? e.target.value.replace(/\D/g, "")
                              : e.target.value;
                            setDomicilio((p) => ({ ...p, [key]: val }));
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* PASO 3 */}
              {step === 3 && (
                <section className="space-y-4">
                  <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-2 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" /> Resumen y
                    Confirmación
                  </h3>

                  {!domicilioDesconocido && esGeoParcial && (
                    <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-sky-600 flex-shrink-0" />
                      <p className="text-xs text-sky-800 font-medium">
                        <span className="font-black uppercase tracking-wide">
                          Geografía parcial:{" "}
                        </span>
                        {domicilio.provincia_id
                          ? domicilio.departamento_id
                            ? "se registrarán país, provincia y departamento; las calles y vivienda quedarán vacías."
                            : "se registrarán país y provincia; el departamento, calles y vivienda quedarán vacíos."
                          : "solo se registrará el país."}
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
                          Solo se guardará el país. Los campos de calles y
                          vivienda quedarán vacíos.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-5 space-y-3 shadow-sm">
                      <ResumenFila
                        label="País"
                        valor={
                          nacions.find(
                            (n) => String(n.id) === String(domicilio.nacion_id),
                          )?.nombre
                        }
                      />
                      <ResumenFila
                        label="Provincia"
                        valor={
                          nomPorId(provincias, domicilio.provincia_id) ||
                          ubicacionSeleccion.provincia
                        }
                      />
                      <ResumenFila
                        label="Departamento"
                        valor={
                          nomPorId(departamentos, domicilio.departamento_id) ||
                          ubicacionSeleccion.departamento
                        }
                      />
                      <ResumenFila
                        label="Localidad"
                        valor={
                          nomPorId(localidades, domicilio.localidad_id) ||
                          ubicacionSeleccion.localidad
                        }
                      />
                      <ResumenFila
                        label="Calle"
                        valor={
                          domicilio.calle_nombre || q ? (
                            <div className="flex items-center gap-2">
                              <span>{domicilio.calle_nombre || q}</span>
                              {domicilio.calle_id ? (
                                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                  OFICIAL ✓
                                </span>
                              ) : (
                                <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                  TEXTO LIBRE 📝
                                </span>
                              )}
                            </div>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <ResumenFila label="Número" valor={domicilio.numero} />
                      <ResumenFila
                        label="Piso / Dpto / Torre"
                        valor={[
                          domicilio.piso,
                          domicilio.unidad,
                          domicilio.torre,
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      />
                      <ResumenFila
                        label="Entrecalles"
                        valor={[qEntre1, qEntre2].filter(Boolean).join(" y ")}
                      />
                      <ResumenFila
                        label="Código Postal"
                        valor={domicilio.codigo_postal}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Observaciones del Domicilio (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      placeholder="Ej: Se desconoce el domicilio actual, vive transitoriamente en..."
                      className="w-full px-4 py-2 bg-white border border-secondary-300 rounded-xl text-xs font-medium text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
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
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-secondary-100 bg-white flex items-center gap-3 mt-auto shrink-0">
          <button
            type="button"
            onClick={onOmit}
            className="px-5 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200"
          >
            <SkipForward className="w-4 h-4 inline mr-1" /> Omitir
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="px-5 py-3 border border-red-200 text-red-600 rounded-2xl font-black uppercase tracking-widest hover:bg-red-50"
          >
            <Eraser className="w-4 h-4 inline mr-1" /> Limpiar
          </button>
          <div className="flex-1" />
          {step > 1 && (
            <button
              type="button"
              onClick={() =>
                setStep((s) =>
                  s === 3 &&
                    (domicilioDesconocido || esExtranjero || esGeoParcial)
                    ? 1
                    : s - 1,
                )
              }
              className="px-5 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4 inline mr-1" /> Anterior
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() =>
                setStep((s) =>
                  s === 1 &&
                    (domicilioDesconocido ||
                      esExtranjero ||
                      !domicilio.localidad_id)
                    ? 3
                    : s + 1,
                )
              }
              className="px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg"
            >
              Siguiente <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 shadow-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4 inline mr-1" /> Guardar Domicilio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
