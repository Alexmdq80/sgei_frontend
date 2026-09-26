import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
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
  Eraser,
  AlertTriangle,
  Pencil,
  Eye,
} from "lucide-react";
import personaService from "../../../../services/personaService";
import geografiaService from "../../../../services/geografiaService";
import useGeografiaCascade from "../hooks/useGeografiaCascade";
import { esNacionArgentina } from "../utils/nacionUtils";
import { useCalleSearch } from "../hooks/useCalleSearch";
import { parseError } from "../../../../utils/errorParser";
import {
  MAX_RESULTADOS,
  MIN_CARACTERES,
} from "../../../../utils/catalogSearchIndex";
import Stepper from "./Stepper";
import DomicilioBreadcrumbUbicacion from "./domicilio/DomicilioBreadcrumbUbicacion";
import {
  INITIAL_DOMICILIO,
  modoUbicacionPara,
  nomPorId,
} from "./domicilio/domicilioUtils";
import DomicilioLecturaView from "./domicilio/DomicilioLecturaView";
import DomicilioPasoUbicacion from "./domicilio/DomicilioPasoUbicacion";
import DomicilioPasoCalles from "./domicilio/DomicilioPasoCalles";
import DomicilioPasoResumen from "./domicilio/DomicilioPasoResumen";

// Componente auxiliar para el resumen final.
// El valor se renderiza en un <div> (no en un <p>) porque la fila "Calle"
// recibe JSX con un <div> para los badges OFICIAL/TEXTO LIBRE: un <div>
// dentro de un <p> es HTML inválido y React lo reporta como warning.

