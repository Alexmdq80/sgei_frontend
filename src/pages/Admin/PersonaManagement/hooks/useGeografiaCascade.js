import { useState, useCallback, useRef, useEffect } from "react";
import geografiaService from "../../../../services/geografiaService";
import nacionService from "../../../../services/nacionService";
import { esNacionArgentina } from "../utils/nacionUtils";

/**
 * Normaliza la respuesta de los servicios geográficos:
 * soporta `r.data.data`, `r.data` o `r` directamente como array.
 */
const normalizeList = (r) => r?.data?.data || r?.data || r || [];

/**
 * Hook que maneja la cascada geográfica: Provincias -> Departamentos -> Localidades.
 * Incluye un token de petición para descartar respuestas desfasadas (anti-race).
 * Además carga el catálogo de naciones y controla que la cascada Argentina
 * sólo se habilite cuando el país seleccionado es Argentina.
 */
const useGeografiaCascade = () => {
  const [nacions, setNacions] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  // Token de petición: solo se aplica la respuesta más reciente.
  const requestIdRef = useRef(0);

  // Carga inicial de provincias (flujo de nacimiento de PersonaFormModal).
  useEffect(() => {
    let active = true;
    geografiaService
      .getProvincias()
      .then((r) => {
        if (active) setProvincias(normalizeList(r));
      })
      .catch((error) => {
        console.error("Error al cargar provincias:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  // Carga el catálogo de naciones/países.
  useEffect(() => {
    let active = true;
    nacionService
      .getAll({ per_page: 1000, search: "" })
      .then((r) => {
        if (active) setNacions(normalizeList(r));
      })
      .catch((error) => {
        console.error("Error al cargar naciones:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadDepartamentos = useCallback(async (provinciaId) => {
    if (!provinciaId) {
      setDepartamentos([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    try {
      const r = await geografiaService.getDepartamentos(provinciaId);
      if (requestId === requestIdRef.current) {
        setDepartamentos(normalizeList(r));
      }
    } catch (error) {
      console.error("Error al cargar departamentos:", error);
    }
  }, []);

  const loadLocalidades = useCallback(async (departamentoId) => {
    if (!departamentoId) {
      setLocalidades([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    try {
      const r = await geografiaService.getLocalidades(departamentoId);
      if (requestId === requestIdRef.current) {
        setLocalidades(normalizeList(r));
      }
    } catch (error) {
      console.error("Error al cargar localidades:", error);
    }
  }, []);

  const clearCascade = useCallback(() => {
    ++requestIdRef.current; // invalida peticiones en vuelo
    setDepartamentos([]);
    setLocalidades([]);
  }, []);

  // Vacía la cascada geográfica argentina (provincias/departamentos/localidades).
  const clearGeoArgentina = useCallback(() => {
    ++requestIdRef.current; // invalida peticiones en vuelo
    setProvincias([]);
    setDepartamentos([]);
    setLocalidades([]);
  }, []);

  const handleProvinciaChange = useCallback(
    async (provinciaId) => {
      setDepartamentos([]);
      setLocalidades([]);
      if (!provinciaId) return;
      await loadDepartamentos(provinciaId);
    },
    [loadDepartamentos],
  );

  const handleDepartamentoChange = useCallback(
    async (departamentoId) => {
      setLocalidades([]);
      if (!departamentoId) return;
      await loadLocalidades(departamentoId);
    },
    [loadLocalidades],
  );

  const handleNacionChange = useCallback(
    (nacionId) => {
      if (!nacionId || !esNacionArgentina(nacions, nacionId)) {
        clearGeoArgentina();
        return;
      }
      // Argentina: volver a cargar provincias (idempotente).
      geografiaService
        .getProvincias()
        .then((r) => setProvincias(normalizeList(r)))
        .catch((error) => console.error("Error al cargar provincias:", error));
    },
    [nacions, clearGeoArgentina],
  );

  return {
    nacions,
    provincias,
    departamentos,
    localidades,
    isNacionArgentinaValue: (nacionId) => esNacionArgentina(nacions, nacionId),
    loadDepartamentos,
    loadLocalidades,
    clearCascade,
    clearGeoArgentina,
    handleProvinciaChange,
    handleDepartamentoChange,
    handleNacionChange,
  };
};

export default useGeografiaCascade;
