import { useState, useEffect } from 'react';

// ───────────────────────────────────────────────────────────────────────────────
// BÚSQUEDA DE PACIENTES CON DEBOUNCE
// Hook para búsqueda reactiva con retraso para optimizar rendimiento
// ───────────────────────────────────────────────────────────────────────────────

interface UsePatientSearchReturn {
  searchTerm: string;
  debouncedTerm: string;
  isSearching: boolean;
  setSearchTerm: (term: string) => void;
}

export function usePatientSearch(initialTerm = ''): UsePatientSearchReturn {
  const [searchTerm, setSearchTerm] = useState(initialTerm);
  const [debouncedTerm, setDebouncedTerm] = useState(initialTerm);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return {
    searchTerm,
    debouncedTerm,
    isSearching,
    setSearchTerm,
  };
}
