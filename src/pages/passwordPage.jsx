import { useState } from 'react';
import { requestPasswordReset, updatePassword, logoutUser } from '../services/authService.js';
import { getApiErrorMessage } from '../services/apiClient.js';

export default function PasswordPage({ recovery, status, onLogin }) {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submitLabel = recovery ? 'Guardar contraseña' : 'Enviar enlace';

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      if (recovery) {
        await updatePassword(value);
        await logoutUser();
        onLogin();
      } else {
        await requestPasswordReset(value);
        setMessage('Si existe una cuenta con ese correo, recibirás un enlace para recuperar tu contraseña.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo completar la solicitud. Inténtalo de nuevo.'));
    } finally {
      setPending(false);
    }
  }

  return <main className="min-h-screen bg-void px-4 py-10 text-parchment">
    <section className="mx-auto max-w-md border border-gold-dim bg-panel p-8">
      <h1 className="font-display text-xl text-gold">{recovery ? 'Cambiar contraseña' : 'Recuperar contraseña'}</h1>
      {recovery && status === 'checking' && <p className="mt-4">Verificando enlace...</p>}
      {recovery && status === 'error' && <p role="alert" className="mt-4">El enlace no es válido o ha caducado. Solicita uno nuevo.</p>}
      {(!recovery || status === 'success') && <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label htmlFor="recovery-value">{recovery ? 'Nueva contraseña' : 'Correo electrónico'}</label>
        <input id="recovery-value" required minLength={recovery ? 8 : undefined} type={recovery ? 'password' : 'email'} autoComplete={recovery ? 'new-password' : 'email'} value={value} onChange={(event) => setValue(event.target.value)} className="border border-gold-dim bg-void p-3" />
        <button type="submit" disabled={pending} className="border border-gold bg-crimson-light p-3 disabled:opacity-60">{pending ? 'Enviando...' : submitLabel}</button>
      </form>}
      {message && <output className="mt-4 block text-success">{message}</output>}
      {error && <p role="alert" className="mt-4 text-error">{error}</p>}
      <button type="button" onClick={onLogin} className="mt-6 text-gold underline">Volver a iniciar sesión</button>
    </section>
  </main>;
}
