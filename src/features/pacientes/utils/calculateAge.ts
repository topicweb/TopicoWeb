// ───────────────────────────────────────────────────────────────────────────────
// UTILIDAD: CÁLCULO DE EDAD
// Calcula la edad de un paciente basado en su fecha de nacimiento
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Calcula la edad de una persona en años basándose en su fecha de nacimiento
 * @param fechaNacimiento - Fecha de nacimiento en formato 'YYYY-MM-DD'
 * @returns La edad en años (número entero), o null si la fecha no es válida
 */
export function calculateAge(fechaNacimiento: string | null | undefined): number | null {
  if (!fechaNacimiento) return null;

  try {
    const birthDate = new Date(fechaNacimiento);
    
    // Validar que la fecha es válida
    if (isNaN(birthDate.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Si el cumpleaños aún no ha ocurrido este año, restar 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validar que la edad sea razonable (entre 0 y 150)
    if (age < 0 || age > 150) {
      return null;
    }

    return age;
  } catch {
    return null;
  }
}

/**
 * Formatea la edad de manera legible
 * @param edad - Edad en años
 * @returns Cadena formateada (ej: "25 años")
 */
export function formatAge(edad: number | null): string {
  if (edad === null) return 'N/A';
  return `${edad} ${edad === 1 ? 'año' : 'años'}`;
}

/**
 * Obtiene la fecha máxima permitida para nacimiento (hoy - 0 años)
 * Útil para validación en inputs type="date"
 */
export function getMaxBirthDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Obtiene la fecha mínima permitida para nacimiento (100 años atrás)
 * Útil para validación en inputs type="date"
 */
export function getMinBirthDate(): string {
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);
  return minDate.toISOString().split('T')[0];
}
