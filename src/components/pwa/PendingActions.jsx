import { useState } from 'react';
import { useOutbox } from '../../hooks/useOutbox.js';
import { outbox } from '../../services/offline/index.js';
import { OUTBOX_STATUS_LABELS, canRetry, outboxErrorMessage, retryLabel } from '../../services/offline/messages.js';

// Global summary of mutations waiting to be sent, refused by the server after a replay, or
// superseded by a newer edit made on another device.
export default function PendingActions() {
  const { items, pending, failed, superseded, paused } = useOutbox();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  if (!pending && !failed && !superseded) return null;

  async function run(action) {
    setError('');
    try {
      await action();
    } catch {
      setError('No se pudo completar la acción. Inténtalo de nuevo.');
    }
  }

  const summary = [
    pending ? `${pending} ${pending === 1 ? 'acción pendiente' : 'acciones pendientes'} de enviar` : '',
    failed ? `${failed} sin enviar por un error` : '',
    superseded ? `${superseded} ${superseded === 1 ? 'superada' : 'superadas'} por ediciones más recientes` : '',
  ].filter(Boolean).join(' · ');

  return <section aria-label="Acciones sin conexión" className="border-b border-warning bg-panel px-4 py-2 text-sm text-warning">
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
      <output>{summary}{paused ? ' · Inicia sesión para enviarlas.' : ''}</output>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="text-xs uppercase text-gold underline">
        {open ? 'Ocultar' : 'Ver detalles'}
      </button>
    </div>
    {error && <p role="alert" className="mx-auto mt-2 max-w-5xl text-error">{error}</p>}
    {open && <ul className="mx-auto mt-2 grid max-w-5xl gap-2">
      {items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border border-gold-dim p-2 text-main">
        <span>
          <strong className="text-parchment">{item.label}</strong>
          <small className={`ml-2 ${item.status === 'failed' ? 'text-error' : 'text-warning'}`}>{OUTBOX_STATUS_LABELS[item.status] || item.status}</small>
          {item.lastError && <small className="block text-muted">{outboxErrorMessage(item.lastError)}</small>}
        </span>
        <span className="flex gap-3 text-xs">
          {canRetry(item) && <button type="button" onClick={() => void run(() => outbox.retry(item.id))} className="text-gold">{retryLabel(item)}</button>}
          {item.status === 'queued' && <button type="button" onClick={() => void run(() => outbox.sendNow())} className="text-gold">Enviar ahora</button>}
          {item.status !== 'sending' && <button type="button" onClick={() => void run(() => outbox.discard(item.id))} className="text-error">Descartar</button>}
        </span>
      </li>)}
    </ul>}
  </section>;
}
