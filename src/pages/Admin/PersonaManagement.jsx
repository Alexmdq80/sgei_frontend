import { useState, useEffect, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  UserPlus,
  Search,
  Eye,
  Pencil,
  Link,
  Link2Off,
  Loader2,
  Mail,
  ShieldCheck,
  X,
  User,
  Trash2,
  SlidersHorizontal,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  IdCard,
  Shield,
  Camera,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";  
import { useAuth } from "../../context/AuthContext";
import { parseError } from "../../utils/errorParser";
import personaService from "../../services/personaService";
import documentoTipoService from "../../services/documentoTipoService";
import sexoService from "../../services/sexoService";
import generoService from "../../services/generoService";
import documentoSituacionService from "../../services/documentoSituacionService";
import nacionService from "../../services/nacionService";
import geografiaService from "../../services/geografiaService";
import ConfirmUnlinkUserModal from "../../components/ConfirmUnlinkUserModal";
import ConfirmationModal from "../../components/ConfirmationModal";

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  if (!imageSrc) {
    throw new Error("No hay imagen para recortar.");
  }
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo obtener el contexto de dibujo 2D.");
  }
  const crop =
    pixelCrop && typeof pixelCrop.x === "number"
      ? pixelCrop
      : { x: 0, y: 0, width: 100, height: 100 };
  const TARGET_SIZE = 512;
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE,
  );
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], "foto_cropped.jpg", {
          type: "image/jpeg",
        });
        resolve(file);
      },
      "image/jpeg",
      0.85,
    );
  });
}

/**
 * Componente para la gestión integral del Padrón de Personas (Agentes).
 */
