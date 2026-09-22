import { useState, useEffect, useRef } from "react";
import { Loader2, X, CheckCircle2, Edit3 } from "lucide-react";

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
  onSelectCustom,
  onClearCalle,
}) {
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasCustomValue = Boolean(valueText && !selectedId);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block">
          {label}
        </label>
        {selectedId ? (
          <span
            className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full
  border border-emerald-200"
          >
            <CheckCircle2 className="w-3 h-3" /> Oficial
          </span>
        ) : hasCustomValue ? (
          <span
            className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border
  border-amber-200"
          >
            <Edit3 className="w-3 h-3" /> No catalogada
          </span>
        ) : null}
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          value={valueText || ""}
          onFocus={() => {
            if (!selectedId && (valueText || "").trim().length >= 2) {
              setAbierto(true);
            }
          }}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setAbierto(true);
          }}
          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-bold text-secondary-900 focus:ring-2 outline-none transition-all pr-
  16 ${
    selectedId
      ? "border-emerald-400 bg-emerald-50/20 focus:ring-emerald-400"
      : hasCustomValue
        ? "border-amber-300 bg-amber-50/20 focus:ring-amber-400"
        : "border-secondary-300 focus:ring-primary-500"
  }`}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
          )}

          {(selectedId || hasCustomValue) && !disabled && (
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

      {/* Menú de sugerencias + opción de texto libre */}
      {abierto &&
        !selectedId &&
        !disabled &&
        (valueText || "").trim().length >= 2 && (
          <div
            className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-secondary-200 rounded-2xl shadow-xl max-h-60 overflow-hidden 
  z-50 divide-y divide-secondary-100 animate-fadeIn"
          >
            {calles.length > 0 && (
              <ul className="max-h-40 overflow-y-auto divide-y divide-secondary-100">
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

            {/* Botón para confirmar como calle libre */}
            <button
              type="button"
              onClick={() => {
                onSelectCustom?.((valueText || "").trim());
                setAbierto(false);
              }}
              className="w-full px-4 py-2.5 text-left bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-between text-xs font-
  bold text-amber-900"
            >
              <span className="truncate">
                Usar &ldquo;
                <span className="underline">{(valueText || "").trim()}</span>
                &rdquo; como calle no catalogada
              </span>
              <span className="shrink-0 text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black uppercase ml-2">
                Texto libre 📝
              </span>
            </button>
          </div>
        )}
    </div>
  );
}
