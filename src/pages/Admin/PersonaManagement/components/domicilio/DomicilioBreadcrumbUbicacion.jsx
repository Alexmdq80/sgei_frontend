/**
 * Breadcrumb de ubicación del Paso 1 y del Paso 2.
 * Devuelve null cuando el país es extranjero (idem bloque original).
 *
 * @param {object} props
 * @param {object} props.domicilio
 * @param {boolean} props.domicilioDesconocido
 * @param {boolean} props.esExtranjero
 * @param {"argentina"|"extranjero"} props.paisTipo
 * @param {Array<{id:number|string, nombre:string}>} props.nacions
 * @param {{provincia:string, departamento:string, localidad:string}} props.ubicacionSeleccion
 * @param {() => void} props.onCambiarUbicacion
 */
export default function DomicilioBreadcrumbUbicacion({
  domicilio,
  domicilioDesconocido,
  esExtranjero,
  paisTipo,
  nacions,
  ubicacionSeleccion,
  onCambiarUbicacion,
}) {
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
            onClick={onCambiarUbicacion}
            className="ml-2 text-[10px] font-black underline hover:text-primary-900"
          >
            Cambiar
          </button>
        )}
      </div>
    );
  }

  return null;
}
