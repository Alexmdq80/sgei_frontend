/**
 * Utilidades puras del flujo de domicilio. Las comparten el orquestador
 * (PersonaDomicilioModal) y los subcomponentes de components/domicilio/.
 */

export const INITIAL_DOMICILIO = {
  nacion_id: "",
  provincia_id: "",
  departamento_id: "",
  localidad_id: "",
  calle_id: "",
  calle_nombre: "",
  calle_entre_1_id: "",
  calle_entre_1_nombre: "",
  calle_entre_2_id: "",
  calle_entre_2_nombre: "",
  numero: "",
  piso: "",
  unidad: "",
  torre: "",
  codigo_postal: "",
  observaciones: "",
};

// Modo de ubicación inicial del Paso 1: con jerarquía cargada (provincia /
// departamento / localidad) conviene la cascada para corregir nivel a nivel;
// con el domicilio vacío, la búsqueda rápida por nombre (omnibox) es más ágil.
export const modoUbicacionPara = (d = {}, desconocido = false) =>
  !desconocido && Boolean(d.provincia_id || d.departamento_id || d.localidad_id)
    ? "cascada"
    : "omnibox";

// Garantiza que un SearchableSelect muestre el nombre actual aunque el catálogo
// todavía no haya cargado (sólo muestra label si el id está dentro de `options`).
export const conActual = (lista, id, nombre) =>
  id && nombre && !lista.some((o) => String(o.id) === String(id))
    ? [{ id, nombre }, ...lista]
    : lista;

export const nomPorId = (lista, id) =>
  lista.find((i) => String(i.id) === String(id))?.nombre || "";

/**
 * Texto de entrecalles de las vistas de lectura y resumen.
 * Fuente de verdad: `domicilio.calle_entre_*_nombre`; si el texto de búsqueda
 * (q*) está más fresco, se usa como respaldo. Un solo lugar define el criterio,
 * así la ficha de lectura y el resumen no pueden mostrar cosas distintas.
 */
export const entrecallesTexto = (domicilio, qEntre1, qEntre2) =>
  [
    domicilio?.calle_entre_1_nombre || qEntre1,
    domicilio?.calle_entre_2_nombre || qEntre2,
  ]
    .filter(Boolean)
    .join(" y ");
