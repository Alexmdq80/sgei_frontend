import { ClipboardCheck, Pencil, AlertTriangle } from "lucide-react";
import ResumenFila from "./ResumenFila";
import { entrecallesTexto, nomPorId } from "./domicilioUtils";

/**
 * Ficha consolidada de solo lectura (sin inputs).
 *
 * @param {object} props
 * @param {object} props.domicilio
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
 * @param {() => void} props.onEditar
 */
export default function DomicilioLecturaView({
  domicilio,
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
  onEditar,
}) {
  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-secondary-100 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary-600" />
          <h3 className="text-sm font-black text-secondary-800 uppercase tracking-wider">
            Datos del Domicilio Registrado
          </h3>
        </div>
        <button
          type="button"
          onClick={onEditar}
          className="px-3.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-primary-200"
        >
          <Pencil className="w-3.5 h-3.5" /> Modificar Datos
        </button>
      </div>

      {domicilioDesconocido ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-black text-amber-800 uppercase text-sm">
              Domicilio Desconocido
            </p>
            <p className="text-xs text-amber-700 font-medium">
              El domicilio geográfico se encuentra declarado como desconocido.
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
              País:{" "}
              {nacions.find((n) => String(n.id) === String(domicilio.nacion_id))
                ?.nombre || "—"}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-secondary-50/70 border border-secondary-200 rounded-2xl p-6 space-y-3 shadow-sm">
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
          <ResumenFila
            label="Entrecalles"
            valor={entrecallesTexto(domicilio, qEntre1, qEntre2)}
          />
          <ResumenFila label="Código Postal" valor={domicilio.codigo_postal} />
        </div>
      )}

      <div className="bg-white border border-secondary-200 rounded-2xl p-5">
        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5">
          Observaciones del Domicilio
        </p>
        <p className="text-xs font-semibold text-secondary-700 whitespace-pre-wrap">
          {domicilio.observaciones || (
            <span className="italic text-secondary-400">
              Sin observaciones registradas.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
