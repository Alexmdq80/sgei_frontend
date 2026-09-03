import { useState, useCallback, useRef, useEffect } from "react";
import geografiaService from "../../../../services/geografiaService";

/**
 * Normaliza la respuesta de los servicios geográficos:
 * soporta `r.data.data`, `r.data` o `r` directamente como array.
 */
const normalizeList = (r) => r?.data?.data || r?.data || r || [];

/**
 * Hook que maneja la cascada geográfica: Provincias -> Departamentos -> Localidades.
 * Incluye un token de petición para descartar respuestas desfasadas (anti-race).
 */
const useGeografiaCascade = () => {
  const [provincias, setProvincias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  // Token de petición: solo se aplica la respuesta más reciente.
  const requestIdRef = useRef(0);

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

  return {
    provincias,
    departamentos,
    localidades,
    loadDepartamentos,
    loadLocalidades,
    clearCascade,
    handleProvinciaChange,
    handleDepartamentoChange,
  };
};

export default useGeografiaCascade;
