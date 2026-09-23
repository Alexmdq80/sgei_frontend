import { CheckCircle2 } from "lucide-react";

/**
 * Stepper visual reutilizable (Modal de Domicilio y Formulario de Persona).
 *
 * - `etapas`: [{ n, label, Icon }]
 * - `step`: número del paso activo
 * - `esAlcanzable(n)`: si devuelve false, el paso se ve atenuado y no navega
 * - `onSelect(n)`: callback al hacer click/tap en un paso alcanzable
 * - `mensajeBloqueado`: tooltip que explica por qué un paso no es accesible
 */
export default function Stepper({
  etapas = [],
  step,
  esAlcanzable = () => true,
  onSelect,
  mensajeBloqueado = "Completá el paso anterior para acceder",
}) {
  return (
    <div className="px-8 py-4 border-b border-secondary-100 bg-secondary-50/50">
      <div className="flex items-center">
        {etapas.map(({ n, label, Icon: StepIcon }, idx) => {
          const alcanzable = esAlcanzable(n);
          const activo = step === n;
          const completado = step > n;

          return (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (alcanzable) onSelect?.(n);
                }}
                aria-disabled={!alcanzable}
                aria-current={activo ? "step" : undefined}
                aria-label={`Ir al paso ${n}: ${label}`}
                title={alcanzable ? `Ir a ${label}` : mensajeBloqueado}
                className={`group flex flex-col items-center gap-1.5 flex-shrink-0 rounded-2xl p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${
                  alcanzable ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                    activo
                      ? "bg-primary-600 border-primary-600 text-white shadow-lg scale-110"
                      : completado
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-white border-secondary-300 text-secondary-400"
                  } ${
                    alcanzable && !activo
                      ? "group-hover:border-primary-400 group-hover:text-primary-600 group-hover:scale-105"
                      : ""
                  } ${!alcanzable ? "opacity-60" : ""}`}
                >
                  {completado ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    activo ? "text-primary-700" : "text-secondary-400"
                  }`}
                >
                  {label}
                </span>
              </button>

              {idx < etapas.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                    completado ? "bg-green-500" : "bg-secondary-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
