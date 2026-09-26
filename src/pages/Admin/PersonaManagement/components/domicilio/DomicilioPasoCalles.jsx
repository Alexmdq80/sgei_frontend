import { Building2 } from "lucide-react";
import CalleCombo from "../CalleCombo";

const CAMPOS_VIVIENDA = [
  { key: "numero", label: "Número", numeric: true, max: 20 },
  { key: "piso", label: "Piso", numeric: true, max: 10 },
  { key: "unidad", label: "Departamento (unidad)", max: 10 },
  { key: "torre", label: "Torre", max: 10 },
  { key: "codigo_postal", label: "Código Postal", numeric: true, max: 10 },
];

// `campo` es el prefijo real del payload: `${campo}_id` / `${campo}_nombre`.
const COMBOS_CALLE = [
  {
    campo: "calle",
    textoKey: "principal",
    label: "Calle principal",
    placeholder: "Ej: Av. Rivadavia, San Martín...",
  },
  {
    campo: "calle_entre_1",
    textoKey: "entre1",
    label: "Entrecalle 1",
    placeholder: "Ej: Mitre...",
  },
  {
    campo: "calle_entre_2",
    textoKey: "entre2",
    label: "Entrecalle 2",
    placeholder: "Ej: Belgrano...",
  },
];

/**
 * Paso 2: calle principal, entrecalles y datos de vivienda.
 * Los resultados de búsqueda los provee el orquestador (3 × useCalleSearch).
 *
 * @param {object} props
 * @param {object} props.domicilio
 * @param {boolean} props.domicilioDesconocido
 * @param {{principal:string, entre1:string, entre2:string}} props.textos
 * @param {{principal:object, entre1:object, entre2:object}} props.busquedas
 * @param {(campo: string, valor: string) => void} props.onCalleTextoChange
 * @param {(campo: string, calle: {id:any, nombre:string}) => void} props.onCalleSelect
 * @param {(campo: string) => void} props.onCalleClear
 * @param {(key: string, valor: string) => void} props.onFieldChange
 * @param {() => import("react").ReactNode} props.renderBreadcrumbUbicacion
 */
export default function DomicilioPasoCalles({
  domicilio,
  domicilioDesconocido,
  textos,
  busquedas,
  onCalleTextoChange,
  onCalleSelect,
  onCalleClear,
  onFieldChange,
  renderBreadcrumbUbicacion,
}) {
  const combosDeshabilitados = !domicilio.localidad_id || domicilioDesconocido;

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2 mb-2 flex items-center gap-2">
        <Building2 className="w-4 h-4" /> Calles y Vivienda
      </h3>

      {/* Breadcrumb presente en Paso 2 */}
      {!domicilioDesconocido && (
        <div className="flex flex-wrap mb-2">{renderBreadcrumbUbicacion()}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COMBOS_CALLE.map(({ campo, textoKey, label, placeholder }) => (
          <CalleCombo
            key={campo}
            label={label}
            valueText={textos[textoKey]}
            selectedId={domicilio[`${campo}_id`]}
            calles={busquedas[textoKey].calles}
            loading={busquedas[textoKey].loading}
            disabled={combosDeshabilitados}
            placeholder={placeholder}
            onSearchChange={(val) => onCalleTextoChange(campo, val)}
            onSelectCalle={(calle) => onCalleSelect(campo, calle)}
            onSelectCustom={(nombreLibre) =>
              onCalleSelect(campo, { id: "", nombre: nombreLibre })
            }
            onClearCalle={() => onCalleClear(campo)}
          />
        ))}

        {/* Campos de vivienda */}
        {CAMPOS_VIVIENDA.map(({ key, label, numeric, max }) => (
          <div key={key}>
            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
              {label}
            </label>
            <input
              type="text"
              maxLength={max}
              value={domicilio[key] || ""}
              onChange={(e) => {
                const val = numeric
                  ? e.target.value.replace(/\D/g, "")
                  : e.target.value;
                onFieldChange(key, val);
              }}
              className="w-full px-4 py-2.5 bg-white border border-secondary-300 rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
