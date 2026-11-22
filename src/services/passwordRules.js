// Same rules everywhere a password is chosen (sign-up, profile, reset). The backend enforces them too.
export const PASSWORD_HELP = 'Mínimo 8 caracteres, con una mayúscula y un número.';
export const PASSWORD_MAX_LENGTH = 72;

export function passwordError(value) {
  if (!value) return 'La contraseña es obligatoria.';
  if (value.length < 8) return 'Debe tener al menos 8 caracteres.';
  if (value.length > PASSWORD_MAX_LENGTH) return `No puede superar ${PASSWORD_MAX_LENGTH} caracteres.`;
  if (!/[A-Z]/.test(value) || !/\d/.test(value)) return 'Incluye al menos una mayúscula y un número.';
  return '';
}
