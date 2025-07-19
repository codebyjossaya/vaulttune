/// <reference types="vite/client" />


interface ElectronAPI {
  ping: () => string;
  getAuthState: () => Promise<boolean>;
}

interface Window {
  electronAPI: ElectronAPI;
}
