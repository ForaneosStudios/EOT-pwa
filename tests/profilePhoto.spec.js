import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cameraSupported, describeCameraError, fileToSquareJpeg, squareJpeg, stopStream, PHOTO_SIZE } from '../src/services/profilePhoto.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('detects whether the browser can open a camera', () => {
  expect(cameraSupported({ mediaDevices: { getUserMedia: () => {} } })).toBe(true);
  expect(cameraSupported({ mediaDevices: {} })).toBe(false);
  expect(cameraSupported({})).toBe(false);
  expect(cameraSupported(undefined)).toBe(false);
});

it('explains every camera failure in plain language', () => {
  expect(describeCameraError({ name: 'NotAllowedError' })).toMatch(/permiso/);
  expect(describeCameraError({ name: 'SecurityError' })).toMatch(/permiso/);
  expect(describeCameraError({ name: 'NotFoundError' })).toMatch(/No encontramos una cámara/);
  expect(describeCameraError({ name: 'NotReadableError' })).toMatch(/otra aplicación/);
  expect(describeCameraError({ name: 'OverconstrainedError' })).toMatch(/no es compatible/);
  expect(describeCameraError(new Error('boom'))).toBe('No se pudo abrir la cámara.');
});

it('stops every track so the camera light goes out', () => {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
  stopStream({ getTracks: () => tracks });
  expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(true);
  expect(() => stopStream(null)).not.toThrow();
});

function fakeCanvas() {
  const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toDataURL: vi.fn(() => 'data:image/jpeg;base64,AAAA') };
  vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'canvas' ? canvas : document.createElementNS('http://www.w3.org/1999/xhtml', tag)));
  return { canvas, context };
}

it('crops the center square of a landscape video and returns a small JPEG', () => {
  const { canvas, context } = fakeCanvas();
  const jpeg = squareJpeg({ videoWidth: 1280, videoHeight: 720 });
  expect(jpeg).toBe('data:image/jpeg;base64,AAAA');
  expect(canvas.width).toBe(PHOTO_SIZE);
  expect(canvas.height).toBe(PHOTO_SIZE);
  // The 720x720 center of a 1280x720 frame starts at x = 280.
  expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 280, 0, 720, 720, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', expect.any(Number));
});

it('crops a portrait picture from the center vertically', () => {
  const { context } = fakeCanvas();
  squareJpeg({ naturalWidth: 600, naturalHeight: 1000 });
  expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 200, 600, 600, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
});

it('refuses to capture before the video has a picture', () => {
  fakeCanvas();
  expect(() => squareJpeg({ videoWidth: 0, videoHeight: 0 })).toThrow(/no está lista/);
});

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
});

it('turns a chosen image file into the same square JPEG', async () => {
  fakeCanvas();
  class FakeImage {
    set src(value) { this.loaded = value; queueMicrotask(() => this.onload()); }
    get naturalWidth() { return 800; }
    get naturalHeight() { return 800; }
  }
  vi.stubGlobal('Image', FakeImage);
  const jpeg = await fileToSquareJpeg(new File(['x'], 'me.png', { type: 'image/png' }));
  expect(jpeg).toBe('data:image/jpeg;base64,AAAA');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});

it('rejects files that are not images or cannot be read', async () => {
  await expect(fileToSquareJpeg(new File(['x'], 'notes.txt', { type: 'text/plain' }))).rejects.toThrow(/no es una imagen/);
  fakeCanvas();
  class BrokenImage { set src(_v) { queueMicrotask(() => this.onerror()); } }
  vi.stubGlobal('Image', BrokenImage);
  await expect(fileToSquareJpeg(new File(['x'], 'bad.png', { type: 'image/png' }))).rejects.toThrow(/No se pudo leer/);
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
