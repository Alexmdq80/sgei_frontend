import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Eye,
  Info,
  X,
  Phone,
  Home,
  Building2,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { parseError } from "../../utils/errorParser";
import personaService from "../../services/personaService";
import escuelaService from "../../services/escuelaService";
import SearchableSelect from "../../components/SearchableSelect";

/**
 * Vista de la Comunidad Educativa de una institución.
 * - Superusuario: selecciona cualquier escuela para ver su comunidad.
 * - Conducción (perfil de escuela activo): muestra directamente la comunidad de su escuela.
 */
export default function ComunidadEducativa() {
  const { user, activeProfile, showNotification } = useAuth();

  const isSuperUser = Boolean(
    user?.es_administrador || user?.roles?.some((r) => r.name === "superuser"),
  );
  const isConduccion = Boolean(
    activeProfile?.type === "school" && activeProfile?.escuela_id,
  );
  const isAllowed = isSuperUser || isConduccion;

  // Escuela consultada (del perfil activo para conducción, o del selector para superuser)
  const [escuelaId, setEscuelaId] = useState(
    isConduccion ? activeProfile?.escuela_id : null,
  );
  const [escuelaNombre, setEscuelaNombre] = useState(
    isConduccion ? (activeProfile?.escuela?.nombre ?? "") : "",
  );

  // Catálogo de escuelas para el selector (solo superuser)
  const [escuelas, setEscuelas] = useState([]);
  const [cueSearch, setCueSearch] = useState("");
  const [isLoadingEscuelas, setIsLoadingEscuelas] = useState(false);

  // Comunidad educativa
  const [personas, setPersonas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [relacionFilter, setRelacionFilter] = useState("");
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  // Modal de ficha
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Opciones formateadas para SearchableSelect
  const escuelaOptions = useMemo(() => {
    return escuelas.map((esc) => ({
      id: String(esc.id),
      nombre: `${esc.nombre}${esc.numero ? ` N° ${esc.numero}` : ""}${esc.cue_anexo ? ` [CUE: ${esc.cue_anexo}]` : ""}${esc.localidad?.nombre ? ` (${esc.localidad.nombre})` : ""}`,
    }));
  }, [escuelas]);

  // Carga de escuelas para el selector (solo superuser)
  const fetchEscuelas = useCallback(async () => {
    if (!isSuperUser) return;
    try {
      setIsLoadingEscuelas(true);
      const response = await escuelaService.getAllAdmin({ per_page: 1000 });
      setEscuelas(response.data || response || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
      showNotification(
        parseError(error, "No se pudieron cargar las escuelas."),
        "error",
      );
    } finally {
      setIsLoadingEscuelas(false);
    }
  }, [isSuperUser, showNotification]);

  useEffect(() => {
    if (isSuperUser) fetchEscuelas();
  }, [isSuperUser, fetchEscuelas]);

  const handleCueSearch = async () => {
    if (!cueSearch.trim()) {
      showNotification("Por favor, ingrese un número de CUE.", "warning");
      return;
    }
    try {
      setIsLoadingEscuelas(true);
      const response = await escuelaService.getAllAdmin({
        search: cueSearch.trim(),
        per_page: 10,
      });
      const found = response.data || response || [];
      if (found.length === 0) {
        showNotification("No se encontró ninguna escuela con ese CUE.", "warning");
        return;
      }
      setEscuelas(found);
      if (found.length === 1) {
        setEscuelaId(found[0].id);
        setEscuelaNombre(found[0].nombre);
        setPersonas([]);
        setSearchTerm("");
        setRelacionFilter("");
        showNotification(`Escuela seleccionada: ${found[0].nombre}`, "success");
      } else {
        showNotification(
          `Se encontraron ${found.length} escuelas. Selecciónela en la lista de la izquierda/abajo.`,
          "info",
        );
      }
    } catch (error) {
      console.error("Error searching school by CUE:", error);
      showNotification(
        parseError(error, "Error al buscar la escuela por CUE."),
        "error",
      );
    } finally {
      setIsLoadingEscuelas(false);
    }
  };

  const handleEscuelaSelect = (e) => {
    const id = e.target.value;
    const found = escuelas.find((esc) => String(esc.id) === String(id));
    setEscuelaId(id || null);
    setEscuelaNombre(found?.nombre ?? "");
    setPersonas([]);
    setSearchTerm("");
    setRelacionFilter("");
  };

  // Carga de la comunidad educativa
  const fetchComunidad = useCallback(
    async (page = 1) => {
      if (!escuelaId) return;
      try {
        setIsLoading(true);
        const response = await personaService.getComunidad({
          escuela_id: escuelaId,
          search: searchTerm,
          relacion: relacionFilter,
          page,
          per_page: 15,
        });
        setPersonas(response.data ?? []);
        setPagination(
          response.meta ?? { current_page: 1, last_page: 1, total: 0 },
        );
      } catch (error) {
        console.error("Error al cargar comunidad:", error);
        showNotification(
          parseError(error, "No se pudo cargar la comunidad educativa."),
          "error",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [escuelaId, searchTerm, relacionFilter, showNotification],
  );

  useEffect(() => {
    if (escuelaId) {
      fetchComunidad(1);
    } else {
      setPersonas([]);
      setPagination({ current_page: 1, last_page: 1, total: 0 });
    }
  }, [escuelaId, relacionFilter, fetchComunidad]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComunidad(1);
  };

  const handleViewPersona = async (id) => {
    try {
      setIsFetchingDetails(true);
      const response = await personaService.getById(id);
      setSelectedPersona(response.data);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error("Error al obtener detalles:", error);
      showNotification(
        parseError(error, "No se pudieron cargar los detalles."),
        "error",
      );
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Guard: sin perfil de conducción ni superusuario
  if (!isAllowed) {
    return (
      <div className="p-10 text-center bg-white rounded-3xl border border-secondary-200 shadow-sm">
        <Info className="w-12 h-12 text-primary-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-secondary-900 uppercase">
          Perfil Institucional Requerido
        </h2>
        <p className="text-secondary-500 mt-2 font-medium">
          Debe seleccionar una institución para visualizar su comunidad
          educativa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">
            Comunidad Educativa
          </h1>
          <p className="text-secondary-500 mt-1 font-medium italic">
            {escuelaNombre
              ? `Personas vinculadas a ${escuelaNombre}`
              : "Seleccione una institución para comenzar"}
          </p>
        </div>
        {escuelaId && (
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-2xl">
            <Users className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-black text-primary-700 uppercase tracking-tighter">
              {pagination.total} Miembros vinculados
            </span>
          </div>
        )}
      </div>

      {/* Selector de Escuela (solo Superusuario) */}
      {isSuperUser && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200 space-y-4">
          <h2 className="text-sm font-black text-secondary-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-500" />
            Selección de Institución
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-black text-secondary-500 uppercase tracking-widest mb-1.5">
                <Search className="w-3.5 h-3.5 text-secondary-400" />
                Búsqueda directa por CUE
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="CUE / Anexo (ej. 300123400)"
                  className="w-full pl-4 pr-12 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs font-bold h-[42px]"
                  value={cueSearch}
                  onChange={(e) => setCueSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCueSearch()}
                />
                <button
                  type="button"
                  onClick={handleCueSearch}
                  className="absolute right-1.5 p-2 bg-secondary-900 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors"
                  title="Buscar CUE"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
            <SearchableSelect
              options={escuelaOptions}
              value={escuelaId ?? ""}
              onChange={handleEscuelaSelect}
              placeholder={
                isLoadingEscuelas
                  ? "Cargando instituciones..."
                  : escuelas.length === 0
                    ? "No se encontraron escuelas"
                    : "Escriba para buscar la institución..."
              }
              disabled={isLoadingEscuelas}
              label={<>Institución Educativa</>}
            />
          </div>
        </div>
      )}

      {/* Buscador y filtros dentro de la escuela seleccionada */}
      {escuelaId && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200">
          <form
            onSubmit={handleSearch}
            className="flex flex-col lg:flex-row gap-4"
          >
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-secondary-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre o DNI..."
                className="w-full pl-10 pr-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <select
                className="px-4 py-2.5 bg-secondary-50 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-bold min-w-[180px]"
                value={relacionFilter}
                onChange={(e) => setRelacionFilter(e.target.value)}
              >
                <option value="">Todas las relaciones</option>
                <option value="ESTUDIANTE">ESTUDIANTES</option>
                <option value="DOCENTE">DOCENTES</option>
                <option value="AUXILIAR">AUXILIARES</option>
                <option value="ADMINISTRATIVO">ADMINISTRATIVOS</option>
                <option value="PADRE">PADRES</option>
                <option value="MADRE">MADRES</option>
                <option value="TUTOR">TUTORES</option>
              </select>
              <button
                type="submit"
                className="px-6 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Placeholder cuando no hay escuela seleccionada */}
      {isSuperUser && !escuelaId && (
        <div className="p-16 text-center bg-white rounded-2xl border border-secondary-200 shadow-sm">
          <Building2 className="w-14 h-14 text-secondary-300 mx-auto mb-4" />
          <p className="text-secondary-500 font-bold italic">
            Seleccione una institución para visualizar su comunidad educativa.
          </p>
        </div>
      )}

      {/* Listado de miembros */}
      {escuelaId && (
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
              <p className="text-secondary-500 font-medium italic">
                Cargando comunidad...
              </p>
            </div>
          ) : personas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                      Apellido y Nombre
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                      Relación
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
                          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold border border-primary-100 shadow-sm">
                            {persona.apellido.charAt(0).toUpperCase()}
                          </div>
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
                          {persona.documento_tipo_nombre} {persona.documento_numero}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {persona.relaciones && persona.relaciones.length > 0 ? (
                            persona.relaciones.map((rel, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-black uppercase rounded border border-primary-100"
                              >
                                {rel}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-secondary-400 italic">
                              Sin relación
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewPersona(persona.id)}
                          className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Ver Ficha"
                          disabled={isFetchingDetails}
                        >
                          {isFetchingDetails ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center text-secondary-500 font-bold italic">
              No se encontraron miembros vinculados en la comunidad educativa.
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
                  onClick={() => fetchComunidad(pagination.current_page - 1)}
                  className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-xs font-bold text-secondary-700">
                  Página {pagination.current_page} de {pagination.last_page}
                </span>
                <button
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => fetchComunidad(pagination.current_page + 1)}
                  className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de ficha */}
      {isDetailsModalOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-secondary-50">
              <div>
                <h2 className="text-xl font-black text-secondary-900 uppercase">
                  Ficha del Miembro
                </h2>
                <p className="text-xs text-secondary-500 font-bold tracking-widest mt-0.5 uppercase">
                  Comunidad Educativa: {escuelaNombre}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-8 space-y-8">
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
                    CUIL
                  </p>
                  <p className="text-lg font-bold text-primary-600 tracking-wider">
                    {selectedPersona.cuil}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                    Teléfonos
                  </p>
                  <p className="text-sm font-bold text-secondary-900 mt-1">
                    {selectedPersona.contacto?.telefono_movil ||
                      selectedPersona.contacto?.telefono ||
                      "S/D"}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                    Domicilio
                  </p>
                  <p className="text-sm font-bold text-secondary-900 mt-1">
                    {selectedPersona.domicilio?.calle
                      ? `${selectedPersona.domicilio.calle} ${selectedPersona.domicilio.numero || ""}`
                      : "S/D"}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-secondary-50 border-t border-secondary-100">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="w-full py-4 bg-secondary-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
