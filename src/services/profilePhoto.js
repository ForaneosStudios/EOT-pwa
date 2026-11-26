// Helpers for the camera profile photo: feature detection, readable camera errors, and turning what the
// camera (or a chosen file) shows into the small square JPEG that is sent to the server. The server
// reduces it again and strips metadata; the reduction here keeps the request small enough for the
// offline queue and the idempotency limit.

export const PHOTO_SIZE = 384;
export const PHOTO_QUALITY = 0.82;

/** True when the browser can open a camera (it also needs HTTPS, which the PWA always uses). */
export function cameraSupported(nav = globalThis.navigator) {
  return Boolean(nav?.mediaDevices?.getUserMedia) && globalThis.isSecureContext !== false;
}

export function describeCameraError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'No diste permiso para usar la cámara. Puedes activarlo en los ajustes del navegador o elegir una foto de tu dispositivo.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No encontramos una cámara en este dispositivo. Puedes elegir una foto guardada.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
    case 'OverconstrainedError':
      return 'La cámara de este dispositivo no es compatible. Puedes elegir una foto guardada.';
    default:
      return 'No se pudo abrir la cámara.';
  }
}

/** Turns the camera off (the light goes out) by stopping every track of the stream. */
export function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

/** Draws the centered square of a video or image on a canvas and returns it as a JPEG data URL. */
export function squareJpeg(source, { size = PHOTO_SIZE, quality = PHOTO_QUALITY } = {}) {
  const width = source.videoWidth || source.naturalWidth || source.width;
  const height = source.videoHeight || source.naturalHeight || source.height;
  if (!width || !height) throw new Error('La imagen no está lista.');
  const side = Math.min(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Same as squareJpeg for a file chosen from the device (the fallback when the camera is not available). */
export async function fileToSquareJpeg(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      image.src = url;
    });
    return squareJpeg(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}
