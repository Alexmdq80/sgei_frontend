import { useState, useEffect, useCallback } from "react";
import personaService from "../../../../services/personaService";

export function useCalleSearch(localidadId, query, calleId) {
  const [data, setData] = useState({ localidadId: null, calles: [] });
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
        .then((r) => {
          setData({
            localidadId,
            calles: r?.data?.data || r?.data || r || [],
          });
        })
        .catch((err) => {
          if (err.name !== "CanceledError" && err.name !== "AbortError") {
            setData({ localidadId, calles: [] });
          }
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      clearTimeout(timer);
      abortCtrl.abort();
    };
  }, [localidadId, term, shouldSearch]);

  // Si no se debe buscar o los datos corresponden a otra localidad, la lista siempre es []
  const calles =
    shouldSearch && data.localidadId === localidadId ? data.calles : [];

  // Función estable para vaciar manualmente desde manejadores de eventos si fuera necesario
  const clearCalles = useCallback(() => {
    setData({ localidadId: null, calles: [] });
  }, []);

  return { calles, loading, setCalles: clearCalles };
}