export default function PersonaManagement() {
  const { user: authUser, showNotification } = useAuth();

  // Jerarquía de Roles para Gestión de Personas
  const isSuperUser =
    authUser?.roles?.some((r) => r.name === "superuser") ||
    authUser?.es_administrador;
  const isConduccion = authUser?.roles?.some((r) =>
    ["director", "vicedirector", "secretario", "prosecretario"].includes(
      r.name,
    ),
  );

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
  const [filterHasUser, setFilterHasUser] = useState(""); // '' | 'con' | 'sin'
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

  // Estados de Roles Administrativos (Hierarchy Rules)

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

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Catálogos
  const [docSituaciones, setDocSituaciones] = useState([]);
  const [nacions, setNacions] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [localidades, setLocalidades] = useState([]);

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
          filterHasUser === "con"
            ? true
            : filterHasUser === "sin"
              ? false
              : undefined,
        sort_by: sortConfig.key,
        order: sortConfig.direction,
        page,
        per_page: 10,
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

  const fetchProvincias = async () => {
    try {
      const r = await geografiaService.getProvincias();
      setProvincias(r?.data?.data || r?.data || r || []);
    } catch (error) {
      console.error("Error al cargar provincias:", error);
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
    fetchProvincias();
    fetchPersonas();
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

  // Búsqueda-as-you-type con debounce (400ms), mínimo 2 caracteres
  // y reseteo inmediato al borrar todo el input.
  const searchTimerRef = useRef(null);
  const prevSearchRef = useRef(searchTerm);
  useEffect(() => {
    const trimmed = searchTerm.trim();
    const prevTrimmed = prevSearchRef.current.trim();
    prevSearchRef.current = searchTerm;

    if (trimmed.length === 0 && prevTrimmed.length > 0) {
      fetchPersonasRef.current(1);
      return;
    }

    if (trimmed.length < 2) return;

    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null;
      fetchPersonasRef.current(1);
    }, 400);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Limpiar el timer pendiente para evitar ejecuciones desfasadas
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

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-secondary-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
      );
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary-600 ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary-600 ml-1" />
    );
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

  const refreshSelectedPersona = async (id) => {
    try {
      const response = await personaService.getById(id || selectedPersona.id);
      setSelectedPersona(response.data);
      return response.data;
    } catch (error) {
      console.error("Error al refrescar detalles de la persona:", error);
    }
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
          fetchPersonas(pagination.current_page);
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

    // Traemos el detalle completo (que ya viene con todas las relaciones)
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

    // Precargar cascada geográfica en edición
    if (full.provincia_id) {
      try {
        const r = await geografiaService.getDepartamentos(full.provincia_id);
        setDepartamentos(r?.data?.data || r?.data || r || []);
      } catch (e) {
        console.error("Error al precargar departamentos:", e);
      }
    }
    if (full.departamento_id) {
      try {
        const r = await geografiaService.getLocalidades(full.departamento_id);
        setLocalidades(r?.data?.data || r?.data || r || []);
      } catch (e) {
        console.error("Error al precargar localidades:", e);
      }
    }

    setFotoPreview(full.foto_url || null);
    setFotoFile(null);
    setCurrentStep(1);
    setIsCreateModalOpen(true);
  };

  const setFormValue = (field, value) => {
    setPersonaFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Interruptor de estado de vida
  const esFallecida = Number(personaFormData.vive_si) === 0;

  const todasLasEtapas = [
    { n: 1, label: "Identidad", Icon: User },
    { n: 2, label: "Documento", Icon: IdCard },
    { n: 3, label: "Nacimiento", Icon: MapPin },
    { n: 4, label: "Contacto y Resumen", Icon: CheckCircle2 },
  ];
  const etapasVisibles = esFallecida
    ? todasLasEtapas.filter((s) => s.n <= 2)
    : todasLasEtapas;

  const handleViveChange = (checked) => {
    setFormValue("vive_si", checked ? 1 : 0);
    if (!checked && currentStep > 2) setCurrentStep(1);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValue(name, value);
  };

  const handleProvinciaChange = async (e) => {
    const value = e.target.value;
    setFormValue("provincia_id", value);
    setDepartamentos([]);
    setLocalidades([]);
    setFormValue("departamento_id", "");
    setFormValue("localidad_id", "");
    if (!value) return;
    try {
      const r = await geografiaService.getDepartamentos(value);
      setDepartamentos(r?.data?.data || r?.data || r || []);
    } catch (error) {
      console.error("Error al cargar departamentos:", error);
    }
  };

  const handleDepartamentoChange = async (e) => {
    const value = e.target.value;
    setFormValue("departamento_id", value);
    setLocalidades([]);
    setFormValue("localidad_id", "");
    if (!value) return;
    try {
      const r = await geografiaService.getLocalidades(value);
      setLocalidades(r?.data?.data || r?.data || r || []);
    } catch (error) {
      console.error("Error al cargar localidades:", error);
    }
  };

  // Si la situación NO posee DNI → limpiamos los campos de documento/CUIL
  const situacionNoPoseeDoc = docSituaciones.find(
    (s) => String(s.id) === String(personaFormData.documento_situacion_id),
  );
  const esIndocumentado = String(personaFormData.documento_tipo_id) === "7";
  const tipoDoc = docTipos.find(
    (t) => String(t.id) === String(personaFormData.documento_tipo_id),
  );
  const etiquetaNumeroDocumento = !tipoDoc
    ? "Número de Documento"
    : /dni/i.test(tipoDoc.nombre)
      ? "Nº de DNI"
      : /cpi/i.test(tipoDoc.nombre)
        ? "Nº de CPI"
        : /extranjero/i.test(tipoDoc.nombre)
          ? "Nº de Documento Extranjero"
          : /pasaporte/i.test(tipoDoc.nombre)
            ? "Nº de Pasaporte"
            : "Nº de Documento";

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
      setFotoPreview(URL.createObjectURL(croppedFile));
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
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
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
    if (!video || !cameraStream) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], "foto_camera.jpg", {
          type: "image/jpeg",
        });
        setFotoFile(file);
        setFotoPreview(URL.createObjectURL(file));
        setShowCameraModal(false);
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleDeleteFoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
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
    setDepartamentos([]);
    setLocalidades([]);
    setFotoPreview(null);
    setFotoFile(null);
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
    }
  };

  const handleTipoDocumentoChange = (e) => {
    const value = e.target.value;
    setFormValue("documento_tipo_id", value);
    if (String(value) === "7") {
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
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    const max = esFallecida ? 2 : 4;
    setCurrentStep((s) => Math.min(s + 1, max));
  };

  const handlePrevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleSubmitPersona = async (e) => {
    e.preventDefault();

    // Si no está en el último paso, solo avanza (evita guardar por "Enter" o clic prematuro)
    if (currentStep < etapasVisibles.length) {
      handleNextStep();
      return;
    }

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
    setConfirmationPending(null); // No se hace nada
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form
            onSubmit={handleSearch}
            className="flex gap-2 w-full sm:max-w-md"
          >
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o DNI..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-sm"
            >
              Buscar
            </button>
          </form>

          {/* Botones de Control de Filtros */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all shadow-sm ${
                activeFiltersCount > 0 || isFilterPanelOpen
                  ? "bg-primary-50 text-primary-700 border-primary-300 ring-2 ring-primary-100"
                  : "bg-white text-secondary-700 border-secondary-300 hover:bg-secondary-100"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-black bg-primary-600 text-white rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 border border-red-200 rounded-xl transition-all"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
        {/* Panel Desplegable de Filtros Avanzados */}
        {isFilterPanelOpen && (
          <div className="pt-4 border-t border-secondary-200 animate-fadeIn">
            <div className="p-4 bg-white rounded-2xl border border-secondary-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna 1: Documentación y Género */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-secondary-400 uppercase tracking-wider flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-primary-500" />{" "}
                  Documentación y Género
                </h4>
                <div className="space-y-2">
                  <select
                    value={filterDocTipoId}
                    onChange={(e) => setFilterDocTipoId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Todos los Tipos de Documento</option>
                    {docTipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterSexoId}
                    onChange={(e) => setFilterSexoId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Todos los Sexos</option>
                    {sexos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterGeneroId}
                    onChange={(e) => setFilterGeneroId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Todos los Géneros</option>
                    {generos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Columna 2: Padrón y Cuenta */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-secondary-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary-500" /> Padrón y
                  Cuenta
                </h4>
                <div className="space-y-2">
                  <select
                    value={filterHasUser}
                    onChange={(e) => setFilterHasUser(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="con">Con cuenta</option>
                    <option value="sin">Sin cuenta</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Pills de Filtros Activos */}
        {(filterDocTipoId ||
          filterSexoId ||
          filterGeneroId ||
          filterHasUser) && (
          <div className="flex flex-wrap gap-2">
            {filterDocTipoId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold rounded-lg">
                Doc:{" "}
                {docTipos.find((t) => String(t.id) === String(filterDocTipoId))
                  ?.nombre || filterDocTipoId}
                <button
                  type="button"
                  onClick={() => setFilterDocTipoId("")}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterSexoId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold rounded-lg">
                Sexo:{" "}
                {sexos.find((s) => String(s.id) === String(filterSexoId))
                  ?.nombre || filterSexoId}
                <button
                  type="button"
                  onClick={() => setFilterSexoId("")}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterGeneroId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold rounded-lg">
                Género:{" "}
                {generos.find((g) => String(g.id) === String(filterGeneroId))
                  ?.nombre || filterGeneroId}
                <button
                  type="button"
                  onClick={() => setFilterGeneroId("")}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterHasUser === "con" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold rounded-lg">
                Con cuenta
                <button
                  type="button"
                  onClick={() => setFilterHasUser("")}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterHasUser === "sin" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold rounded-lg">
                Sin cuenta
                <button
                  type="button"
                  onClick={() => setFilterHasUser("")}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Listado */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
            <p className="text-secondary-500 font-medium italic">
              Cargando padrón...
            </p>
          </div>
        ) : personas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary-50 border-b border-secondary-200">
                <tr>
                  <th
                    onClick={() => handleSort("apellido")}
                    className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 transition-colors group"
                  >
                    <div className="flex items-center gap-1">
                      <span>Apellido y Nombre</span>
                      {renderSortIcon("apellido")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("documento_numero")}
                    className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 transition-colors group"
                  >
                    <div className="flex items-center gap-1">
                      <span>Documento</span>
                      {renderSortIcon("documento_numero")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("created_at")}
                    className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 transition-colors group"
                  >
                    <div className="flex items-center gap-1">
                      <span>Fecha de Registro</span>
                      {renderSortIcon("created_at")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                    Vinculación Usuario
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                    Administración
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {personas.map((persona) => (
                  <tr
                    key={persona.id}
                    className="hover:bg-secondary-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {persona.foto_url ? (
                          <img
                            src={persona.foto_url}
                            crossOrigin="use-credentials"
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border-2 border-white shadow-sm">
                            {(persona.apellido?.charAt(0) || "A").toUpperCase()}
                            {(persona.nombre?.charAt(0) || "").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-black text-secondary-900 uppercase">
                            {persona.apellido}
                          </p>
                          <p className="text-xs text-secondary-500 font-bold uppercase">
                            {persona.nombre}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-secondary-700 bg-secondary-100 px-2 py-1 rounded">
                        {persona.documento_tipo?.nombre}{" "}
                        {persona.documento_numero}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-secondary-600">
                        {persona.created_at
                          ? new Date(persona.created_at).toLocaleDateString()
                          : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {persona.usuario_email ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-xs font-bold text-secondary-800">
                              {persona.usuario_email}
                            </span>
                          </div>
                          {isSuperUser && (
                            <button
                              onClick={() => handleUnlinkUser(persona.id)}
                              disabled={isLinkingUser === persona.id}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all border border-red-100 group"
                              title="Desvincular Usuario"
                            >
                              {isLinkingUser === persona.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Link2Off className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-secondary-400 italic">
                            <span className="w-2 h-2 bg-secondary-300 rounded-full"></span>
                            <span className="text-xs font-medium">
                              Sin cuenta
                            </span>
                          </div>
                          {isSuperUser && (
                            <button
                              onClick={() => handleLinkUser(persona.id)}
                              disabled={isLinkingUser === persona.id}
                              className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-lg transition-all border border-primary-100 group"
                              title="Buscar y Vincular Usuario por DNI e Email"
                            >
                              {isLinkingUser === persona.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Link className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {persona.roles?.length ? (
                          persona.roles.map((role) => (
                            <span
                              key={role.id ?? role.name}
                              className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-black uppercase rounded shadow-sm"
                            >
                              {role.name.replace("_", " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-secondary-400 font-medium italic">
                            Sin roles administrativos.
                          </span>
                        )}
                        {persona.escuelas_personas?.map((ep) => (
                          <span
                            key={ep.id}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded border border-indigo-100 shadow-sm"
                            title={ep.escuela?.nombre}
                          >
                            {ep.role?.name?.replace("_", " ")}:{" "}
                            {ep.escuela?.nombre?.length > 20
                              ? ep.escuela.nombre.substring(0, 17) + "..."
                              : ep.escuela?.nombre}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeletePersona(persona)}
                          className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar del Padrón"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleViewPersona(persona.id)}
                          disabled={isFetchingDetails}
                          className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Visualizar Registro"
                        >
                          {isFetchingDetails ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditPersona(persona)}
                          className="p-2 text-secondary-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar Registro"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center text-secondary-500 font-bold italic">
            No se encontraron registros en el padrón.
          </div>
        )}

        {/* Paginación */}
        {pagination.last_page > 1 && (
          <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
            <p className="text-xs text-secondary-500 font-bold">
              Total: {pagination.total} personas
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.current_page === 1}
                onClick={() => fetchPersonas(pagination.current_page - 1)}
                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                Página {pagination.current_page} de {pagination.last_page}
              </span>
              <button
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchPersonas(pagination.current_page + 1)}
                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLES */}
      {isDetailsModalOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
              <div>
                <h2 className="text-xl font-black text-secondary-900 uppercase">
                  Detalle de la Persona
                </h2>
                <p className="text-xs text-secondary-500 font-bold tracking-widest mt-0.5 uppercase">
                  Identificador de Padrón: {selectedPersona.id}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none"
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
                  {selectedPersona.foto_url && (
                    <div className="flex -mt-2">
                      <img
                        src={selectedPersona.foto_url}
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
                        {selectedPersona.nombre_completo}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        Documento
                      </p>
                      <p className="text-sm font-bold text-secondary-900 uppercase">
                        {selectedPersona.documento_tipo_nombre}:{" "}
                        {selectedPersona.documento_numero}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seguridad y Vinculación */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-secondary-100 pb-2">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest">
                      Seguridad y Vinculación
                    </h3>
                  </div>
                  <div className="p-6 bg-green-50/50 border border-green-100 rounded-2xl">
                    {selectedPersona.usuario_email ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                            Cuenta de Usuario Vinculada
                          </p>
                          <p className="text-sm font-black text-secondary-900 mt-1">
                            {selectedPersona.usuario_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!selectedPersona.usuario?.email_verified_at && (
                            <button
                              onClick={() =>
                                handleResendActivation(selectedPersona.id)
                              }
                              disabled={isLinkingUser === selectedPersona.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors"
                              title="Reenviar correo de activación"
                            >
                              {isLinkingUser === selectedPersona.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              Reenviar Invitación
                            </button>
                          )}
                          <span
                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${selectedPersona.usuario?.email_verified_at ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                          >
                            {selectedPersona.usuario?.email_verified_at
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
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-lg"
                  >
                    Cerrar Vista
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col border border-secondary-100">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 px-8 py-5">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-black border-2 border-white/40 shadow-lg">
                  {personaFormData.apellido?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    {isEditMode ? "Modificar Registro" : "Registrar Persona"}
                  </h2>
                  <p className="text-white/80 text-sm font-medium">
                    {isEditMode
                      ? `${personaFormData.apellido}, ${personaFormData.nombre}`
                      : "Alta en el Padrón"}
                  </p>
                </div>
              </div>
            </div>
            {/* Estado de Vida */}
            <div className="px-8 py-3 border-b border-secondary-100 bg-white flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-secondary-700 uppercase">Estado de Vida</p>
                <p className="text-[10px] text-secondary-500 font-medium">
                  {esFallecida
                    ? "Persona fallecida: solo se registran datos de identidad."
                    : "Persona con vida: se registran todos los datos."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-black uppercase ${esFallecida ? "text-red-600" : "text-green-600"}`}>
                  {esFallecida ? "Fallecido/a" : "Con vida"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!esFallecida}
                    onChange={(e) => handleViveChange(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-secondary-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
            {/* Stepper */}
            <div className="px-8 py-4 border-b border-secondary-100 bg-secondary-50/50">
              <div className="flex items-center">
                {etapasVisibles.map(({ n, label, Icon }, idx) => (
                  <div
                    key={n}
                    className="flex items-center flex-1 last:flex-none"
                  >
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                          currentStep === n
                            ? "bg-primary-600 border-primary-600 text-white shadow-lg scale-110"
                            : currentStep > n
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-white border-secondary-300 text-secondary-400"
                        }`}
                      >
                        {currentStep > n ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          currentStep === n
                            ? "text-primary-700"
                            : "text-secondary-400"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                     {idx < etapasVisibles.length - 1 && (   
                      <div
                          className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                          currentStep > n ? "bg-green-500" : "bg-secondary-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleSubmitPersona}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                  if (currentStep < etapasVisibles.length) {
                    e.preventDefault();
                    handleNextStep();
                  }
                }
              }}
              className="overflow-y-auto flex-1 p-6 space-y-6"
            >
              {/* STEP 1: IDENTIDAD */}
              {currentStep === 1 && (
                <section>
                  <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> Datos de Identidad
                  </h3>
{!esFallecida && (
                  <div className="mb-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <input
                        type="file"
                        ref={fotoInputRef}
                        onChange={handleFotoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary-100 shadow-lg bg-secondary-100 flex items-center justify-center">
                        {fotoPreview ? (
                          <img
                            src={fotoPreview}
                            crossOrigin="use-credentials"
                            alt="Foto de perfil"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary-600 font-black text-4xl">
                            {(
                              personaFormData.apellido?.charAt(0) || "?"
                            ).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fotoInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" /> Subir Archivo
                      </button>
                      <button
                        type="button"
                        onClick={handleTakePhoto}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                      >
                        <Camera className="w-4 h-4" /> Tomar Foto
                      </button>
                      {fotoPreview && (
                        <button
                          type="button"
                          onClick={handleDeleteFoto}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
)}
                  {isEditMode && isEmailLocked && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                      Esta persona tiene un usuario vinculado. Los campos DNI y
                      Email están bloqueados para preservar la integridad del
                      vínculo.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        value={personaFormData.apellido}
                        onChange={(e) =>
                          setFormValue("apellido", e.target.value.toUpperCase())
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        value={personaFormData.nombre}
                        onChange={(e) =>
                          setFormValue("nombre", e.target.value.toUpperCase())
                        }
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Nombre Alternativo / Social
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 uppercase focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        value={personaFormData.nombre_alternativo}
                        onChange={(e) =>
                          setFormValue(
                            "nombre_alternativo",
                            e.target.value.toUpperCase(),
                          )
                        }
                      />
                    </div>
                 {!esFallecida && (
                    <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Sexo
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                        value={personaFormData.sexo_id}
                        onChange={handleInputChange}
                        name="sexo_id"
                      >
                        <option value="">Seleccionar...</option>
                        {sexos.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Género
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                        value={personaFormData.genero_id}
                        onChange={handleInputChange}
                        name="genero_id"
                      >
                        <option value="">Seleccionar...</option>
                        {generos.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    </>
                  )}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Nacionalidad
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                        value={personaFormData.nacionalidad_nacion_id}
                        onChange={handleInputChange}
                        name="nacionalidad_nacion_id"
                      >
                        <option value="">Seleccionar...</option>
                        {nacions.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
{!esFallecida && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                        value={personaFormData.nacimiento_fecha}
                        onChange={handleInputChange}
                        name="nacimiento_fecha"
                      />
                    </div>
)}
                  </div>
                </section>
              )}

              {/* STEP 2: DOCUMENTACIÓN Y CUIL */}
              {currentStep === 2 && (
                <section>
                  <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                    <IdCard className="w-4 h-4" /> Documentación y CUIL
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{!esFallecida && (
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Situación del Documento
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                        value={personaFormData.documento_situacion_id}
                        onChange={handleSituacionChange}
                      >
                        <option value="">Seleccionar...</option>
                        {docSituaciones.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
)}

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Tipo de Documento *
                      </label>
                      <select
                        disabled={isEmailLocked}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold ${
                          isEmailLocked
                            ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                            : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                        }`}
                        value={personaFormData.documento_tipo_id}
                        onChange={handleTipoDocumentoChange}
                      >
                        <option value="">Seleccionar...</option>
                        {docTipos.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {esIndocumentado ? (
                      <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs font-bold text-amber-700">
                          Persona registrada como INDOCUMENTADA. No se solicitan
                          número de documento, trámite ni CUIL.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                            {etiquetaNumeroDocumento}
                          </label>
                          <input
                            type="text"
                            disabled={isEmailLocked}
                            className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold ${
                              isEmailLocked
                                ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                                : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                            }`}
                            value={personaFormData.documento_numero}
                            onChange={handleInputChange}
                            name="documento_numero"
                          />
                        </div>
{!esFallecida && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                            Nº de Trámite
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                            value={personaFormData.tramite}
                            onChange={handleInputChange}
                            name="tramite"
                          />
                        </div>
)}
                        {!esFallecida && (
                        <div className="md:col-span-2 p-4 bg-secondary-50 border border-secondary-200 rounded-xl">
                          <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2 block">
                            CUIL
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={2}
                              placeholder="20"
                              className="w-16 px-3 py-2 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 text-center focus:ring-2 focus:ring-primary-500 outline-none"
                              value={personaFormData.CUIL_prefijo}
                              onChange={(e) =>
                                setFormValue(
                                  "CUIL_prefijo",
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                            />
                            <span className="text-secondary-400 font-black">
                              -{" "}
                            </span>
                            <input
                              type="text"
                              disabled={isEmailLocked}
                              placeholder="DNI"
                              className="flex-1 px-3 py-2 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 text-center focus:ring-2 focus:ring-primary-500 outline-none"
                              value={personaFormData.documento_numero}
                              onChange={handleInputChange}
                              name="documento_numero"
                            />
                            <span className="text-secondary-400 font-black">
                              -{" "}
                            </span>
                            <input
                              type="text"
                              maxLength={1}
                              placeholder="8"
                              className="w-14 px-3 py-2 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 text-center focus:ring-2 focus:ring-primary-500 outline-none"
                              value={personaFormData.CUIL_sufijo}
                              onChange={(e) =>
                                setFormValue(
                                  "CUIL_sufijo",
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                            />
                          </div>
                        </div>
)}
                      </>
                    )}
                  </div>
                </section>
              )}

              {/* STEP 3: LUGAR DE NACIMIENTO */}
              {!esFallecida && currentStep === 3 && (
                <section>
                  <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Lugar de Nacimiento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        País
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                        value={personaFormData.nacion_id}
                        onChange={handleInputChange}
                        name="nacion_id"
                      >
                        <option value="">Seleccionar...</option>
                        {nacions.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Provincia
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
                        value={personaFormData.provincia_id}
                        onChange={handleProvinciaChange}
                      >
                        <option value="">Seleccionar...</option>
                        {provincias.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Departamento
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                        value={personaFormData.departamento_id}
                        onChange={handleDepartamentoChange}
                        disabled={!personaFormData.provincia_id}
                      >
                        <option value="">Seleccionar...</option>
                        {departamentos.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Localidad
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                        value={personaFormData.localidad_id}
                        onChange={handleInputChange}
                        name="localidad_id"
                        disabled={!personaFormData.departamento_id}
                      >
                        <option value="">Seleccionar...</option>
                        {localidades.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              )}

              {/* STEP 4: CONTACTO Y RESUMEN */}
              {!esFallecida && currentStep === 4 && (
                <section className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Contacto y Resumen
                    </h3>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                        Email de Contacto
                      </label>
                      <input
                        type="email"
                        disabled={isEmailLocked}
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold lowercase ${
                          isEmailLocked
                            ? "bg-secondary-100 text-secondary-400 cursor-not-allowed"
                            : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                        }`}
                        value={personaFormData.email}
                        onChange={(e) =>
                          setFormValue("email", e.target.value.toLowerCase())
                        }
                      />
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-black text-secondary-500 uppercase tracking-widest flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Ficha de Resumen
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                          Nombre
                        </p>
                        <p className="font-black text-secondary-900 uppercase">
                          {personaFormData.apellido} {personaFormData.nombre}
                        </p>
                      </div>
                      {personaFormData.nombre_alternativo && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                            Nombre Social
                          </p>
                          <p className="font-bold text-secondary-900 uppercase">
                            {personaFormData.nombre_alternativo}
                          </p>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                          Documento
                        </p>
                        <p className="font-bold text-secondary-900 uppercase">
                          {personaFormData.documento_numero
                            ? `${personaFormData.documento_numero}`
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                          Sexo / Género
                        </p>
                        <p className="font-bold text-secondary-900 uppercase">
                          {sexos.find(
                            (s) =>
                              String(s.id) === String(personaFormData.sexo_id),
                          )?.nombre || "—"}{" "}
                          /{" "}
                          {generos.find(
                            (g) =>
                              String(g.id) ===
                              String(personaFormData.genero_id),
                          )?.nombre || "—"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                          Fecha de Nacimiento
                        </p>
                        <p className="font-bold text-secondary-900">
                          {personaFormData.nacimiento_fecha || "—"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                          Lugar de Nacimiento
                        </p>
                        <p className="font-bold text-secondary-900 uppercase">
                          {nacions.find(
                            (n) =>
                              String(n.id) ===
                              String(personaFormData.nacion_id),
                          )?.nombre || "—"}
                          {personaFormData.localidad_id && " · "}
                          {localidades.find(
                            (l) =>
                              String(l.id) ===
                              String(personaFormData.localidad_id),
                          )?.nombre || ""}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                          Email
                        </p>
                        <p className="font-bold text-secondary-900 lowercase">
                          {personaFormData.email || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Footer del Stepper */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all active:scale-[0.98]"
                >
                  Cancelar
                </button>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-secondary-300 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-100 transition-all active:scale-[0.98]"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                )}
                <div className="flex-1" />
                {currentStep < etapasVisibles.length ? (
                  <button
                    key="btn-next"
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-[0.98] shadow-lg"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    key="btn-submit"
                    type="submit"
                    disabled={isSavingPersona}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSavingPersona
                      ? "Guardando..."
                      : isEditMode
                        ? "Guardar Cambios"
                        : "Guardar Registro"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RECORTE DE FOTO */}
      {showCropModal && cropImageSrc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-secondary-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-secondary-700 uppercase tracking-widest">
                Recortar Foto
              </h3>
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-80 bg-secondary-900">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="px-6 py-4 space-y-3">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-xl font-bold uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCropConfirm}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-primary-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CÁMARA */}
      {showCameraModal && cameraStream && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-secondary-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-secondary-700 uppercase tracking-widest">
                Tomar Foto
              </h3>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-80 object-cover bg-secondary-900 scale-x-[-1]"
            />
            <div className="px-6 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-xl font-bold uppercase text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={captureFromCamera}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-primary-700"
              >
                Capturar
              </button>
            </div>
          </div>
        </div>
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
