import { Search, Loader2, MapPin } from "lucide-react";
import SearchableSelect from "../../../../../components/SearchableSelect";
import { conActual } from "./domicilioUtils";

/**
 * Paso 1: país, Domicilio Desconocido, buscador rápido (omnibox) y cascada clásica.
 * Los resultados de búsqueda de localidades los provee el orquestador.
 *
 * @param {object} props
 * @param {object} props.domicilio
 * @param {boolean} props.domicilioDesconocido
 * @param {(checked: boolean) => void} props.onDomicilioDesconocidoChange
 * @param {"argentina"|"extranjero"} props.paisTipo
 * @param {(tipo: "argentina"|"extranjero") => void} props.onPaisTipoChange
 * @param {Array} props.nacionsSinArgentina
 * @param {(nacionId: string|number) => void} props.onNacionChange
 * @param {"omnibox"|"cascada"} props.modoUbicacion
 * @param {Function} props.setModoUbicacion
 * @param {object} props.omniboxRef
 * @param {string} props.qLocalidad
 * @param {(valor: string) => void} props.onQLocalidadChange
 * @param {boolean} props.buscandoLocalidades
 * @param {boolean} props.dropdownAbierto
 * @param {Function} props.setDropdownAbierto
 * @param {Array} props.localidadesSearch
 * @param {(item: object) => void} props.onSelectOmnibox
 * @param {Array} props.provincias
 * @param {Array} props.departamentos
 * @param {Array} props.localidades
 * @param {{provincia:string, departamento:string, localidad:string}} props.ubicacionSeleccion
 * @param {(valor: string) => void} props.onProvinciaChange
 * @param {(valor: string) => void} props.onDepartamentoChange
 * @param {(valor: string) => void} props.onLocalidadChange
 * @param {() => import("react").ReactNode} props.renderBreadcrumbUbicacion
 */
export default function DomicilioPasoUbicacion({
  domicilio,
  domicilioDesconocido,
  onDomicilioDesconocidoChange,
  paisTipo,
  onPaisTipoChange,
  nacionsSinArgentina,
  onNacionChange,
  modoUbicacion,
  setModoUbicacion,
  omniboxRef,
  qLocalidad,
  onQLocalidadChange,
  buscandoLocalidades,
  dropdownAbierto,
  setDropdownAbierto,
  localidadesSearch,
  onSelectOmnibox,
  provincias,
  departamentos,
  localidades,
  ubicacionSeleccion,
  onProvinciaChange,
  onDepartamentoChange,
  onLocalidadChange,
  renderBreadcrumbUbicacion,
}) {
  return (
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
          onChange={(e) => onDomicilioDesconocidoChange(e.target.checked)}
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
            className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${
              paisTipo === "argentina"
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
            className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${
              paisTipo === "extranjero"
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
                      onChange={(e) => onQLocalidadChange(e.target.value)}
                      placeholder="Escribí tu localidad (ej. Tandil, Quilmes, San Martín)..."
                      className="w-full bg-transparent outline-none text-sm font-bold"
                    />
                    {buscandoLocalidades && (
                      <Loader2 className="w-4 h-4 text-primary-500 animate-spin flex-shrink-0" />
                    )}
                  </div>

                  {dropdownAbierto && localidadesSearch.length > 0 && (
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
                        Sin coincidencias. Probá con otro término o usá la
                        cascada clásica.
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
                  options={conActual(
                    provincias,
                    domicilio.provincia_id,
                    ubicacionSeleccion.provincia,
                  )}
                  value={domicilio.provincia_id}
                  placeholder="Seleccionar provincia"
                  disabled={domicilioDesconocido}
                  onChange={(e) => onProvinciaChange(e.target.value)}
                />
                <SearchableSelect
                  label="Departamento"
                  options={conActual(
                    departamentos,
                    domicilio.departamento_id,
                    ubicacionSeleccion.departamento,
                  )}
                  value={domicilio.departamento_id}
                  placeholder="Seleccionar departamento"
                  disabled={!domicilio.provincia_id || domicilioDesconocido}
                  onChange={(e) => onDepartamentoChange(e.target.value)}
                />
                <SearchableSelect
                  label="Localidad"
                  options={conActual(
                    localidades,
                    domicilio.localidad_id,
                    ubicacionSeleccion.localidad,
                  )}
                  value={domicilio.localidad_id}
                  placeholder="Seleccionar localidad"
                  disabled={!domicilio.departamento_id || domicilioDesconocido}
                  onChange={(e) => onLocalidadChange(e.target.value)}
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
