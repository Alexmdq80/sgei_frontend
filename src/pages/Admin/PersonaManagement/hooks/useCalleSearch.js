import { useState, useEffect, useCallback } from "react";
import personaService from "../../../../services/personaService";

export function useCalleSearch(localidadId, query, calleId) {
  const [fetchedCalles, setFetchedCalles] = useState([]);
  const [loading, setLoading] = useState(false);

  const term = (query || "").trim();
  // Determinamos durante el render si corresponde o no buscar
  const shouldSearch = Boolean(localidadId && term.length >= 3 && !calleId);

  useEffect(() => {
    // Si no corresponde buscar, salimos sin alterar estado sincrónicamente
    if (!shouldSearch) {
      return;
    }

    const abortCtrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      personaService
        .searchCalles(
          { localidad_id: localidadId, q: term, limit: 15 },
          { signal: abortCtrl.signal },
        )
        .then((r) => setFetchedCalles(r?.data?.data || r?.data || r || []))
        .catch((err) => {
          if (err.name !== "CanceledError" && err.name !== "AbortError") {
            setFetchedCalles([]);
          }
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      clearTimeout(timer);
      abortCtrl.abort();
    };
  }, [localidadId, term, shouldSearch]);

  // Si no se debe buscar, la lista siempre es []; si no, mostramos los resultados traídos
  const calles = shouldSearch ? fetchedCalles : [];

  // Función estable para vaciar manualmente desde manejadores de eventos si fuera necesario
  const clearCalles = useCallback(() => {
    setFetchedCalles([]);
  }, []);

  return { calles, loading, setCalles: clearCalles };
}
