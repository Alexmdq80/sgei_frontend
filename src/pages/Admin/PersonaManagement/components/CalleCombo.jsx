import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";

export default function CalleCombo({
  label,
  valueText,
  selectedId,
  calles = [],
  loading = false,
  disabled = false,
  placeholder = "Escribí al menos 3 letras...",
  onSearchChange,
  onSelectCalle,
  onClearCalle,
}) {
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef(null);

  // Cerrar el dropdown al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          value={valueText}
          onFocus={() => {
            if (calles.length > 0 && !selectedId) setAbierto(true);
          }}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setAbierto(true);
          }}
          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 outline-none transition-all pr-16 ${
            selectedId
              ? "border-emerald-400 bg-emerald-50/20 focus:ring-emerald-400"
              : "border-secondary-300 focus:ring-primary-500"
          }`}
        />

        {/* Acciones e indicadores del input */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
          )}

          {selectedId && !disabled && (
            <button
              type="button"
              onClick={onClearCalle}
              title="Borrar selección"
              className="p-1 text-secondary-400 hover:text-red-500 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Menú flotante de resultados (no mueve los campos de abajo) */}
      {abierto && !selectedId && calles.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-secondary-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-secondary-100 animate-fadeIn">
          {calles.map((c) => (
            <li
              key={c.id}
              onClick={() => {
                onSelectCalle(c);
                setAbierto(false);
              }}
              className="px-4 py-2.5 cursor-pointer hover:bg-primary-50 transition-colors flex items-center justify-between group"
            >
              <span className="text-xs font-bold text-secondary-800 group-hover:text-primary-700">
                {c.nombre}
              </span>
              {c.codigo_postal && (
                <span className="text-[10px] font-semibold bg-secondary-100 text-secondary-500 px-2 py-0.5 rounded-md">
                  CP: {c.codigo_postal}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Sin coincidencias */}
      {abierto &&
        !selectedId &&
        !loading &&
        (valueText || "").trim().length >= 3 &&
        calles.length === 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-secondary-200 rounded-xl p-3 shadow-lg z-50 text-center">
            <p className="text-xs text-secondary-500 italic">
              No se encontraron calles con ese nombre.
            </p>
          </div>
        )}
    </div>
  );
}
