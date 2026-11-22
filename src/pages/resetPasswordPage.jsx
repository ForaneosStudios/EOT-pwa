import { useEffect, useState } from 'react';
import { confirmPasswordReset, validateResetToken } from '../services/authService.js';
import { getApiErrorMessage } from '../services/apiClient.js';
import FormField from '../components/formField.jsx';
import { PASSWORD_HELP, passwordError } from '../services/passwordRules.js';

function validate(password, confirmation) {
  const passwordMessage = passwordError(password);
  let confirmationMessage = '';
  if (!confirmation) confirmationMessage = 'Confirma tu contraseña.';
  else if (password !== confirmation) confirmationMessage = 'Las contraseñas no coinciden.';
  return { password: passwordMessage, confirmation: confirmationMessage };
}

// The link from the email carries a one-time token. Read it once and remove it from the address bar.
function takeToken() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  if (token) window.history.replaceState(null, '', window.location.pathname);
  return token;
}

export default function ResetPasswordPage({ onDone, onRequestNew }) {
  const [token] = useState(takeToken);
  const [status, setStatus] = useState(token ? 'checking' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    validateResetToken(token)
      .then((valid) => { if (active) setStatus(valid ? 'ready' : 'invalid'); })
      .catch(() => { if (active) setStatus('unreachable'); });
    return () => { active = false; };
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    const errors = validate(password, confirmation);
    setSubmitted(true);
    setFieldErrors(errors);
    if (errors.password || errors.confirmation) return;
    setPending(true);
    setError('');
    try {
      await confirmPasswordReset(token, password);
      onDone(true);
    } catch (err) {
      if (err?.response?.status === 400 && err.response.data?.code === 'BAD_REQUEST' && /enlace/i.test(err.response.data.message || '')) {
        setStatus('invalid');
      } else {
        setError(getApiErrorMessage(err, 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'));
      }
    } finally {
      setPending(false);
    }
  }

  return <main className="min-h-dvh bg-void px-4 py-10 text-parchment">
    <section className="mx-auto max-w-md border border-gold-dim bg-panel p-8">
      <h1 className="font-display text-xl text-gold">Nueva contraseña</h1>
      {status === 'checking' && <p className="mt-4">Verificando enlace...</p>}
      {status === 'unreachable' && <p role="alert" className="mt-4">No se pudo verificar el enlace. Revisa tu conexión e inténtalo de nuevo.</p>}
      {status === 'invalid' && <>
        <p role="alert" className="mt-4">El enlace no es válido o ya expiró (dura 10 minutos y solo se usa una vez).</p>
        <button type="button" onClick={onRequestNew} className="mt-4 border border-gold p-3">Solicitar un enlace nuevo</button>
      </>}
      {status === 'ready' && <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <FormField id="new-password" label="Nueva contraseña" type="password" autoComplete="new-password" showPasswordToggle helpText={PASSWORD_HELP}
          value={password} errorMessage={fieldErrors.password} isValid={submitted && !fieldErrors.password}
          onChange={(event) => { setPassword(event.target.value); if (submitted) setFieldErrors(validate(event.target.value, confirmation)); }} />
        <FormField id="confirm-password" label="Confirmar contraseña" type="password" autoComplete="new-password" showPasswordToggle helpText="Escribe de nuevo la misma contraseña."
          value={confirmation} errorMessage={fieldErrors.confirmation} isValid={submitted && !fieldErrors.confirmation}
          onChange={(event) => { setConfirmation(event.target.value); if (submitted) setFieldErrors(validate(password, event.target.value)); }} />
        <p className="text-sm text-parchment/70">Al guardarla se cerrarán todas tus sesiones (web y móvil).</p>
        <button type="submit" disabled={pending} className="border border-gold bg-crimson-light p-3 disabled:opacity-60">{pending ? 'Guardando...' : 'Guardar contraseña'}</button>
      </form>}
      {error && <p role="alert" className="mt-4 text-error">{error}</p>}
      <button type="button" onClick={() => onDone(false)} className="mt-6 text-gold underline">Volver a iniciar sesión</button>
    </section>
  </main>;
}
