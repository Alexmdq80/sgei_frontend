import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, Link, Link2Off, Trash2, Eye, Pencil } from "lucide-react";

/**
 * Tabla del padrón de personas con ordenamiento, acciones y paginación.
 */
export default function PersonaTable({
  personas,
  isLoading,
  pagination,
  sortConfig,
  onSort,
  onFetchPage,
  isSuperUser,
  isLinkingUser,
  isFetchingDetails,
  onView,
  onEdit,
  onDelete,
  onLinkUser,
  onUnlinkUser,
}) {
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

  if (isLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
        <p className="text-secondary-500 font-medium italic">
          Cargando padrón...
        </p>
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="p-20 text-center text-secondary-500 font-bold italic">
        No se encontraron registros en el padrón.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-secondary-50 border-b border-secondary-200">
            <tr>
              <th
                onClick={() => onSort("apellido")}
                className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Apellido y Nombre</span>
                  {renderSortIcon("apellido")}
                </div>
              </th>
              <th
                onClick={() => onSort("documento_numero")}
                className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Documento</span>
                  {renderSortIcon("documento_numero")}
                </div>
              </th>
              <th
                onClick={() => onSort("created_at")}
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
                    {persona.documento_tipo?.nombre} {persona.documento_numero}
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
                          onClick={() => onUnlinkUser(persona.id)}
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
                        <span className="text-xs font-medium">Sin cuenta</span>
                      </div>
                      {isSuperUser && (
                        <button
                          onClick={() => onLinkUser(persona.id)}
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
                      onClick={() => onDelete(persona)}
                      className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar del Padrón"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onView(persona.id)}
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
                      onClick={() => onEdit(persona)}
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

      {pagination.last_page > 1 && (
        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex items-center justify-between">
          <p className="text-xs text-secondary-500 font-bold">
            Total: {pagination.total} personas
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.current_page === 1}
              onClick={() => onFetchPage(pagination.current_page - 1)}
              className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-xs font-bold text-secondary-700">
              Página {pagination.current_page} de {pagination.last_page}
            </span>
            <button
              disabled={pagination.current_page === pagination.last_page}
              onClick={() => onFetchPage(pagination.current_page + 1)}
              className="px-3 py-1 bg-white border border-secondary-300 rounded-lg text-xs font-bold hover:bg-secondary-100 disabled:opacity-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
