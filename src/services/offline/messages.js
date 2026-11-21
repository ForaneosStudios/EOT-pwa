export const QUEUED_MESSAGE = 'Sin conexión: se enviará automáticamente al recuperar internet.';

const STATUS_MESSAGES = {
  400: 'El servidor rechazó los datos enviados.',
  403: 'Ya no tienes permiso para realizar esta acción.',
  404: 'El recurso ya no existe.',
  409: 'La acción entra en conflicto con los datos actuales.',
  422: 'La solicitud no se pudo procesar.',
};

export function outboxErrorMessage(lastError) {
  if (!lastError) return '';
  if (lastError.code === 'STALE_WRITE') return 'Otra edición más reciente, hecha desde otro dispositivo, ya se aplicó.';
  if (lastError.message) return lastError.message;
  if (!lastError.status) return 'Sin conexión con el servidor.';
  return STATUS_MESSAGES[lastError.status] || `Error del servidor (${lastError.status}).`;
}

export const OUTBOX_STATUS_LABELS = {
  queued: 'Pendiente',
  sending: 'Enviando…',
  failed: 'No se pudo enviar',
  superseded: 'Superada por una edición más reciente',
};

// Label of the button that applies a failed or superseded item again.
export const retryLabel = (item) => (item.status === 'superseded' ? 'Aplicar de todos modos' : 'Reintentar');

export const canRetry = (item) => item.status === 'failed' || item.status === 'superseded';
