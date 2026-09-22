import { useState, useEffect, useRef, useCallback } from "react";
import personaService from "../../../../services/personaService";
import callesCacheService from "../../../../services/callesCacheService";

export function useCalleSearch(localidadId, query, calleId) {
  // Pool de todas las calles de la localidad actual (si están cacheadas en IndexedDB)
  const [localPool, setLocalPool] = useState(null);
  const [calles, setCalles] = useState([]);
  const [loading, setLoading] = useState(false);

  const term = (query || "").trim();
  const shouldSearch = Boolean(localidadId && term.length >= 2 && !calleId);
  const fetchingRef = useRef(false);

  // 1. Cargar / Acumular calles de la localidad en IndexedDB
  useEffect(() => {
    if (!localidadId) {
      setLocalPool(null);
      setCalles([]);
      return;
    }

    let active = true;

    async function loadLocalidad() {
      // Paso A: Buscar en IndexedDB
      const cached = await callesCacheService.getLocalidad(localidadId);
      if (cached && Array.isArray(cached.calles)) {
        if (active) setLocalPool(cached.calles);
        return;
      }

      // Paso B: Si no está en IndexedDB, descargar lista compacta y persistir
      if (!fetchingRef.current) {
        fetchingRef.current = true;
        try {
          const freshCalles = await personaService.getCallesCompact(localidadId);
          await callesCacheService.saveLocalidad(localidadId, freshCalles);
          if (active) setLocalPool(freshCalles);
        } catch (err) {
          console.warn("Fallo al precargar calles de localidad:", err);
        } finally {
          fetchingRef.current = false;
        }
      }
    }

    loadLocalidad();

    return () => {
      active = false;
    };
  }, [localidadId]);

  // 2. Búsqueda: Si está en IndexedDB (localPool) es INSTANTÁNEA (0 ms).
  // Si no terminó de cargar, usa el fallback con debounce de 300 ms contra la API.
  useEffect(() => {
    if (!shouldSearch) {
      setCalles([]);
      return;
    }

    // CASO INSTANTÁNEO (IndexedDB disponible)
    if (localPool && localPool.length > 0) {
      const qUpper = term.toUpperCase();
      const filtered = localPool
        .filter((c) => c.nombre && c.nombre.toUpperCase().includes(qUpper))
        .slice(0, 15);
      setCalles(filtered);
      setLoading(false);
      return;
    }

    // CASO FALLBACK (Aún descargando de la API)
    const abortCtrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      personaService
        .searchCalles(
          { localidad_id: localidadId, q: term, limit: 15 },
          { signal: abortCtrl.signal },
        )
        .then((r) => {
          setCalles(r?.data?.data || r?.data || r || []);
        })
        .catch((err) => {
          if (err.name !== "CanceledError" && err.name !== "AbortError") {
            setCalles([]);
          }
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      abortCtrl.abort();
    };
  }, [localidadId, term, shouldSearch, localPool]);

  const clearCalles = useCallback(() => {
    setCalles([]);
  }, []);

  return { calles, loading, setCalles: clearCalles };
}