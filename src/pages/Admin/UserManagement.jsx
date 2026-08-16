import echo from "../../utils/echo";
import { useState, useEffect, useRef } from "react";
import {
  Eye,
  X,
  IdCard,
  Link,
  Link2Off,
  Loader2,
  MailCheck,
  SlidersHorizontal,
  RotateCcw,
  Building2,
  MapPin,
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { parseError } from "../../utils/errorParser";
import userService from "../../services/userService";
import documentoTipoService from "../../services/documentoTipoService";
import ConfirmationModal from "../../components/ConfirmationModal";
import UserDetailModal from "../../components/UserDetailModal";
import geografiaService from "../../services/geografiaService";

/**
 * Página de administración integral de usuarios.
 * Incluye el listado/CRUD de usuarios y la gestión de roles institucionales.
 */
const UserManagement = () => {
  const { user: authUser, showNotification } = useAuth();

  const isSuperUser =
    authUser?.es_administrador ||
    authUser?.roles?.some((r) => r.name === "superuser");
  const isJefeProvincial = authUser?.roles?.some(
    (r) => r.name === "jefe_provincial",
  );
  const isJefeRegional = authUser?.roles?.some(
    (r) => r.name === "jefe_regional",
  );
  const isJefeDistrital = authUser?.roles?.some(
    (r) => r.name === "jefe_distrital",
  );

  // Permiso de acceso global o por jefaturas
  const hasAccess =
    isSuperUser || isJefeProvincial || isJefeRegional || isJefeDistrital;

  // Estados para Usuarios
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [filterCueAnexo, setFilterCueAnexo] = useState("");
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const currentPageRef = useRef(pagination.current_page);

  const [processingId, setProcessingId] = useState(null);

  // Estado para Ordenamiento de Columnas
  const [sortConfig, setSortConfig] = useState({
    key: "nombre", // Columna por defecto
    direction: "asc", // 'asc' o 'desc'
  });

  // Catálogos
  const [docTipos, setDocTipos] = useState([]);

  // Estados para Formulario (Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Estados para Modal de Detalle
  const [detailUser, setDetailUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isLinkingPersona, setIsLinkingPersona] = useState(false);

  // Filtros geográficos
  const [filterProvinciaId, setFilterProvinciaId] = useState("");
  const [filterRegionId, setFilterRegionId] = useState("");
  const [filterDistritoId, setFilterDistritoId] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Filtros de estado de cuenta
  const [filterPasswordSet, setFilterPasswordSet] = useState("");
  const [filterEmailVerified, setFilterEmailVerified] = useState("");
  const [filterPersonaLinked, setFilterPersonaLinked] = useState("");

  // Catálogos geográficos
  const [provincias, setProvincias] = useState([]);
  const [regiones, setRegiones] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    documento_tipo_id: "",
    documento_numero: "",
  });

  const [initialFormData, setInitialFormData] = useState({});

  // Confirmación Modal
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

  const openConfirm = (config) => {
    setConfirmConfig({
      isOpen: true,
      title: config.title || "¿Estás seguro?",
      message: config.message || "",
      confirmText: config.confirmText || "Confirmar",
      cancelText: config.cancelText || "Cancelar",
      variant: config.variant || "primary",
      onConfirm: config.onConfirm,
      showInput: config.showInput || false,
      inputPlaceholder: config.inputPlaceholder || "",
      isLoading: false,
    });
  };

  // --- CARGA DE DATOS ---
  const fetchProvincias = async () => {
    try {
      const response = await geografiaService.getProvincias();
      setProvincias(response.data || response || []);
    } catch (error) {
      console.error("Error al cargar provincias:", error);
    }
  };

  const fetchRegiones = async (provinciaId) => {
    if (!provinciaId) {
      setRegiones([]);
      return;
    }
    try {
      const response = await geografiaService.getRegiones({
        provincia_id: provinciaId,
      });
      setRegiones(response.data || response || []);
    } catch (error) {
      console.error("Error al cargar regiones:", error);
      setRegiones([]);
    }
  };

  const fetchDepartamentos = async (provinciaId, regionId) => {
    if (!provinciaId && !regionId) {
      setDepartamentos([]);
      return;
    }
    try {
      const params = regionId ? { region_id: regionId } : {};
      const response = await geografiaService.getDepartamentos(
        provinciaId,
        params,
      );
      setDepartamentos(response.data || response || []);
    } catch (error) {
      console.error("Error al cargar departamentos:", error);
      setDepartamentos([]);
    }
  };

  useEffect(() => {
    currentPageRef.current = pagination.current_page;
  }, [pagination.current_page]);

  useEffect(() => {
    if (!hasAccess) return;

    const channel = echo.private("usuarios");

    channel.listen(".UsuarioUpdated", (event) => {
      console.log("Cambio detectado en usuarios:", event.action, event.userId);
      // Usa la página actual sin recrear la conexión
      fetchUsers(currentPageRef.current);
    });

    return () => {
      echo.leave("usuarios");
    };
  }, [hasAccess]);

  useEffect(() => {
    fetchProvincias();
  }, []);

  useEffect(() => {
    setFilterRegionId("");
    setFilterDistritoId("");
    if (filterProvinciaId) {
      fetchRegiones(filterProvinciaId);
      fetchDepartamentos(filterProvinciaId);
    } else {
      setRegiones([]);
      setDepartamentos([]);
    }
  }, [filterProvinciaId]);

  useEffect(() => {
    setFilterDistritoId("");
    if (filterRegionId && filterProvinciaId) {
      fetchDepartamentos(null, filterRegionId);
    } else if (filterProvinciaId) {
      fetchDepartamentos(filterProvinciaId);
    } else {
      setDepartamentos([]);
    }
  }, [filterRegionId]);

  const fetchUsers = async (page = 1) => {
    try {
      setIsUsersLoading(true);
      const response = await userService.getAll({
        search: userSearch,
        cue_anexo: filterCueAnexo,
        provincia_id: filterProvinciaId || undefined,
        region_id: filterRegionId || undefined,
        departamento_id: filterDistritoId || undefined,
        role: filterRole || undefined,
        password_set: filterPasswordSet !== "" ? filterPasswordSet : undefined,
        email_verified: filterEmailVerified || undefined,
        persona_linked: filterPersonaLinked || undefined,
        sort_by: sortConfig.key,
        order: sortConfig.direction,
        page,
        per_page: 10,
      });
      setUsers(response.data || []);
      setPagination(
        response.meta || { current_page: 1, last_page: 1, total: 0 },
      );
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      showNotification(
        parseError(error, "Error al cargar el listado de usuarios."),
        "error",
      );
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const docs = await documentoTipoService.getAll({ per_page: 500 });
      setDocTipos(docs.data || docs);
    } catch (error) {
      console.error("Error al cargar catálogos:", error);
    }
  };

  useEffect(() => {
    const isCueEmpty = filterCueAnexo.length === 0;
    const isCueComplete = filterCueAnexo.length === 9;

    if (isCueEmpty || isCueComplete) {
      fetchUsers(1);
    }
  }, [filterCueAnexo]);

  useEffect(() => {
    fetchUsers(1);
  }, [
    filterRole,
    filterProvinciaId,
    filterRegionId,
    filterDistritoId,
    filterPasswordSet,
    filterEmailVerified,
    filterPersonaLinked,
    sortConfig, // Refresca al cambiar ordenamiento
  ]);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  // --- LÓGICA DE ORDENAMIENTO ---
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

  // --- ACCIONES DE USUARIOS ---
  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const activeFiltersCount = [
    filterCueAnexo,
    filterProvinciaId,
    filterRegionId,
    filterDistritoId,
    filterRole,
    filterPasswordSet,
    filterEmailVerified,
    filterPersonaLinked,
  ].filter((val) => val !== "" && val !== undefined && val !== null).length;

  const handleClearAllFilters = () => {
    setUserSearch("");
    setFilterCueAnexo("");
    setFilterProvinciaId("");
    setFilterRegionId("");
    setFilterDistritoId("");
    setFilterRole("");
    setFilterPasswordSet("");
    setFilterEmailVerified("");
    setFilterPersonaLinked("");
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    const initial = {
      nombre: user.nombre || "",
      email: user.email || "",
      documento_tipo_id: user.documento_tipo_id || "",
      documento_numero: user.documento_numero || "",
    };
    setInitialFormData(initial);
    setFormData(initial);
    setIsModalOpen(true);
  };

  const openDetailModal = async (user) => {
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailUser(null);
    try {
      const response = await userService.getById(user.id);
      setDetailUser(response.data || response);
    } catch (error) {
      console.error("Error al cargar detalle del usuario:", error);
      showNotification(
        parseError(error, "Error al cargar el detalle del usuario."),
        "error",
      );
      setIsDetailModalOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleEditFromDetail = () => {
    if (!detailUser) return;
    setIsDetailModalOpen(false);
    openEditModal(detailUser);
  };

  const handleVincularPersona = async (userId, personaId) => {
    try {
      setIsLinkingPersona(true);
      const response = await userService.vincularPersona(userId, personaId);
      showNotification(response.message, "success");
      const detail = await userService.getById(userId);
      setDetailUser(detail.data || detail);
      fetchUsers(pagination.current_page);
    } catch (error) {
      showNotification(
        parseError(error, "Error al vincular la persona."),
        "error",
      );
    } finally {
      setIsLinkingPersona(false);
    }
  };

  const handleDesvincularPersona = async (userId) => {
    try {
      setIsLinkingPersona(true);
      const response = await userService.desvincularPersona(userId);
      showNotification(response.message, "success");
      const detail = await userService.getById(userId);
      setDetailUser(detail.data || detail);
      fetchUsers(pagination.current_page);
    } catch (error) {
      showNotification(
        parseError(error, "Error al desvincular la persona."),
        "error",
      );
    } finally {
      setIsLinkingPersona(false);
    }
  };

  const handleQuickLinkUser = async (user) => {
    try {
      setProcessingId(user.id);
      const response = await userService.getCandidatosPersona(user.id);
      const candidatos = response.data || [];

      if (candidatos.length > 0) {
        const candidato = candidatos[0];
        openConfirm({
          title: "Confirmar Vinculación al Padrón",
          message: `Se detectó al registro ${candidato.nombre_completo} (DNI ${candidato.documento_numero}, Email: ${candidato.email || "S/D"}) en el padrón. ¿Deseas vincular al usuario ${user.nombre} con esta persona?`,
          confirmText: "Vincular",
          variant: "primary",
          onConfirm: () => {
            closeConfirm();
            handleVincularPersona(user.id, candidato.id);
          },
        });
      } else {
        openConfirm({
          title: "Sin candidatos coincidentes",
          message: `No se encontró ningún registro en el padrón con DNI y Email coincidentes para ${user.nombre} (${user.documento_numero || "Sin DNI"}). ¿Deseas abrir el detalle del usuario para revisar la información?`,
          confirmText: "Ver Detalle",
          variant: "primary",
          onConfirm: () => {
            closeConfirm();
            openDetailModal(user);
          },
        });
      }
    } catch (error) {
      showNotification(
        parseError(error, "Error al buscar candidatos en el padrón."),
        "error",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickUnlinkUser = (user) => {
    const personaNombre =
      user.persona?.nombre_completo || user.persona?.apellido || "el padrón";
    openConfirm({
      title: "¿Desvincular usuario del Padrón?",
      message: `¿Deseas desvincular al usuario ${user.nombre} (${user.email}) de la persona vinculada (${personaNombre})?`,
      confirmText: "Desvincular",
      variant: "danger",
      onConfirm: () => {
        closeConfirm();
        handleDesvincularPersona(user.id);
      },
    });
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await userService.update(editingUser.id, formData);
      showNotification("Usuario actualizado con éxito.", "success");
      setIsModalOpen(false);
      fetchUsers(pagination.current_page);
    } catch (error) {
      showNotification(
        parseError(error, "Ocurrió un error al procesar el usuario."),
        "error",
      );
    }
  };

  const handleDeleteUser = async (id) => {
    openConfirm({
      title: "¿Eliminar usuario?",
      message:
        "Esta acción aplicará un Soft Delete. El usuario podrá ser recuperado posteriormente por un administrador de base de datos.",
      confirmText: "Eliminar",
      variant: "danger",
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          await userService.delete(id);
          showNotification("Usuario eliminado con éxito.", "success");
          fetchUsers(pagination.current_page);
          closeConfirm();
        } catch (error) {
          showNotification(
            parseError(error, "Error al eliminar el usuario."),
            "error",
          );
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleConfirmVinculation = async (user) => {
    const emailNoVerificado = !user.email_verified_at;
    openConfirm({
      title: emailNoVerificado
        ? "⚠️ Confirmar Vinculación (Email No Verificado)"
        : "Confirmar Vinculación al Padrón",
      message: emailNoVerificado
        ? `El usuario ${user.nombre} (${user.email}) NO ha verificado su correo electrónico. ¿Deseas confirmar la vinculación de todos modos? El email seguirá sin estar verificado.`
        : `¿Confirmas que el usuario ${user.nombre} (${user.email}) coincide con el registro del padrón detectado automáticamente para el documento ${user.documento_numero}?`,
      confirmText: "Confirmar y Activar",
      variant: emailNoVerificado ? "warning" : "primary",
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          const response = await userService.confirmPersona(
            user.id,
            emailNoVerificado,
          );

          showNotification(response.message, "success");
          fetchUsers(pagination.current_page);
          closeConfirm();
        } catch (error) {
          showNotification(
            parseError(error, "Error al confirmar la vinculación."),
            "error",
          );
          closeConfirm();
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleResendActivation = async (user) => {
    openConfirm({
      title: "Reenviar Invitación",
      message: `¿Deseas reenviar la invitación a ${user.email}? El usuario podrá configurar su contraseña desde el enlace.`,
      confirmText: "Reenviar Invitación",
      variant: "warning",
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          const response = await userService.resendActivation(user.id);
          showNotification(response.message, "success");
          fetchUsers(pagination.current_page);
          closeConfirm();
        } catch (error) {
          showNotification(
            parseError(error, "Error al reenviar la invitación."),
            "error",
          );
          closeConfirm();
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleResendEmailVerification = async (user) => {
    openConfirm({
      title: "Reenviar Verificación de Email",
      message: `¿Deseas reenviar el email de verificación a ${user.email}?`,
      confirmText: "Reenviar Verificación",
      variant: "primary",
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          const response = await userService.resendEmailVerification(user.id);
          showNotification(response.message, "success");
          fetchUsers(pagination.current_page);
          closeConfirm();
        } catch (error) {
          showNotification(
            parseError(error, "Error al reenviar la verificación."),
            "error",
          );
          closeConfirm();
        } finally {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  if (!hasAccess) {
    return (
      <main className="flex-grow p-8 overflow-y-auto bg-secondary-50/30">
        <div className="p-10 text-center bg-white rounded-3xl border border-secondary-200 shadow-sm animate-fadeIn">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-info w-12 h-12 text-primary-500 mx-auto mb-4"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          <h2 className="text-xl font-black text-secondary-900 uppercase">
            Acceso Restringido
          </h2>
          <p className="text-secondary-500 mt-2 font-medium">
            No posee los permisos necesarios para gestionar la nómina de
            usuarios.
          </p>
        </div>
      </main>
    );
  }

  const hasChanges = [
    "nombre",
    "email",
    "documento_tipo_id",
    "documento_numero",
  ].some(
    (key) => String(formData[key] ?? "") !== String(initialFormData[key] ?? ""),
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-secondary-500 mt-1 font-medium italic">
            {isSuperUser
              ? "Administración global de cuentas de acceso"
              : isJefeProvincial
                ? "Gestión de Usuarios - Ámbito Provincial"
                : isJefeRegional
                  ? "Gestión de Usuarios - Ámbito Regional"
                  : isJefeDistrital
                    ? "Gestión de Usuarios - Ámbito Distrital"
                    : "Gestión de usuarios vinculados a su institución"}
          </p>
        </div>
      </div>

      {/* Contenido: Listado de Usuarios */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
        {/* Filtros */}
        <div className="p-6 border-b border-secondary-100 bg-secondary-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Buscador Principal */}
            <form
              onSubmit={handleSearch}
              className="flex gap-2 w-full sm:max-w-md"
            >
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o DNI..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium transition-all shadow-sm"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
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
              <div className="p-4 bg-white rounded-2xl border border-secondary-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Columna 1: Ámbito Territorial */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-secondary-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary-500" />{" "}
                    Territorial
                  </h4>
                  <div className="space-y-2">
                    <select
                      value={filterProvinciaId}
                      onChange={(e) => setFilterProvinciaId(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">Todas las Provincias</option>
                      {provincias.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterRegionId}
                      onChange={(e) => setFilterRegionId(e.target.value)}
                      disabled={!filterProvinciaId}
                      className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                    >
                      <option value="">Todas las Regiones</option>
                      {regiones.map((r) => (
                        <option key={r.id} value={r.id}>
                          Región {r.numero}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterDistritoId}
                      onChange={(e) => setFilterDistritoId(e.target.value)}
                      disabled={!filterProvinciaId}
                      className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                    >
                      <option value="">Todos los Distritos</option>
                      {departamentos.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Columna 2: Institucional & Perfil */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-secondary-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary-500" />{" "}
                    Institucional y Perfil
                  </h4>
                  <div className="space-y-2">
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">Todos los Roles</option>
                      <option value="superuser">SuperUsuarios</option>
                      <option value="jefe_provincial">
                        Jefes Provinciales
                      </option>
                      <option value="jefe_regional">Jefes Regionales</option>
                      <option value="jefe_distrital">Jefes Distritales</option>
                      <option value="equipo_directivo">
                        Equipos Directivos
                      </option>
                      <option value="profesor">Profesores / Docentes</option>
                      <option value="preceptor">Preceptores</option>
                    </select>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="CUE Escuela..."
                        className="w-full pl-3 pr-4 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                        value={filterCueAnexo}
                        onChange={(e) => setFilterCueAnexo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Columna 3: Estado de Cuenta & Padrón */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-secondary-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary-500" /> Cuenta y
                    Padrón
                  </h4>
                  <div className="space-y-2">
                    <select
                      value={filterPasswordSet}
                      onChange={(e) => setFilterPasswordSet(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">Todas las Contraseñas</option>
                      <option value="true">Con Contraseña Definida</option>
                      <option value="false">
                        Invitación Pendiente (Sin Clave)
                      </option>
                    </select>

                    <select
                      value={filterEmailVerified}
                      onChange={(e) => setFilterEmailVerified(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">Todos los Estados de Email</option>
                      <option value="verified">Email Verificado</option>
                      <option value="unverified">Email Sin Verificar</option>
                    </select>

                    <select
                      value={filterPersonaLinked}
                      onChange={(e) => setFilterPersonaLinked(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">Todos los Estados de Padrón</option>
                      <option value="linked">Vinculados a Padrón</option>
                      <option value="unlinked">Sin Vincular a Padrón</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Badges de Filtros Activos (Pills) */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[10px] font-black text-secondary-400 uppercase tracking-wider">
                Filtros Activos:
              </span>

              {filterProvinciaId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-lg border border-primary-200">
                  Provincia:{" "}
                  {provincias.find((p) => p.id == filterProvinciaId)?.nombre ||
                    filterProvinciaId}
                  <button
                    type="button"
                    onClick={() => setFilterProvinciaId("")}
                    className="hover:text-primary-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterRegionId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-lg border border-primary-200">
                  Región:{" "}
                  {regiones.find((r) => r.id == filterRegionId)?.numero
                    ? `Región ${regiones.find((r) => r.id == filterRegionId).numero}`
                    : filterRegionId}
                  <button
                    type="button"
                    onClick={() => setFilterRegionId("")}
                    className="hover:text-primary-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterDistritoId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-lg border border-primary-200">
                  Distrito:{" "}
                  {departamentos.find((d) => d.id == filterDistritoId)
                    ?.nombre || filterDistritoId}
                  <button
                    type="button"
                    onClick={() => setFilterDistritoId("")}
                    className="hover:text-primary-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterRole && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
                  Rol:{" "}
                  {{
                    superuser: "SuperUsuario",
                    jefe_provincial: "Jefe Provincial",
                    jefe_regional: "Jefe Regional",
                    jefe_distrital: "Jefe Distrital",
                    equipo_directivo: "Equipo Directivo",
                    profesor: "Profesor",
                    preceptor: "Preceptor",
                  }[filterRole] || filterRole}
                  <button
                    type="button"
                    onClick={() => setFilterRole("")}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterCueAnexo && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
                  CUE: {filterCueAnexo}
                  <button
                    type="button"
                    onClick={() => setFilterCueAnexo("")}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterPasswordSet && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">
                  Clave:{" "}
                  {filterPasswordSet === "true" ? "Definida" : "Pendiente"}
                  <button
                    type="button"
                    onClick={() => setFilterPasswordSet("")}
                    className="hover:text-amber-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterEmailVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200">
                  Email:{" "}
                  {filterEmailVerified === "verified"
                    ? "Verificado"
                    : "Sin Verificar"}
                  <button
                    type="button"
                    onClick={() => setFilterEmailVerified("")}
                    className="hover:text-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterPersonaLinked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-200">
                  Padrón:{" "}
                  {filterPersonaLinked === "linked"
                    ? "Vinculado"
                    : "Sin Vincular"}
                  <button
                    type="button"
                    onClick={() => setFilterPersonaLinked("")}
                    className="hover:text-purple-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {isUsersLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
            <p className="text-secondary-500 font-medium italic">
              Cargando usuarios...
            </p>
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-secondary-50 border-b border-secondary-200 select-none">
                <tr>
                  {/* Encabezado Ordenable: Identidad / Nombre */}
                  <th
                    onClick={() => handleSort("nombre")}
                    className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 transition-colors group"
                  >
                    <div className="flex items-center gap-1">
                      <span>Identidad / Nombre</span>
                      {renderSortIcon("nombre")}
                    </div>
                  </th>

                  {/* Encabezado Ordenable: Email / DNI */}
                  <th
                    onClick={() => handleSort("email")}
                    className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 transition-colors group"
                  >
                    <div className="flex items-center gap-1">
                      <span>Email / Documento</span>
                      {renderSortIcon("email")}
                    </div>
                  </th>

                  {/* Encabezado Roles */}
                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Roles y Asignaciones</span>
                    </div>
                  </th>

                  <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-secondary-50 transition-colors"
                  >
                    {/* Celda Identidad */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border-2 border-white shadow-sm">
                          {user.nombre?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-secondary-900">
                            {user.nombre}
                          </p>
                          {user.estado === "vinculacion_pendiente" && (
                            <div className="mt-1">
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded border border-amber-200 shadow-sm animate-pulse">
                                Confirmación de Padrón Requerida
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Celda Email / DNI */}
                    <td className="px-6 py-4">
                      {user.es_administrador ||
                      user.roles?.some((r) => r.name === "superuser") ? (
                        <p className="text-[11px] text-secondary-400 italic">
                          Información protegida
                        </p>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-secondary-700">
                            {user.email}
                          </p>
                          {user.persona ? (
                            <p className="text-[10px] text-green-600 font-bold mt-0.5 uppercase tracking-tighter flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Padrón Vinculado
                            </p>
                          ) : (
                            user.documento_numero && (
                              <p className="text-[10px] text-primary-600 font-black mt-0.5">
                                {user.documento_tipo?.nombre}:{" "}
                                {user.documento_numero}
                              </p>
                            )
                          )}
                        </div>
                      )}
                    </td>

                    {/* Celda Roles */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.es_administrador && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded shadow-sm">
                            Admin
                          </span>
                        )}
                        {user.roles?.map((role) => {
                          let scopeLabel = "";
                          if (role.name === "jefe_provincial") {
                            scopeLabel = user.provincia_usuario?.provincia
                              ?.nombre
                              ? ` (${user.provincia_usuario.provincia.nombre})`
                              : "";
                          } else if (role.name === "jefe_regional") {
                            scopeLabel = user.region_usuario?.region?.numero
                              ? ` (Región ${user.region_usuario.region.numero})`
                              : "";
                          } else if (role.name === "jefe_distrital") {
                            scopeLabel = user.distrito_usuario?.distrito?.nombre
                              ? ` (${user.distrito_usuario.distrito.nombre})`
                              : "";
                          }

                          return (
                            <span
                              key={role.id}
                              className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-black uppercase rounded shadow-sm"
                            >
                              {role.name.replace("_", " ")}
                              {scopeLabel}
                            </span>
                          );
                        })}

                        {user.escuelas_personas?.map((ep) => (
                          <span
                            key={ep.id}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded border border-indigo-100 shadow-sm"
                            title={ep.escuela?.nombre}
                          >
                            {ep.role?.name?.replace("_", " ")}:{" "}
                            {ep.escuela?.nombre?.length > 25
                              ? ep.escuela.nombre.substring(0, 22) + "..."
                              : ep.escuela?.nombre}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Celda de Acciones */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!(
                          user.es_administrador ||
                          user.roles?.some((r) => r.name === "superuser")
                        ) &&
                          !user.has_password &&
                          user.estado !== "activo" && (
                            <button
                              onClick={() => handleResendActivation(user)}
                              className="p-2 text-secondary-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Reenviar Invitación para configurar contraseña"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                          )}

                        {!(
                          user.es_administrador ||
                          user.roles?.some((r) => r.name === "superuser")
                        ) &&
                          !user.email_verified_at && (
                            <button
                              onClick={() =>
                                handleResendEmailVerification(user)
                              }
                              className="p-2 text-secondary-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Reenviar Verificación de Email"
                            >
                              <MailCheck className="w-5 h-5" />
                            </button>
                          )}

                        {user.estado === "vinculacion_pendiente" &&
                          (isSuperUser ||
                            isJefeProvincial ||
                            isJefeRegional ||
                            isJefeDistrital) && (
                            <button
                              onClick={() => handleConfirmVinculation(user)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-amber-700 transition-all shadow-md active:scale-95 animate-pulse"
                              title="Confirmar Identidad en Padrón"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Confirmar
                            </button>
                          )}

                        {user.estado !== "vinculacion_pendiente" &&
                          !(
                            user.es_administrador ||
                            user.roles?.some((r) => r.name === "superuser")
                          ) &&
                          (isSuperUser ||
                            isJefeProvincial ||
                            isJefeRegional ||
                            isJefeDistrital) &&
                          (user.persona ? (
                            <button
                              onClick={() => handleQuickUnlinkUser(user)}
                              disabled={processingId === user.id}
                              className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Desvincular del Padrón de Personas"
                            >
                              {processingId === user.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Link2Off className="w-5 h-5" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickLinkUser(user)}
                              disabled={processingId === user.id}
                              className="p-2 text-secondary-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Vincular con Registro del Padrón"
                            >
                              {processingId === user.id ? (
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                              ) : (
                                <Link className="w-5 h-5" />
                              )}
                            </button>
                          ))}

                        <button
                          onClick={() => openDetailModal(user)}
                          className="p-2 text-secondary-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver Información del Usuario"
                        >
                          <Eye className="w-5 h-5" />
                        </button>

                        {!(
                          user.es_administrador ||
                          user.roles?.some((r) => r.name === "superuser")
                        ) ? (
                          <>
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title={
                                isSuperUser
                                  ? "Editar Información"
                                  : "Visualizar Información"
                              }
                            >
                              {isSuperUser ? (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              )}
                            </button>
                            {isSuperUser && user.id !== authUser.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar Cuenta"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </>
                        ) : (
                          (user.es_administrador ||
                            user.roles?.some(
                              (r) => r.name === "superuser",
                            )) && (
                            <div className="p-2 text-secondary-300 italic text-[10px] font-bold uppercase tracking-widest">
                              Protegido
                            </div>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center text-secondary-500 font-bold italic">
            No se encontraron usuarios que coincidan con los filtros.
          </div>
        )}

        {/* Paginación */}
        {pagination.last_page > 1 && (
          <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
            <p className="text-xs text-secondary-500 font-bold">
              Total: {pagination.total} usuarios
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.current_page === 1}
                onClick={() => fetchUsers(pagination.current_page - 1)}
                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                Página {pagination.current_page} de {pagination.last_page}
              </span>
              <button
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchUsers(pagination.current_page + 1)}
                className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN DE USUARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col border border-secondary-100">
            <div className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 px-8 py-5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-black border-2 border-white/40 shadow-lg">
                  {editingUser?.nombre?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white truncate">
                    Editar Información del Usuario
                  </h2>
                  <p className="text-white/80 text-sm font-medium truncate">
                    {editingUser?.email || "Sin email"}
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto flex-1 p-6 space-y-6"
            >
              <section>
                <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-4 flex items-center gap-2">
                  <IdCard className="w-4 h-4" /> Datos de Cuenta e Identidad
                </h3>

                {editingUser?.persona && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                    Este usuario está vinculado al padrón de personas. Los
                    campos DNI y Email están bloqueados para preservar la
                    integridad del vínculo.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      disabled={!!editingUser?.persona}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold tracking-wider outline-none transition-all ${
                        editingUser?.persona
                          ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                          : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Tipo Documento
                    </label>
                    <select
                      name="documento_tipo_id"
                      value={formData.documento_tipo_id}
                      onChange={handleFormChange}
                      disabled={!!editingUser?.persona}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-all ${
                        editingUser?.persona
                          ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                          : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                      }`}
                    >
                      <option value="">Seleccionar...</option>
                      {docTipos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
                      Número Documento
                    </label>
                    <input
                      type="text"
                      name="documento_numero"
                      value={formData.documento_numero}
                      onChange={handleFormChange}
                      disabled={!!editingUser?.persona}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold tracking-wider outline-none transition-all ${
                        editingUser?.persona
                          ? "bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed"
                          : "bg-white border-secondary-300 text-secondary-900 focus:ring-2 focus:ring-primary-500"
                      }`}
                      required
                    />
                  </div>
                </div>
              </section>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (hasChanges) {
                      setConfirmConfig({
                        isOpen: true,
                        title: "¿Cancelar cambios?",
                        message:
                          "Tenés cambios no guardados. ¿Estás seguro de que querés cancelar?",
                        confirmText: "Sí, cancelar",
                        cancelText: "Volver",
                        variant: "danger",
                        onConfirm: () => {
                          setIsModalOpen(false);
                          closeConfirm();
                        },
                      });
                    } else {
                      setIsModalOpen(false);
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-secondary-100 text-secondary-700 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary-200 transition-all active:scale-[0.98]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!hasChanges}
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DEL USUARIO */}
      {isDetailLoading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-secondary-500 font-bold italic">
              Cargando detalle del usuario...
            </p>
          </div>
        </div>
      )}
      <UserDetailModal
        user={detailUser}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onVincularPersona={handleVincularPersona}
        onDesvincularPersona={handleDesvincularPersona}
        isLinkingPersona={isLinkingPersona}
        onEdit={handleEditFromDetail}
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
};

export default UserManagement;
