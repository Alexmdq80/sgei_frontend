import { ClipboardCheck, AlertTriangle } from "lucide-react";
import ResumenFila from "./ResumenFila";
import { entrecallesTexto, nomPorId } from "./domicilioUtils";

/**
 * Paso 3: geografía parcial, resumen consolidado y observaciones.
 *
 * @param {object} props
 * @param {object} props.domicilio
 * @param {(valor: string) => void} props.onObservacionesChange
 * @param {Array} props.nacions
 * @param {Array} props.provincias
 * @param {Array} props.departamentos
 * @param {Array} props.localidades
 * @param {{provincia:string, departamento:string, localidad:string}} props.ubicacionSeleccion
 * @param {string} props.q
 * @param {string} props.qEntre1
 * @param {string} props.qEntre2
 * @param {boolean} props.domicilioDesconocido
 * @param {boolean} props.esExtranjero
 * @param {boolean} props.esGeoParcial
 */
export default function DomicilioPasoResumen({
  domicilio,
  onObservacionesChange,
  nacions,
  provincias,
  departamentos,
  localidades,
  ubicacionSeleccion,
  q,
  qEntre1,
  qEntre2,
  domicilioDesconocido,
  esExtranjero,
  esGeoParcial,
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-2 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4" /> Resumen y Confirmación
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
              El domicilio geográfico quedará en blanco. Solo se persistirá la
              observación.
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
              Solo se guardará el país. Los campos de calles y vivienda quedarán
              vacíos.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <ResumenFila
            label="País"
            valor={
              nacions.find((n) => String(n.id) === String(domicilio.nacion_id))
                ?.nombre
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
            valor={[domicilio.piso, domicilio.unidad, domicilio.torre]
              .filter(Boolean)
              .join(" / ")}
          />
          {/* Mismo criterio que la ficha de lectura (entrecallesTexto) */}
          <ResumenFila
            label="Entrecalles"
            valor={entrecallesTexto(domicilio, qEntre1, qEntre2)}
          />
          <ResumenFila label="Código Postal" valor={domicilio.codigo_postal} />
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
          onChange={(e) => onObservacionesChange(e.target.value)}
        />
      </div>
    </section>
  );
}