const ETAPAS = [
  { n: 1, label: "Ubicación", Icon: MapPin },
  { n: 2, label: "Calles y Vivienda", Icon: Building2 },
  { n: 3, label: "Resumen y Observaciones", Icon: ClipboardCheck },
];

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

  // Modo Lectura vs Modo Edición
  const [isEditing, setIsEditing] = useState(true);
  const [hasExistingDomicilio, setHasExistingDomicilio] = useState(false);

  // Snapshot para restaurar datos si el usuario cancela la edición
  const originalDataRef = useRef(null);

  // Referencia al diálogo: la usan el guard de Escape y aria-labelledby
  const dialogRef = useRef(null);

  // Error con CLAVE (persona) para no hacer setState dentro de efectos:
  // al cambiar de persona, el mensaje viejo se descarta solo en el render.
  const [errorCarga, setErrorCarga] = useState({
    personaId: null,
    mensaje: "",
  });
  const [errorGuardado, setErrorGuardado] = useState("");
  const errorVisible =
    errorGuardado ||
    (errorCarga.personaId === personaId ? errorCarga.mensaje : "");

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

  // Paso 2 (Calles y Vivienda) sólo tiene sentido con una localidad elegida
  const paso2Alcanzable = useMemo(
    () =>
      !domicilioDesconocido &&
      !esExtranjero &&
      !esGeoParcial &&
      Boolean(domicilio.localidad_id),
    [domicilioDesconocido, esExtranjero, esGeoParcial, domicilio.localidad_id],
  );

  const esPasoAlcanzable = (n) =>
    n === 1 || n === 3 || (n === 2 && paso2Alcanzable);

  const irAPaso = (n) => {
    if (!esPasoAlcanzable(n)) return;
    setStep((s) => (s === n ? s : n));
  };

  // Reproducen EXACTAMENTE el comportamiento vigente de los botones del footer
  const irSiguiente = () =>
    setStep(step === 1 && !paso2Alcanzable ? 3 : Math.min(3, step + 1));

  const irAnterior = () =>
    setStep(step === 3 && !paso2Alcanzable ? 1 : Math.max(1, step - 1));

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

        // Caso 1: Persona nueva sin domicilio previo (Registro Vacío)
        if (!d || (!d.nacion_id && !d.observaciones)) {
          setHasExistingDomicilio(false);
          setIsEditing(true); // Abre DIRECTO en edición
          originalDataRef.current = null;
          setModoUbicacion("omnibox");
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
        setHasExistingDomicilio(true);
        setIsEditing(false); // Abre en LECTURA
        setModoUbicacion(modoUbicacionPara(d, esDesconocido));
        setStep(esDesconocido ? 3 : 1);

        // Hidratación del estado (la guía la omite): sin esto la ficha de
        // lectura sale vacía y al editar se pisaría el domicilio con blancos.
        setDomicilio({ ...INITIAL_DOMICILIO, ...d });
        setQ(d.calle_nombre || "");
        setQEntre1(d.calle_entre_1_nombre || "");
        setQEntre2(d.calle_entre_2_nombre || "");
        setUbicacionSeleccion({
          provincia: d.provincia_nombre || d.provincia?.nombre || "",
          departamento: d.departamento_nombre || d.departamento?.nombre || "",
          localidad: d.localidad_nombre || d.localidad?.nombre || "",
        });
        setQLocalidad(d.localidad_nombre || d.localidad?.nombre || "");

        const esAR = esNacionArgentina(nacions, d.nacion_id);
        setPaisTipo(
          esDesconocido ? "argentina" : esAR ? "argentina" : "extranjero",
        );

        // Reponer la cascada para que los selects tengan opciones al editar
        if (d.nacion_id) handleNacionChange(d.nacion_id);
        if (d.provincia_id) loadDepartamentos(d.provincia_id);
        if (d.departamento_id) loadLocalidades(d.departamento_id);

        // Snapshot original completo para poder cancelar la edición
        originalDataRef.current = {
          domicilio: {
            nacion_id: d.nacion_id || "",
            provincia_id: d.provincia_id || "",
            departamento_id: d.departamento_id || "",
            localidad_id: d.localidad_id || "",
            calle_id: d.calle_id || "",
            calle_nombre: d.calle_nombre || "",
            calle_entre_1_id: d.calle_entre_1_id || "",
            calle_entre_1_nombre: d.calle_entre_1_nombre || "",
            calle_entre_2_id: d.calle_entre_2_id || "",
            calle_entre_2_nombre: d.calle_entre_2_nombre || "",
            numero: d.numero || "",
            piso: d.piso || "",
            unidad: d.unidad || "",
            torre: d.torre || "",
            codigo_postal: d.codigo_postal || "",
            observaciones: d.observaciones || "",
          },
          domicilioDesconocido: esDesconocido,
          paisTipo: esDesconocido
            ? "argentina"
            : esAR
              ? "argentina"
              : "extranjero",
          ubicacionSeleccion: {
            provincia: d.provincia_nombre || d.provincia?.nombre || "",
            departamento: d.departamento_nombre || d.departamento?.nombre || "",
            localidad: d.localidad_nombre || d.localidad?.nombre || "",
          },
          qLocalidad: d.localidad_nombre || d.localidad?.nombre || "",
          q: d.calle_nombre || "",
          qEntre1: d.calle_entre_1_nombre || "",
          qEntre2: d.calle_entre_2_nombre || "",
        };
      })
      .catch((err) => {
        console.error("Error al cargar domicilio:", err);
        if (active) {
          setErrorCarga({
            personaId,
            mensaje: parseError(
              err,
              "No se pudieron cargar los datos del domicilio. Cerrá y volvé a abrir el modal.",
            ),
          });
        }
      })
      .finally(() => {
        if (active) setLastLoadedId(personaId);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, personaId]);
  // Precalienta el índice de búsqueda en tiempo ocioso: la 1ª tecla es instantánea
  useEffect(() => {
    if (isOpen) geografiaService.prefetchLocalidadesBuscador();
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
      term.length < MIN_CARACTERES
    ) {
      setLocalidadesSearch([]);
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setBuscandoLocalidades(true);
      geografiaService
        .searchLocalidades(term, MAX_RESULTADOS)
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

  // A11y: Escape cierra el modal (con cleanup). Primero intenta cerrar el
  // dropdown del omnibox; si hay otro diálogo encima (p.ej. ConfirmationModal,
  // z-[100]), ese maneja su propio Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (dropdownAbierto) {
        setDropdownAbierto(false);
        return;
      }
      const abiertos = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      if (
        abiertos.length &&
        abiertos[abiertos.length - 1] !== dialogRef.current
      )
        return;
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, dropdownAbierto]);

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
  // El usuario tipea en el omnibox: si había localidad elegida, la invalidamos
  const handleQLocalidadChange = (value) => {
    setQLocalidad(value);
    setDropdownAbierto(true);
    if (domicilio.localidad_id) {
      setDomicilio((p) => ({
        ...p,
        localidad_id: "",
        provincia_id: "",
        departamento_id: "",
      }));
      setUbicacionSeleccion({ provincia: "", departamento: "", localidad: "" });
    }
  };

  const handleDomicilioDesconocidoChange = (checked) => {
    setDomicilioDesconocido(checked);
    if (checked) setStep(3);
  };

  // "Cambiar" del breadcrumb (antes onClick inline):
  // FIX: también limpia *_nombre. Antes quedaban con el valor de la localidad
  // anterior y el Paso 3 podía guardar esa calle sin localidad.
  const handleCambiarUbicacion = () => {
    setUbicacionSeleccion({ provincia: "", departamento: "", localidad: "" });
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
      calle_nombre: "", // FIX
      calle_entre_1_id: "",
      calle_entre_1_nombre: "", // FIX
      calle_entre_2_id: "",
      calle_entre_2_nombre: "", // FIX
      numero: "",
      piso: "",
      unidad: "",
      torre: "",
      codigo_postal: "",
    }));
    resetCalles();
    setStep(1);
  };

  // Un solo par de setters por campo de calle (calle | calle_entre_1 | calle_entre_2)
  const setTextoDeCalle = {
    calle: setQ,
    calle_entre_1: setQEntre1,
    calle_entre_2: setQEntre2,
  };

  const handleCalleTextoChange = (campo, valor) => {
    setTextoDeCalle[campo](valor);
    setDomicilio((p) => ({
      ...p,
      [`${campo}_id`]: "",
      [`${campo}_nombre`]: valor,
    }));
  };

  const handleCalleSelect = (campo, calle) => {
    setTextoDeCalle[campo](calle.nombre);
    setDomicilio((p) => ({
      ...p,
      [`${campo}_id`]: calle.id,
      [`${campo}_nombre`]: calle.nombre,
    }));
  };

  const handleCalleClear = (campo) => {
    setTextoDeCalle[campo]("");
    setDomicilio((p) => ({
      ...p,
      [`${campo}_id`]: "",
      [`${campo}_nombre`]: "",
    }));
  };

  const handleFieldChange = (key, valor) =>
    setDomicilio((p) => ({ ...p, [key]: valor }));

  const handleObservacionesChange = (valor) =>
    setDomicilio((p) => ({ ...p, observaciones: valor }));

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

  // Cancela la edición y restaura los datos originales del snapshot
  const handleCancelEdit = () => {
    const snap = originalDataRef.current;
    if (snap) {
      setDomicilio({ ...snap.domicilio });
      setDomicilioDesconocido(snap.domicilioDesconocido);
      setPaisTipo(snap.paisTipo);
      setUbicacionSeleccion({ ...snap.ubicacionSeleccion });
      setQLocalidad(snap.qLocalidad);
      setQ(snap.q);
      setQEntre1(snap.qEntre1);
      setQEntre2(snap.qEntre2);

      // Si el usuario había cambiado el país a extranjero, la cascada quedó
      // vacía: la recargamos desde el snapshot para que los selects tengan datos.
      if (snap.domicilio.nacion_id)
        handleNacionChange(snap.domicilio.nacion_id);
      if (snap.domicilio.provincia_id)
        loadDepartamentos(snap.domicilio.provincia_id);
      if (snap.domicilio.departamento_id)
        loadLocalidades(snap.domicilio.departamento_id);
    }
    setModoUbicacion(
      modoUbicacionPara(snap?.domicilio, snap?.domicilioDesconocido),
    );
    setStep(domicilioDesconocido ? 3 : 1);
    setIsEditing(false);
  };

  // Pasa a modo edición con el paso y el modo de ubicación que corresponden
  const entrarModoEdicion = () => {
    setIsEditing(true);
    setModoUbicacion(modoUbicacionPara(domicilio, domicilioDesconocido));
    setStep(domicilioDesconocido ? 3 : 1);
  };

  const handleSave = async () => {
    if (!personaId) return;
    setErrorGuardado("");
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
      setErrorGuardado(
        parseError(
          err,
          "No se pudo guardar el domicilio. Reintentá en unos segundos.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  // Breadcrumb compartido por el Paso 1 y el Paso 2
  const renderBreadcrumbUbicacion = () => (
    <DomicilioBreadcrumbUbicacion
      domicilio={domicilio}
      domicilioDesconocido={domicilioDesconocido}
      esExtranjero={esExtranjero}
      paisTipo={paisTipo}
      nacions={nacions}
      ubicacionSeleccion={ubicacionSeleccion}
      onCambiarUbicacion={handleCambiarUbicacion}
    />
  );

  if (!isOpen || !personaId) return null;

  const personaNombre =
    persona?.apellido || persona?.nombre
      ? `${persona.apellido ?? ""}, ${persona.nombre ?? ""}`
          .replace(/^,\s*|,\s*$/, "")
          .trim()
      : null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-secondary-900/60 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="domicilio-modal-title"
    >
      <div className="h-[90vh] max-h-[min(900px,calc(100dvh_-_2rem))] min-h-[min(560px,calc(100dvh_-_2rem))] w-full max-w-4xl overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border border-secondary-100 animate-scaleIn">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 px-8 py-5">
          {/* Acciones de la derecha: toggle Lectura/Edición + cerrar */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {hasExistingDomicilio && (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    handleCancelEdit();
                  } else {
                    entrarModoEdicion();
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm ${
                  isEditing
                    ? "bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-300/40"
                    : "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                }`}
                title={
                  isEditing
                    ? "Volver al modo lectura descartando cambios"
                    : "Modificar los datos del domicilio"
                }
              >
                {isEditing ? (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Modo Lectura
                  </>
                ) : (
                  <>
                    <Pencil className="w-3.5 h-3.5" /> Editar Domicilio
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Ícono alusivo al domicilio: siempre visible como identidad del modal */}
            <div className="w-12 h-12 shrink-0 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
              <Home className="w-6 h-6" />
            </div>
            {/* Foto de la persona: se muestra además del ícono, solo si existe */}
            {persona?.foto_url && (
              <img
                src={persona.foto_url}
                crossOrigin="use-credentials"
                alt="Foto de perfil"
                className="w-12 h-12 shrink-0 rounded-full object-cover border-2 border-white shadow-md"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="domicilio-modal-title"
                  className="text-xl font-black text-white truncate max-w-[620px]"
                >
                  {personaNombre ? `Domicilio · ${personaNombre}` : "Domicilio"}
                </h2>
                {hasExistingDomicilio && (
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                      isEditing
                        ? "bg-amber-500/30 text-amber-200 border-amber-400/40"
                        : "bg-emerald-500/30 text-emerald-200 border-emerald-400/40"
                    }`}
                  >
                    {isEditing ? "Editando" : "Solo Lectura"}
                  </span>
                )}
              </div>
              <p className="text-white/80 text-sm font-medium">
                {isEditing
                  ? "Completá los pasos para actualizar los datos"
                  : "Ficha de residencia y localización"}
              </p>
            </div>
          </div>
        </div>

        {/* Stepper: solo visible mientras se edita */}
        {isEditing && (
          <Stepper
            etapas={ETAPAS}
            step={step}
            esAlcanzable={esPasoAlcanzable}
            onSelect={irAPaso}
            mensajeBloqueado="Elegí una localidad para completar Calles y Vivienda"
          />
        )}

        {/* Cuerpo scrolleable */}

        <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6">
          {errorVisible && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-fadeIn"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorVisible}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorGuardado("");
                  setErrorCarga({ personaId, mensaje: "" });
                }}
                aria-label="Descartar error"
                className="text-red-400 hover:text-red-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {estaCargando ? (
            /* Loader centrado inicial */
            <div className="h-full min-h-[340px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">
                Cargando datos del domicilio…
              </p>
            </div>
          ) : !isEditing ? (
            <DomicilioLecturaView
              domicilio={domicilio}
              nacions={nacions}
              provincias={provincias}
              departamentos={departamentos}
              localidades={localidades}
              ubicacionSeleccion={ubicacionSeleccion}
              q={q}
              qEntre1={qEntre1}
              qEntre2={qEntre2}
              domicilioDesconocido={domicilioDesconocido}
              esExtranjero={esExtranjero}
              onEditar={entrarModoEdicion}
            />
          ) : (
            <div key={step} className="animate-fadeIn">
              {step === 1 && (
                <DomicilioPasoUbicacion
                  domicilio={domicilio}
                  domicilioDesconocido={domicilioDesconocido}
                  onDomicilioDesconocidoChange={
                    handleDomicilioDesconocidoChange
                  }
                  paisTipo={paisTipo}
                  onPaisTipoChange={onPaisTipoChange}
                  nacionsSinArgentina={nacionsSinArgentina}
                  onNacionChange={onNacionChange}
                  modoUbicacion={modoUbicacion}
                  setModoUbicacion={setModoUbicacion}
                  omniboxRef={omniboxRef}
                  qLocalidad={qLocalidad}
                  onQLocalidadChange={handleQLocalidadChange}
                  buscandoLocalidades={buscandoLocalidades}
                  dropdownAbierto={dropdownAbierto}
                  setDropdownAbierto={setDropdownAbierto}
                  localidadesSearch={localidadesSearch}
                  onSelectOmnibox={onSelectOmnibox}
                  provincias={provincias}
                  departamentos={departamentos}
                  localidades={localidades}
                  ubicacionSeleccion={ubicacionSeleccion}
                  onProvinciaChange={onProvinciaChange}
                  onDepartamentoChange={onDepartamentoChange}
                  onLocalidadChange={onLocalidadChange}
                  renderBreadcrumbUbicacion={renderBreadcrumbUbicacion}
                />
              )}

              {step === 2 && (
                <DomicilioPasoCalles
                  domicilio={domicilio}
                  domicilioDesconocido={domicilioDesconocido}
                  textos={{ principal: q, entre1: qEntre1, entre2: qEntre2 }}
                  busquedas={{
                    principal: searchPrincipal,
                    entre1: searchEntre1,
                    entre2: searchEntre2,
                  }}
                  onCalleTextoChange={handleCalleTextoChange}
                  onCalleSelect={handleCalleSelect}
                  onCalleClear={handleCalleClear}
                  onFieldChange={handleFieldChange}
                  renderBreadcrumbUbicacion={renderBreadcrumbUbicacion}
                />
              )}

              {step === 3 && (
                <DomicilioPasoResumen
                  domicilio={domicilio}
                  onObservacionesChange={handleObservacionesChange}
                  nacions={nacions}
                  provincias={provincias}
                  departamentos={departamentos}
                  localidades={localidades}
                  ubicacionSeleccion={ubicacionSeleccion}
                  q={q}
                  qEntre1={qEntre1}
                  qEntre2={qEntre2}
                  domicilioDesconocido={domicilioDesconocido}
                  esExtranjero={esExtranjero}
                  esGeoParcial={esGeoParcial}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEditing ? (
          /* Footer en Modo Lectura */
          <div className="px-8 py-4 border-t border-secondary-100 bg-white flex items-center justify-between mt-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={entrarModoEdicion}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg active:scale-[0.98]"
            >
              <Pencil className="w-4 h-4" /> Modificar Domicilio
            </button>
          </div>
        ) : (
          /* Footer en Modo Edición (el habitual del Stepper) */
          <div className="px-8 py-4 border-t border-secondary-100 bg-white flex items-center gap-3 mt-auto shrink-0">
            {hasExistingDomicilio && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-5 py-3 border border-secondary-200 text-secondary-600 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-50"
              >
                Cancelar Edición
              </button>
            )}
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
                onClick={irAnterior}
                className="px-5 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest"
              >
                <ChevronLeft className="w-4 h-4 inline mr-1" /> Anterior
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={irSiguiente}
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
        )}
      </div>
    </div>
  );
}
