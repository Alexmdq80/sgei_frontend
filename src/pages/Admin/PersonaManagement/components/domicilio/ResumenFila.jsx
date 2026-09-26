/**
 * Fila clave-valor de los resúmenes.
 * El valor se renderiza en un <div> (no en un <p>) porque la fila "Calle" recibe
 * JSX con un <div> para los badges OFICIAL/TEXTO LIBRE: un <div> dentro de un <p>
 * es HTML inválido y React lo reporta como warning.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {import("react").ReactNode} props.valor
 */
export default function ResumenFila({ label, valor }) {
  return (
    <div className="flex justify-between gap-4">
      <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest pt-0.5">
        {label}
      </p>
      <div className="text-sm font-bold text-secondary-900 text-right">
        {valor || "—"}
      </div>
    </div>
  );
}
