import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { PwaInstallContext } from './pwaInstallContext.js';

export default function PwaStatus({ children }) {
  const online = useOnlineStatus();
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
  return <PwaInstallContext.Provider value={value}>{!online && <output className="block border-b border-warning bg-panel px-4 py-3 text-center text-sm text-warning">Sin conexión. Algunas funciones y datos necesitan internet.</output>}{children}</PwaInstallContext.Provider>;
}
