import { useEffect, useState } from 'react';
import Sidebar from '../components/landing/sidebar.jsx';
import PageHeader from '../components/landing/pageHeader.jsx';
import { navigationItems } from '../components/landing/navigation.js';
import { apiClient, getApiErrorMessage } from '../services/apiClient.js';

export default function ProfilePage({ user, onLogout, message }) {
  const [progress, setProgress] = useState({ loading: true, count: null, error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/user-achievements/me', { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Respuesta inválida');
      setProgress({ loading: false, count: data.filter((achievement) => achievement.isUnlocked === true).length, error: '' });
    }).catch((error) => {
      if (!controller.signal.aborted) setProgress({ loading: false, count: null, error: getApiErrorMessage(error, 'No se pudo cargar el progreso.') });
    });
    return () => controller.abort();
  }, [attempt, user.userId]);

  function retry() {
    setProgress({ loading: true, count: null, error: '' });
    setAttempt((value) => value + 1);
  }

  return <div className="flex min-h-screen flex-col bg-void md:flex-row">
    <Sidebar navItems={navigationItems} />
    <main className="flex-1 px-6 py-8 md:px-10">
      <div className="mx-auto max-w-4xl">
        <PageHeader eyebrow="Registro VI · Identidad" title="El Perfil del Heredero" subtitle="Tu identidad y tus hazañas dentro del reino." />
        <section className="mt-8 border border-gold-dim bg-panel p-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <div aria-hidden="true" className="flex h-36 w-36 shrink-0 items-center justify-center border border-gold bg-crimson/25 font-display text-4xl text-gold">♛</div>
            <div>
              <h2 className="font-display text-xl uppercase text-parchment">{user.username}</h2>
              <p className="mt-4 text-muted">Jugador de Echoes of the Throne</p>
              {progress.loading && <output className="mt-5 block text-gold">Cargando logros...</output>}
              {progress.count !== null && <p className="mt-5 uppercase text-gold">{progress.count} logros desbloqueados</p>}
              {progress.error && <div className="mt-5"><p role="alert" className="text-error">{progress.error}</p><button type="button" onClick={retry} className="mt-2 text-gold underline">Reintentar</button></div>}
            </div>
          </div>
          <p className="mt-8 border-t border-gold-dim pt-6 text-muted">Estado de cuenta: Sesión iniciada</p>
        </section>
        <h2 className="mt-10 font-display text-lg uppercase text-parchment">Mi registro</h2>
        <section className="mt-4 border border-gold-dim bg-panel p-7">
          <h3 className="font-display text-parchment">✦ &nbsp; Logros y progreso</h3>
          <p className="mt-4 text-sm text-muted">Consulta tus hazañas y las reliquias que faltan por obtener.</p>
        </section>
        {message && <p role="alert" className="mt-4 text-error">{message}</p>}
        <button type="button" onClick={onLogout} className="mt-8 border border-gold bg-crimson px-6 py-3 font-display text-sm uppercase text-parchment hover:bg-crimson-light">Cerrar sesión</button>
      </div>
    </main>
  </div>;
}
