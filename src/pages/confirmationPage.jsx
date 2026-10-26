import { useState } from 'react';
import { resendConfirmation } from '../services/authService.js';
import { getApiErrorMessage } from '../services/apiClient.js';

export default function ConfirmationPage({ status, onLogin }) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleResend(event) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    setError('');
    try {
      await resendConfirmation(email);
      setMessage('Si la cuenta necesita confirmación, recibirás un correo. Revisa también la carpeta de spam.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo enviar el correo. Inténtalo de nuevo.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-void px-4 py-10 text-parchment sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-gold-dim pb-5">
          <p className="font-display text-xs uppercase tracking-widest text-gold">Echoes of the Throne</p>
          <h1 className="mt-3 font-display text-2xl sm:text-3xl">El umbral del heredero</h1>
        </header>
        <section aria-live="polite" className="mx-auto mt-10 max-w-lg border border-gold-dim bg-panel px-6 py-10 text-center sm:px-12">
          <p className="font-display text-3xl text-gold" aria-hidden="true">✦</p>
          {status === 'checking' && <h2 className="mt-5 font-display text-lg text-gold">Verificando tu correo...</h2>}
          {status === 'success' && <>
            <h2 className="mt-5 font-display text-lg text-gold">Correo confirmado</h2>
            <p className="mt-4 leading-7 text-parchment/90">Tu cuenta está lista. Ya puedes iniciar sesión y continuar tu aventura.</p>
          </>}
          {status === 'error' && <>
            <h2 className="mt-5 font-display text-lg text-gold">No se pudo confirmar el enlace</h2>
            <p className="mt-4 leading-7 text-parchment/90">Puede haber caducado o ya haberse utilizado. Si ya confirmaste tu correo, intenta iniciar sesión; si no, solicita otro enlace.</p>
            <form onSubmit={handleResend} className="mt-6 text-left">
              <label htmlFor="resend-email" className="font-display text-sm text-gold">Correo electrónico</label>
              <input id="resend-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full border border-gold-dim bg-void px-3 text-parchment focus:border-gold focus:outline-none" />
              <button type="submit" disabled={pending} className="mt-4 w-full border border-gold px-4 py-3 font-display text-sm uppercase text-gold hover:bg-gold-dim disabled:opacity-60">{pending ? 'Enviando...' : 'Enviar otro enlace'}</button>
            </form>
            {message && <p role="status" className="mt-4 text-sm text-success">{message}</p>}
            {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
          </>}
          {status !== 'checking' && <button type="button" onClick={onLogin} className="mt-7 w-full border border-gold bg-crimson-light px-4 py-3 font-display text-sm uppercase hover:bg-crimson focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Ir a iniciar sesión</button>}
        </section>
      </div>
    </main>
  );
}
