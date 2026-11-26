import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cameraSupported, describeCameraError, fileToSquareJpeg, squareJpeg, stopStream } from '../../services/profilePhoto.js';

// Dialog to take the profile photo: explicit consent first, then the camera, then a preview to confirm.
// The camera is only on while the live view is shown, and is always switched off when the dialog closes.
export default function CameraCapture({ onConfirm, onClose, saving = false, error = '' }) {
  const [step, setStep] = useState('consent'); // consent -> camera -> preview
  const [accepted, setAccepted] = useState(false);
  const [problem, setProblem] = useState('');
  const [photo, setPhoto] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const supported = cameraSupported();

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);
  useEffect(() => {
    if (step === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play?.()?.catch?.(() => {});
    }
  }, [step]);

  async function openCamera() {
    setProblem('');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      });
      setStep('camera');
    } catch (cameraError) {
      setProblem(describeCameraError(cameraError));
    }
  }

  function takePhoto() {
    try {
      setPhoto(squareJpeg(videoRef.current));
      stopCamera();
      setStep('preview');
    } catch {
      setProblem('No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  }

  async function chooseFile(event) {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;
    setProblem('');
    try {
      setPhoto(await fileToSquareJpeg(file));
      stopCamera();
      setStep('preview');
    } catch {
      setProblem('No se pudo leer esa imagen. Elige otra.');
    }
  }

  function retake() {
    void openCamera();
  }

  const buttonClass = 'border px-4 py-3 font-display text-xs uppercase disabled:cursor-not-allowed disabled:opacity-60';
  const primary = `${buttonClass} border-gold bg-crimson text-parchment hover:bg-crimson-light`;
  const secondary = `${buttonClass} border-gold-dim text-gold hover:border-gold`;

  return <div className="modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-void/95 p-4" role="dialog" aria-modal="true" aria-labelledby="camera-title">
    <div className="modal-panel mx-auto mt-6 max-w-md border border-gold-dim bg-panel p-5 sm:p-6">
      <h2 id="camera-title" className="font-display text-lg uppercase text-parchment">Foto de perfil con la cámara</h2>

      {step === 'consent' && <>
        <p className="mt-3 text-sm text-muted">Tu foto aparecerá junto a tu nombre de usuario en el foro y el ranking, y podrá verla cualquier persona, tenga o no cuenta. La cámara solo se enciende mientras esta ventana está abierta; no se graba video.</p>
        <label className="mt-4 flex items-start gap-3 text-sm text-parchment">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
          <span>Acepto que mi foto sea visible para otros jugadores y visitantes. Leí el <Link to="/privacidad" target="_blank" rel="noreferrer" className="underline text-gold">aviso de privacidad</Link> y los <Link to="/terminos" target="_blank" rel="noreferrer" className="underline text-gold">términos</Link>.</span>
        </label>
        {!supported && <p className="mt-3 text-sm text-warning">Este navegador no permite usar la cámara aquí. Puedes elegir una foto guardada en tu dispositivo.</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={!accepted || !supported} onClick={() => void openCamera()} className={primary}>Abrir cámara</button>
          <label className={`${secondary} cursor-pointer ${accepted ? '' : 'pointer-events-none opacity-60'}`}>
            Elegir una foto
            <input type="file" accept="image/*" capture="user" disabled={!accepted} onChange={(event) => void chooseFile(event)} className="sr-only" />
          </label>
          <button type="button" onClick={onClose} className={secondary}>Cancelar</button>
        </div>
      </>}

      {step === 'camera' && <>
        <video ref={videoRef} playsInline muted autoPlay aria-label="Vista de la cámara" className="mt-4 aspect-square w-full bg-void object-cover [transform:scaleX(-1)]" />
        <p className="mt-2 text-xs text-muted">Encuadra tu rostro en el centro. La imagen se recorta en cuadrado.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={takePhoto} className={primary}>Tomar foto</button>
          <button type="button" onClick={onClose} className={secondary}>Cancelar</button>
        </div>
      </>}

      {step === 'preview' && <>
        <img src={photo} alt="Vista previa de tu foto de perfil" className="mt-4 aspect-square w-full border border-gold-dim object-cover" />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={saving} onClick={() => void onConfirm(photo)} className={primary}>{saving ? 'Guardando...' : 'Usar esta foto'}</button>
          <button type="button" disabled={saving} onClick={retake} className={secondary}>Repetir</button>
          <button type="button" disabled={saving} onClick={onClose} className={secondary}>Cancelar</button>
        </div>
      </>}

      {(problem || error) && <p role="alert" className="mt-4 text-sm text-error">{problem || error}</p>}
    </div>
  </div>;
}
