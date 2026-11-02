import { createContext, useContext } from 'react';

export const PwaInstallContext = createContext({ canInstall: false, installing: false, install: async () => {} });

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
