import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';

export default function PwaStatus() {
  const online = useOnlineStatus();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    function onInstallAvailable(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    function onInstalled() { setInstallPrompt(null); }
    window.addEventListener('beforeinstallprompt', onInstallAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
    } catch {
      // The browser may withdraw the prompt; another event can offer it again.
    } finally {
      setInstallPrompt(null);
      setInstalling(false);
    }
  }

  return <>
    {!online && <output className="block border-b border-warning bg-panel px-4 py-3 text-center text-sm text-warning">Sin conexión. Algunas funciones y datos necesitan internet.</output>}
    {installPrompt && <div className="flex flex-wrap items-center justify-center gap-3 border-b border-gold-dim bg-panel px-4 py-3 text-sm text-parchment">
      <span>Instala Echoes of the Throne para acceder desde tu dispositivo.</span>
      <button type="button" disabled={installing} onClick={install} className="border border-gold px-3 py-1 text-gold disabled:opacity-60">{installing ? 'Abriendo...' : 'Instalar'}</button>
      <button type="button" onClick={() => setInstallPrompt(null)} className="text-muted underline">Ahora no</button>
    </div>}
  </>;
}
