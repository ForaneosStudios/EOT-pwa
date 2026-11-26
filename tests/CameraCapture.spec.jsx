import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CameraCapture from '../src/components/profile/CameraCapture.jsx';
import * as photo from '../src/services/profilePhoto.js';

vi.mock('../src/services/profilePhoto.js', async (importOriginal) => ({
  ...(await importOriginal()),
  squareJpeg: vi.fn(() => 'data:image/jpeg;base64,CAPTURED'),
  fileToSquareJpeg: vi.fn(async () => 'data:image/jpeg;base64,FROMFILE'),
}));

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] };

function renderDialog(props = {}) {
  const handlers = { onConfirm: vi.fn(), onClose: vi.fn() };
  render(<MemoryRouter><CameraCapture {...handlers} {...props} /></MemoryRouter>);
  return handlers;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});
afterEach(cleanup);

const accept = () => fireEvent.click(screen.getByRole('checkbox'));

it('asks for consent before anything can be opened', () => {
  renderDialog();
  expect(screen.getByRole('button', { name: 'Abrir cámara' }).disabled).toBe(true);
  expect(screen.getByLabelText(/Elegir una foto/).disabled).toBe(true);
  expect(screen.getByRole('link', { name: 'aviso de privacidad' }).getAttribute('href')).toBe('/privacidad');
  expect(screen.getByRole('link', { name: 'términos' }).getAttribute('href')).toBe('/terminos');
  expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
});

it('opens the front camera after consent, takes the photo and confirms it', async () => {
  const { onConfirm } = renderDialog();
  accept();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }));
  expect(await screen.findByLabelText('Vista de la cámara')).toBeTruthy();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.objectContaining({ facingMode: 'user' }) }));

  fireEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));
  expect(await screen.findByAltText('Vista previa de tu foto de perfil')).toBeTruthy();
  expect(track.stop).toHaveBeenCalled(); // the camera is off once the photo is taken

  fireEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));
  expect(onConfirm).toHaveBeenCalledWith('data:image/jpeg;base64,CAPTURED');
});

it('can retake the photo', async () => {
  renderDialog();
  accept();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Tomar foto' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Repetir' }));
  expect(await screen.findByLabelText('Vista de la cámara')).toBeTruthy();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
});

it('switches the camera off when the dialog closes', async () => {
  const { onClose } = renderDialog();
  accept();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }));
  await screen.findByLabelText('Vista de la cámara');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(onClose).toHaveBeenCalled();
  cleanup(); // unmount, as the page does when it closes the dialog
  expect(track.stop).toHaveBeenCalled();
});

it('closes with Escape unless a photo is being saved', () => {
  const { onClose } = renderDialog();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  cleanup();
  const saving = renderDialog({ saving: true });
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(saving.onClose).not.toHaveBeenCalled();
});

it('explains a denied permission and keeps the file option available', async () => {
  navigator.mediaDevices.getUserMedia.mockRejectedValue({ name: 'NotAllowedError' });
  renderDialog();
  accept();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/No diste permiso/);
  expect(screen.getByLabelText(/Elegir una foto/).disabled).toBe(false);
});

it('offers the file option when the browser has no camera API', () => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  renderDialog();
  accept();
  expect(screen.getByText(/no permite usar la cámara/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Abrir cámara' }).disabled).toBe(true);
  expect(photo.cameraSupported()).toBe(false);
});

it('uses a chosen file as the photo', async () => {
  const { onConfirm } = renderDialog();
  accept();
  const input = screen.getByLabelText(/Elegir una foto/);
  fireEvent.change(input, { target: { files: [new File(['x'], 'me.png', { type: 'image/png' })] } });
  expect(await screen.findByAltText('Vista previa de tu foto de perfil')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Usar esta foto' }));
  expect(onConfirm).toHaveBeenCalledWith('data:image/jpeg;base64,FROMFILE');
});

it('shows a message when the chosen file cannot be read', async () => {
  photo.fileToSquareJpeg.mockRejectedValueOnce(new Error('bad'));
  renderDialog();
  accept();
  fireEvent.change(screen.getByLabelText(/Elegir una foto/), { target: { files: [new File(['x'], 'x.png', { type: 'image/png' })] } });
  expect((await screen.findByRole('alert')).textContent).toMatch(/No se pudo leer esa imagen/);
});

it('shows the saving state and the server error inside the dialog', async () => {
  renderDialog({ saving: true, error: 'La foto es demasiado grande.' });
  accept();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Tomar foto' }));
  expect((await screen.findByRole('button', { name: 'Guardando...' })).disabled).toBe(true);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('La foto es demasiado grande.'));
});

it('does not break when the video frame is not ready to capture', async () => {
  photo.squareJpeg.mockImplementationOnce(() => { throw new Error('not ready'); });
  renderDialog();
  accept();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Tomar foto' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/No se pudo tomar la foto/);
});
