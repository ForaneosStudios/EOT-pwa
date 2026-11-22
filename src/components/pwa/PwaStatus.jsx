import { useEffect, useState, useSyncExternalStore } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { PwaInstallContext } from './pwaInstallContext.js';
import PendingActions from './PendingActions.jsx';
import { staleData } from '../../services/offline/readCache.js';

const savedAtLabel = (time) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(time));

export default function PwaStatus({ children }) {
  const online = useOnlineStatus();
  // Set while a screen shows data saved on the device instead of fresh data from the server.
  const staleSince = useSyncExternalStore(staleData.subscribe, staleData.getSnapshot, staleData.getSnapshot);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    function onInstallAvailable(event) { event.preventDefault(); setInstallPrompt(event); }
    function onInstalled() { setInstallPrompt(null); }
    window.addEventListener('beforeinstallprompt', onInstallAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onInstallAvailable); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  async function install() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    try { await installPrompt.prompt(); } catch { /* The browser may withdraw the prompt. */ }
    finally { setInstallPrompt(null); setInstalling(false); }
  }

  const value = { canInstall: Boolean(installPrompt), installing, install };
  return <PwaInstallContext.Provider value={value}>{!online && <output className="block border-b border-warning bg-panel px-4 py-3 text-center text-sm text-warning">Sin conexión. Algunas funciones y datos necesitan internet. Lo que publiques se enviará al reconectar.</output>}{staleSince !== null && <output className="block border-b border-gold-dim bg-panel px-4 py-2 text-center text-xs text-muted">Mostrando datos guardados en este dispositivo el {savedAtLabel(staleSince)}. Pueden no estar actualizados.</output>}<PendingActions />{children}</PwaInstallContext.Provider>;
}
