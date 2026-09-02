import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  X,
  IdCard,
  Shield,
} from "lucide-react";
import {
  FILTER_HAS_USER_CON,
  FILTER_HAS_USER_SIN,
} from "../utils/constants";

/**
 * Barra de búsqueda, panel de filtros avanzados y pills de filtros activos.
 */
export default function PersonaFilters({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  isFilterPanelOpen,
  onToggleFilterPanel,
  activeFiltersCount,
  onClearAllFilters,
  docTipos,
  sexos,
  generos,
  filterDocTipoId,
  filterSexoId,
  filterGeneroId,
  filterHasUser,
  onFilterDocTipoIdChange,
  onFilterSexoIdChange,
  onFilterGeneroIdChange,
  onFilterHasUserChange,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200 space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form
          onSubmit={onSearchSubmit}
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
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-secondary-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-sm"
          >
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onToggleFilterPanel}
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
              onClick={onClearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 border border-red-200 rounded-xl transition-all"
              title="Limpiar todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {isFilterPanelOpen && (
        <div className="pt-4 border-t border-secondary-200 animate-fadeIn">
          <div className="p-4 bg-white rounded-2xl border border-secondary-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-black text-secondary-400 uppercase tracking-wider flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-primary-500" />{" "}
                Documentación y Género
              </h4>
              <div className="space-y-2">
                <select
                  value={filterDocTipoId}
                  onChange={(e) => onFilterDocTipoIdChange(e.target.value)}
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
                  onChange={(e) => onFilterSexoIdChange(e.target.value)}
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
                  onChange={(e) => onFilterGeneroIdChange(e.target.value)}
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

            <div className="space-y-3">
              <h4 className="text-xs font-black text-secondary-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary-500" /> Padrón y
                Cuenta
              </h4>
              <div className="space-y-2">
                <select
                  value={filterHasUser}
                  onChange={(e) => onFilterHasUserChange(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary-50 border border-secondary-300 rounded-xl text-xs font-bold text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Todos</option>
                  <option value={FILTER_HAS_USER_CON}>Con cuenta</option>
                  <option value={FILTER_HAS_USER_SIN}>Sin cuenta</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => onFilterDocTipoIdChange("")}
                className="hover:text-primary-900"
                aria-label="Quitar filtro de documento"
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
                onClick={() => onFilterSexoIdChange("")}
                className="hover:text-primary-900"
                aria-label="Quitar filtro de sexo"
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
                onClick={() => onFilterGeneroIdChange("")}
                className="hover:text-primary-900"
                aria-label="Quitar filtro de género"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterHasUser === FILTER_HAS_USER_CON && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold rounded-lg">
              Con cuenta
              <button
                type="button"
                onClick={() => onFilterHasUserChange("")}
                className="hover:text-primary-900"
                aria-label="Quitar filtro de cuenta"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterHasUser === FILTER_HAS_USER_SIN && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold rounded-lg">
              Sin cuenta
              <button
                type="button"
                onClick={() => onFilterHasUserChange("")}
                className="hover:text-primary-900"
                aria-label="Quitar filtro de cuenta"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
