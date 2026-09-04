import { useState, useEffect, useRef, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { parseError } from "../../../utils/errorParser";
import personaService from "../../../services/personaService";
import documentoTipoService from "../../../services/documentoTipoService";
import sexoService from "../../../services/sexoService";
import generoService from "../../../services/generoService";
import documentoSituacionService from "../../../services/documentoSituacionService";
import nacionService from "../../../services/nacionService";
import ConfirmUnlinkUserModal from "../../../components/ConfirmUnlinkUserModal";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { getCroppedImg, revokeObjectUrl } from "./utils/imageUtils";
import useGeografiaCascade from "./hooks/useGeografiaCascade";
import {
  DOC_TIPO_DNI,
  DOC_TIPO_INDOCUMENTADO,
  FILTER_HAS_USER_CON,
  FILTER_HAS_USER_SIN,
  SEARCH_DEBOUNCE_MS,
  PER_PAGE,
  MAX_STEP_VIVA,
  MAX_STEP_FALLECIDA,
} from "./utils/constants";
import PersonaFilters from "./components/PersonaFilters";
import PersonaTable from "./components/PersonaTable";
import PersonaDetailModal from "./components/PersonaDetailModal";
import PersonaFormModal from "./components/PersonaFormModal";
import PhotoCaptureModal from "./components/PhotoCaptureModal";
import PhotoCropModal from "./components/PhotoCropModal";
import { calcularEdad, EDAD_MAXIMA_ADMISIBLE } from "./utils/edad";

/**
 * Componente para la gestión integral del Padrón de Personas (Agentes).
 */
export default function PersonaManagement() {
  const { user: authUser, showNotification } = useAuth();

  // Jerarquía de Roles para Gestión de Personas
  const isSuperUser =
    authUser?.roles?.some((r) => r.name === "superuser") ||
    authUser?.es_administrador;

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

  // Estados de Filtros y Ordenamiento
  const [sortConfig, setSortConfig] = useState({
    key: "apellido",
    direction: "asc",
  });
  const [filterDocTipoId, setFilterDocTipoId] = useState("");
  const [filterSexoId, setFilterSexoId] = useState("");
  const [filterGeneroId, setFilterGeneroId] = useState("");
  const [filterHasUser, setFilterHasUser] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sexos, setSexos] = useState([]);
  const [generos, setGeneros] = useState([]);

  // Confirmación Modal (reemplaza window.confirm)
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    variant: "primary",
    onConfirm: () => {},
    showInput: false,
    inputPlaceholder: "",
    isLoading: false,
  });
  const closeConfirm = () =>
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));

  // Estados de Modales y Selección
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(null);
  const [editingPersonaId, setEditingPersonaId] = useState(null);
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  // Snapshot del formulario al abrir el modal (para detectar ediciones al cancelar)
  const personaFormSnapshotRef = useRef(null);

  // Estados de Carga Específicos
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [isLinkingUser, setIsLinkingUser] = useState(null);

  // Formulario
  const [personaFormData, setPersonaFormData] = useState({
    apellido: "",
    nombre: "",
    nombre_alternativo: "",
    sexo_id: "",
    genero_id: "",
    nacionalidad_nacion_id: "",
    nacimiento_fecha: "",
    documento_situacion_id: "",
    documento_tipo_id: "",
    documento_numero: "",
    tramite: "",
    CUIL_prefijo: "",
    CUIL_sufijo: "",
    nacion_id: "",
    provincia_id: "",
    departamento_id: "",
    localidad_id: "",
    email: "",
    vive_si: 1,
  });

  // Stepper
  const [currentStep, setCurrentStep] = useState(1);

  // Estados de Foto de Perfil (Subida / cámara / recorte)
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fotoInputRef = useRef(null);
  const videoRef = useRef(null);
  const fotoPreviewRef = useRef(null);

  // Catálogos geográficos
  const {
    provincias,
    departamentos,
    localidades,
    loadDepartamentos,
    loadLocalidades,
    clearCascade,
    handleProvinciaChange,
    handleDepartamentoChange,
  } = useGeografiaCascade();
  const [docSituaciones, setDocSituaciones] = useState([]);
  const [nacions, setNacions] = useState([]);

  // Gestión de memoria de blobs de foto
  const updateFotoPreview = (newPreview) => {
    if (fotoPreviewRef.current && fotoPreviewRef.current !== newPreview) {
      revokeObjectUrl(fotoPreviewRef.current);
    }
    fotoPreviewRef.current = newPreview;
    setFotoPreview(newPreview);
  };

  // 1. Apagar la cámara cuando cambie el stream
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // 2. Liberar el blob de la imagen únicamente al desmontar PersonaManagement
  useEffect(() => {
    return () => {
      revokeObjectUrl(fotoPreviewRef.current);
    };
  }, []);

  const fetchPersonas = async (page = 1) => {
    if (!canManage) return;
    try {
      setIsLoading(true);
      const response = await personaService.getAll({
        search: searchTerm,
        documento_tipo_id: filterDocTipoId || undefined,
        sexo_id: filterSexoId || undefined,
        genero_id: filterGeneroId || undefined,
        has_user:
          filterHasUser === FILTER_HAS_USER_CON
            ? true
            : filterHasUser === FILTER_HAS_USER_SIN
              ? false
              : undefined,
        sort_by: sortConfig.key,
        order: sortConfig.direction,
        page,
        per_page: PER_PAGE,
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

  const fetchDocSituaciones = async () => {
    try {
      const r = await documentoSituacionService.getAll();
      setDocSituaciones(r?.data?.data || r?.data || r || []);
    } catch (error) {
      console.error("Error al cargar situaciones de documento:", error);
    }
  };

  const fetchNaciones = async () => {
    try {
      const r = await nacionService.getAll({ per_page: 1000, search: "" });
      setNacions(r?.data?.data || r?.data || r || []);
    } catch (error) {
      console.error("Error al cargar naciones:", error);
    }
  };

  const fetchSexos = async () => {
    try {
      const r = await sexoService.getAll();
      setSexos(r.data || r || []);
    } catch (error) {
      console.error("Error al cargar sexos:", error);
    }
  };

  const fetchGeneros = async () => {
    try {
      const r = await generoService.getAll();
      setGeneros(r.data || r || []);
    } catch (error) {
      console.error("Error al cargar géneros:", error);
    }
  };

  useEffect(() => {
    fetchDocTipos();
    fetchSexos();
    fetchGeneros();
    fetchDocSituaciones();
    fetchNaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref para mantener la referencia más reciente de fetchPersonas
  const fetchPersonasRef = useRef(fetchPersonas);
  useEffect(() => {
    fetchPersonasRef.current = fetchPersonas;
  });

  // Refresca al cambiar filtros o el ordenamiento
  useEffect(() => {
    fetchPersonasRef.current(1);
  }, [
    filterDocTipoId,
    filterSexoId,
    filterGeneroId,
    filterHasUser,
    sortConfig,
  ]);

  // Búsqueda-as-you-type con debounce (400ms), mínimo 1 carácter
  // y reseteo inmediato al borrar todo el input (fix bug de 1 carácter).
  const searchTimerRef = useRef(null);
  const prevSearchRef = useRef(searchTerm);
  useEffect(() => {
    const trimmed = searchTerm.trim();
    const prevTrimmed = prevSearchRef.current.trim();
    prevSearchRef.current = searchTerm;

    if (trimmed.length === 0 && prevTrimmed.length > 0) {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      fetchPersonasRef.current(1);
      return;
    }

    if (trimmed.length === 0) return;

    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null;
      fetchPersonasRef.current(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    fetchPersonas(1);
  };

  /*--- LÓGICA DE ORDENAMIENTO ---*/
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const activeFiltersCount = [
    filterDocTipoId,
    filterSexoId,
    filterGeneroId,
    filterHasUser,
    searchTerm.trim(),
  ].filter((val) => val !== "" && val !== undefined && val !== null).length;

  const handleClearAllFilters = () => {
    setFilterDocTipoId("");
    setFilterSexoId("");
    setFilterGeneroId("");
    setFilterHasUser("");
    setSearchTerm("");
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

  const handleDeletePersona = (persona) => {
    setConfirmConfig({
      isOpen: true,
      title: "¿Eliminar persona?",
      message: `¿Estás seguro de que deseas eliminar a ${persona.nombre_completo} del padrón? Esta acción es irreversible.`,
      confirmText: "Eliminar",
      variant: "danger",
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          await personaService.delete(persona.id);
          showNotification("Registro eliminado con éxito.", "success");
          const nextPage =
            personas.length === 1 && pagination.current_page > 1
              ? pagination.current_page - 1
              : pagination.current_page;

          fetchPersonas(nextPage);
          closeConfirm();
        } catch (error) {
          console.error("Error al eliminar persona:", error);
          showNotification(
            parseError(error, "No se pudo eliminar el registro."),
            "error",
          );
          closeConfirm();
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleEditPersona = async (persona) => {
    setIsEditMode(true);
    setIsEmailLocked(!!persona.usuario_id);
    setEditingPersonaId(persona.id);

    let full = persona;
    try {
      const res = await personaService.getById(persona.id);
      full = res?.data ?? res ?? persona;
    } catch (error) {
      console.error("Error al cargar detalle para editar:", error);
    }

    setPersonaFormData({
      apellido: full.apellido ?? "",
      nombre: full.nombre ?? "",
      nombre_alternativo: full.nombre_alternativo ?? "",
      sexo_id: full.sexo_id ?? "",
      genero_id: full.genero_id ?? "",
      nacionalidad_nacion_id: full.nacionalidad_nacion_id ?? "",
      nacimiento_fecha: full.nacimiento_fecha ?? "",
      documento_situacion_id: full.documento_situacion_id ?? "",
      documento_tipo_id: full.documento_tipo_id ?? "",
      documento_numero: full.documento_numero ?? "",
      tramite: full.tramite ?? "",
      CUIL_prefijo: full.CUIL_prefijo ?? "",
      CUIL_sufijo: full.CUIL_sufijo ?? "",
      nacion_id: full.nacion_id ?? "",
      provincia_id: full.provincia_id ?? "",
      departamento_id: full.departamento_id ?? "",
      localidad_id: full.localidad_id ?? "",
      email: full.contacto?.email || full.usuario_email || "",
      vive_si: full.vive_si ?? 1,
    });

    personaFormSnapshotRef.current = {
      apellido: full.apellido ?? "",
      nombre: full.nombre ?? "",
      nombre_alternativo: full.nombre_alternativo ?? "",
      sexo_id: full.sexo_id ?? "",
      genero_id: full.genero_id ?? "",
      nacionalidad_nacion_id: full.nacionalidad_nacion_id ?? "",
      nacimiento_fecha: full.nacimiento_fecha ?? "",
      documento_situacion_id: full.documento_situacion_id ?? "",
      documento_tipo_id: full.documento_tipo_id ?? "",
      documento_numero: full.documento_numero ?? "",
      tramite: full.tramite ?? "",
      CUIL_prefijo: full.CUIL_prefijo ?? "",
      CUIL_sufijo: full.CUIL_sufijo ?? "",
      nacion_id: full.nacion_id ?? "",
      provincia_id: full.provincia_id ?? "",
      departamento_id: full.departamento_id ?? "",
      localidad_id: full.localidad_id ?? "",
      email: full.contacto?.email || full.usuario_email || "",
      vive_si: full.vive_si ?? 1,
    };

    if (full.provincia_id) {
      await loadDepartamentos(full.provincia_id);
    }
    if (full.departamento_id) {
      await loadLocalidades(full.departamento_id);
    }

    updateFotoPreview(full.foto_url || null);
    setFotoFile(null);
    setCurrentStep(1);
    setIsCreateModalOpen(true);
  };

  const setFormValue = (field, value) => {
    setPersonaFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreatePersona = () => {
    setIsEditMode(false);
    setIsEmailLocked(false);
    setEditingPersonaId(null);
    setPersonaFormData({
      apellido: "",
      nombre: "",
      nombre_alternativo: "",
      sexo_id: "",
      genero_id: "",
      nacionalidad_nacion_id: "",
      nacimiento_fecha: "",
      documento_situacion_id: "",
      documento_tipo_id: "",
      documento_numero: "",
      tramite: "",
      CUIL_prefijo: "",
      CUIL_sufijo: "",
      nacion_id: "",
      provincia_id: "",
      departamento_id: "",
      localidad_id: "",
      email: "",
      vive_si: 1,
    });
    personaFormSnapshotRef.current = {
      apellido: "",
      nombre: "",
      nombre_alternativo: "",
      sexo_id: "",
      genero_id: "",
      nacionalidad_nacion_id: "",
      nacimiento_fecha: "",
      documento_situacion_id: "",
      documento_tipo_id: "",
      documento_numero: "",
      tramite: "",
      CUIL_prefijo: "",
      CUIL_sufijo: "",
      nacion_id: "",
      provincia_id: "",
      departamento_id: "",
      localidad_id: "",
      email: "",
      vive_si: 1,
    };
    clearCascade();
    updateFotoPreview(null); // ← revoca el blob previo si existía
    setFotoFile(null); // ← igual que el original
    setCurrentStep(1);
    setIsCreateModalOpen(true);
  };

  const handleSituacionChange = (e) => {
    const value = e.target.value;
    setFormValue("documento_situacion_id", value);
    const situacion = docSituaciones.find(
      (s) => String(s.id) === String(value),
    );
    const noPosee = /no posee/i.test(situacion?.nombre || "");

    if (noPosee) {
      setFormValue("documento_tipo_id", "");
      setFormValue("documento_numero", "");
      setFormValue("tramite", "");
      setFormValue("CUIL_prefijo", "");
      setFormValue("CUIL_sufijo", "");
    } else if (situacion) {
      setFormValue("documento_tipo_id", DOC_TIPO_DNI);
    }
  };

  const handleTipoDocumentoChange = (e) => {
    const value = e.target.value;
    setFormValue("documento_tipo_id", value);
    if (String(value) === DOC_TIPO_INDOCUMENTADO) {
      setFormValue("documento_numero", "");
      setFormValue("tramite", "");
      setFormValue("CUIL_prefijo", "");
      setFormValue("CUIL_sufijo", "");
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (
          !personaFormData.apellido.trim() ||
          !personaFormData.nombre.trim()
        ) {
          showNotification("Debes completar Apellido y Nombre.", "error");
          return false;
        }
        return true;
      case 2: {
        const tipo = String(personaFormData.documento_tipo_id ?? "");
        const numero = String(personaFormData.documento_numero ?? "").trim();
        if (!tipo) {
          showNotification("Debes seleccionar el Tipo de Documento.", "error");
          return false;
        }
        if (tipo !== DOC_TIPO_INDOCUMENTADO && !numero) {
          showNotification("Debes cargar el Número de Documento.", "error");
          return false;
        }
        if (tipo === DOC_TIPO_DNI && numero.length < 7) {
          showNotification("El DNI debe tener entre 7 y 8 dígitos.", "error");
          return false;
        }
        return true;
      }
      case 3: {
        const fecha = String(personaFormData.nacimiento_fecha ?? "").trim();
        if (fecha) {
          const hoy = new Date();
          const hoyStr = hoy.toISOString().split("T")[0];
          if (fecha > hoyStr) {
            showNotification(
              "La fecha de nacimiento no puede ser futura.",
              "error",
            );
            return false;
          }
          if (fecha < "1900-01-01") {
            showNotification(
              "La fecha de nacimiento no puede ser anterior al año 1900.",
              "error",
            );
            return false;
          }
          const edad = calcularEdad(fecha);
          if (edad !== null && edad > EDAD_MAXIMA_ADMISIBLE) {
            showNotification("La edad no puede superar los 100 años.", "error");
            return false;
          }
        }
        return true;
      }
      default:
        return true;
    }
  };

  const esFallecida = Number(personaFormData.vive_si) === 0;
  const maxStep = esFallecida ? MAX_STEP_FALLECIDA : MAX_STEP_VIVA;

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(s + 1, maxStep));
  };

  const handlePrevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleViveChange = (checked) => {
    setFormValue("vive_si", checked ? 1 : 0);
    if (!checked && currentStep > 2) setCurrentStep(1);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValue(name, value);
  };

  const handleFotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setCropImageSrc(reader.result);
      setShowCropModal(true);
    });
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    try {
      const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      setFotoFile(croppedFile);
      updateFotoPreview(URL.createObjectURL(croppedFile));
      setShowCropModal(false);
    } catch (error) {
      console.error("Error al recortar imagen:", error);
      showNotification("No se pudo recortar la imagen.", "error");
    }
  };

  const handleTakePhoto = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showNotification(
        "Tu navegador no permite acceder a la cámara en sitios sin HTTPS. Accedé por localhost o habilitá SSL.",
        "error",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: "user" },
        audio: false,
      });
      setCameraStream(stream);
      setShowCameraModal(true);
    } catch (error) {
      let msg = "No se pudo acceder a la cámara.";
      if (error.name === "NotAllowedError") {
        msg =
          "Permiso denegado. Habilitá la cámara en la configuración del navegador.";
      } else if (error.name === "NotFoundError") {
        msg = "No se encontró ninguna cámara en este dispositivo.";
      }
      showNotification(msg, "error");
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setShowCameraModal(false);
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    // Agregamos chequeo de videoWidth para evitar imágenes vacías
    if (!video || !cameraStream || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // Opcional: espejar el canvas para que coincida con scale-x-[-1] del preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], "foto_camera.jpg", {
          type: "image/jpeg",
        });
        setFotoFile(file);
        updateFotoPreview(URL.createObjectURL(file));
        setShowCameraModal(false);
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      },
      "image/jpeg",
      0.9,
    );
  };

  // Detección de cambios en el formulario vs. el snapshot inicial
  // (incluye la foto de perfil: si hay un archivo nuevo seleccionado, cuenta como cambio)
  const hayCambiosEnFormulario = () => {
    const snapshot = personaFormSnapshotRef.current;
    if (!snapshot) return false;
    const hayCambiosEnCampos = Object.keys(snapshot).some(
      (key) =>
        String(personaFormData[key] ?? "") !== String(snapshot[key] ?? ""),
    );
    const hayFotoNueva = fotoFile !== null;
    return hayCambiosEnCampos || hayFotoNueva;
  };

  // Cierre del modal con confirmación si hubo ediciones
  const handleCloseCreate = () => {
    if (hayCambiosEnFormulario()) {
      setConfirmConfig({
        isOpen: true,
        title: "¿Descartar los cambios?",
        message:
          "El formulario tiene modificaciones sin guardar. Si continuás, se perderán los datos ingresados.",
        confirmText: "Descartar cambios",
        cancelText: "Continuar editando",
        variant: "warning",
        showInput: false,
        isLoading: false,
        onConfirm: () => {
          closeConfirm();
          setIsCreateModalOpen(false);
        },
      });
    } else {
      setIsCreateModalOpen(false);
    }
  };

  const handleDeleteFoto = () => {
    setFotoFile(null);
    updateFotoPreview(null);
  };

  const handleSubmitPersona = async (e) => {
    e.preventDefault();

    if (currentStep < (esFallecida ? 2 : 5)) {
      handleNextStep();
      return;
    }

    if (!validateStep(currentStep)) return;

    try {
      setIsSavingPersona(true);
      let savedId = editingPersonaId;
      if (isEditMode) {
        await personaService.update(editingPersonaId, personaFormData);
        showNotification(
          "Registro de persona actualizado con éxito.",
          "success",
        );
      } else {
        const res = await personaService.create(personaFormData);
        savedId = res?.data?.data?.id ?? res?.data?.id ?? res?.id;
        showNotification(
          "Persona registrada con éxito en el padrón.",
          "success",
        );
      }
      if (savedId && fotoFile) {
        const fd = new FormData();
        fd.append("foto", fotoFile);
        await personaService.uploadFoto(savedId, fd);
      }
      setIsCreateModalOpen(false);
      fetchPersonas(isEditMode ? pagination.current_page : 1);
    } catch (error) {
      if (error.isConfirmationRequired) {
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
    setConfirmationPending(null);
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

  const handleUnlinkUser = (personaId) => {
    setConfirmConfig({
      isOpen: true,
      title: "Desvincular Usuario",
      message:
        "¿Deseas desvincular el usuario de esta persona? Se revocarán sus roles y vínculos institucionales.",
      confirmText: "Desvincular",
      variant: "warning",
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          setIsLinkingUser(personaId);
          const response = await personaService.unlinkUser(personaId);
          showNotification(response.message, "success");
          fetchPersonas(pagination.current_page);
          closeConfirm();
        } catch (error) {
          console.error("Error al desvincular usuario:", error);
          showNotification(
            parseError(error, "No se pudo realizar la desvinculación."),
            "error",
          );
          closeConfirm();
        } finally {
          setIsLinkingUser(null);
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
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
      <PersonaFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchSubmit={handleSearch}
        isFilterPanelOpen={isFilterPanelOpen}
        onToggleFilterPanel={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
        activeFiltersCount={activeFiltersCount}
        onClearAllFilters={handleClearAllFilters}
        docTipos={docTipos}
        sexos={sexos}
        generos={generos}
        filterDocTipoId={filterDocTipoId}
        filterSexoId={filterSexoId}
        filterGeneroId={filterGeneroId}
        filterHasUser={filterHasUser}
        onFilterDocTipoIdChange={setFilterDocTipoId}
        onFilterSexoIdChange={setFilterSexoId}
        onFilterGeneroIdChange={setFilterGeneroId}
        onFilterHasUserChange={setFilterHasUser}
      />

      {/* Listado */}
      <PersonaTable
        personas={personas}
        isLoading={isLoading}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        onFetchPage={fetchPersonas}
        isSuperUser={isSuperUser}
        isLinkingUser={isLinkingUser}
        isFetchingDetails={isFetchingDetails}
        onView={handleViewPersona}
        onEdit={handleEditPersona}
        onDelete={handleDeletePersona}
        onLinkUser={handleLinkUser}
        onUnlinkUser={handleUnlinkUser}
      />

      {/* MODAL DE DETALLES */}
      {isDetailsModalOpen && selectedPersona && (
        <PersonaDetailModal
          persona={selectedPersona}
          isLinkingUser={isLinkingUser}
          onClose={() => setIsDetailsModalOpen(false)}
          onResendActivation={handleResendActivation}
        />
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isCreateModalOpen && (
        <PersonaFormModal
          isOpen={isCreateModalOpen}
          isEditMode={isEditMode}
          isEmailLocked={isEmailLocked}
          isSavingPersona={isSavingPersona}
          formData={personaFormData}
          currentStep={currentStep}
          catalogs={{
            sexos,
            generos,
            docTipos,
            docSituaciones,
            nacions,
            provincias,
            departamentos,
            localidades,
          }}
          fotoPreview={fotoPreview}
          fotoInputRef={fotoInputRef}
          onFieldChange={setFormValue}
          onFileChange={handleFotoUpload}
          onTakePhoto={handleTakePhoto}
          onDeleteFoto={handleDeleteFoto}
          onInputChange={handleInputChange}
          onViveChange={handleViveChange}
          onSituacionChange={handleSituacionChange}
          onTipoDocumentoChange={handleTipoDocumentoChange}
          onProvinciaChange={(value) => {
            setFormValue("provincia_id", value);
            setFormValue("departamento_id", "");
            setFormValue("localidad_id", "");
            handleProvinciaChange(value);
          }}
          onDepartamentoChange={(value) => {
            setFormValue("departamento_id", value);
            setFormValue("localidad_id", "");
            handleDepartamentoChange(value);
          }}
          onClose={handleCloseCreate}
          onSubmit={handleSubmitPersona}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
        />
      )}

      {/* MODAL DE RECORTE DE FOTO */}
      {showCropModal && cropImageSrc && (
        <PhotoCropModal
          isOpen={showCropModal && !!cropImageSrc}
          imageSrc={cropImageSrc}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          onClose={() => setShowCropModal(false)}
          onConfirm={handleCropConfirm}
        />
      )}

      {/* MODAL DE CÁMARA */}
      {showCameraModal && cameraStream && (
        <PhotoCaptureModal
          isOpen={showCameraModal && !!cameraStream}
          stream={cameraStream}
          videoRef={videoRef}
          onClose={handleCloseCamera}
          onCapture={captureFromCamera}
        />
      )}

      {/* MODAL CONFIRMACIÓN DESVINCULACIÓN POR CAMBIO DE EMAIL */}
      <ConfirmUnlinkUserModal
        isOpen={!!confirmationPending}
        onConfirm={handleConfirmUnlink}
        onCancel={handleCancelUnlink}
        context={confirmationPending?.context}
      />

      {/* MODAL DE CONFIRMACIÓN GLOBAL */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant={confirmConfig.variant}
        showInput={confirmConfig.showInput}
        inputPlaceholder={confirmConfig.inputPlaceholder}
        isLoading={confirmConfig.isLoading}
      />
    </div>
  );
}
