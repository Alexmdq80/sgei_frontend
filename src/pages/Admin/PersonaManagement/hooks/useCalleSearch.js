import { useState, useEffect, useMemo } from "react";
import personaService from "../../../../services/personaService";
import callesCacheService from "../../../../services/callesCacheService";
import {
  getBuscadorCalles,
  cargarPoolCalles,
} from "../../../../utils/calleSearchCache";
import {
  MAX_RESULTADOS,
  MIN_CARACTERES,
} from "../../../../utils/catalogSearchIndex";

export function useCalleSearch(localidadId, query, calleId) {
  // Estado "con clave": se guarda, junto al dato, la localidad a la que
  // pertenece. Así el render deriva null/[] cuando la localidad cambió, sin un
  // setState de "reset" dentro de un efecto (que dispara renders en cascada y
  // está marcado por react-hooks/set-state-in-effect).
  const [poolCargado, setPoolCargado] = useState({
    localidadId: null,
    calles: null,
  });
  const [remotas, setRemotas] = useState({ key: "", items: [] });
  const [loading, setLoading] = useState(false);

  const term = (query || "").trim();
  const shouldSearch = Boolean(
    localidadId && term.length >= MIN_CARACTERES && !calleId,
  );

  // Derivado: ¿el pool cargado es el de la localidad actual?
  const localPool =
    poolCargado.localidadId === localidadId ? poolCargado.calles : null;

  // Índice en memoria (memoizado por localidad, ver utils/calleSearchCache).
  const buscador = useMemo(
    () => (shouldSearch ? getBuscadorCalles(localidadId, localPool) : null),
    [shouldSearch, localidadId, localPool],
  );

  // La búsqueda local es una FUNCIÓN PURA de (pool, término): se resuelve en el
  // mismo render que la tecla, sin efecto ni estado intermedio.
  const callesLocales = useMemo(
    () => (buscador ? buscador.search(term, MAX_RESULTADOS) : []),
    [buscador, term],
  );

  // Resultado remoto cacheado por (localidad, término): el render decide si
  // corresponde usarlo, en vez de limpiarlo con un setState.
  const fallbackKey = `${localidadId}|${term}`;
  const callesRemotas = remotas.key === fallbackKey ? remotas.items : [];

  // 1) Carga del pool de calles. El efecto solo hace I/O: el setState ocurre en
  //    callbacks async, que es el patrón permitido por la regla.
  useEffect(() => {
    if (!localidadId) return;

    let active = true;

    async function loadLocalidad() {
      const cached = await callesCacheService.getLocalidad(localidadId);
      if (!active) return;

      let calles =
        cached && Array.isArray(cached.calles) ? cached.calles : null;

      if (!calles) {
        // El fetch + el guardado viajan dentro del fetcher deduplicado: se
        // ejecutan UNA sola vez aunque el modal monte 3 combos.
        calles = await cargarPoolCalles(localidadId, async () => {
          const data = await personaService.getCallesCompact(localidadId);
          await callesCacheService.saveLocalidad(localidadId, data);
          return data;
        }).catch((err) => {
          console.warn("Fallo al precargar calles de localidad:", err);
          return null;
        });
      }

      if (active && Array.isArray(calles)) {
        setPoolCargado({ localidadId, calles });
      }
    }

    loadLocalidad();

    return () => {
      active = false;
    };
  }, [localidadId]);

  // 2) Fallback HTTP con debounce: SOLO si no hay índice local disponible
  //    (el índice es autoritativo: cubre todas las calles de la localidad).
  useEffect(() => {
    if (!shouldSearch || buscador) return;

    const abortCtrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      personaService
        .searchCalles(
          { localidad_id: localidadId, q: term, per_page: MAX_RESULTADOS },
          { signal: abortCtrl.signal },
        )
        .then((r) => {
          setRemotas({
            key: fallbackKey,
            items: r?.data?.data || r?.data || r || [],
          });
        })
        .catch((err) => {
          if (err.name !== "CanceledError" && err.name !== "AbortError") {
            setRemotas({ key: fallbackKey, items: [] });
          }
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      abortCtrl.abort();
    };
  }, [shouldSearch, buscador, localidadId, term, fallbackKey]);

  // El índice local es autoritativo: si existe, nunca se muestran datos de red.
  return { calles: buscador ? callesLocales : callesRemotas, loading };
}
