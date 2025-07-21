/// <reference types="vite/client" />

import type { Options } from "./interfaces/types";
import type { AuthState } from "./types/types";

interface ElectronAPI {
  ping: () => string;
  getAuthState: () => Promise<AuthState>;
  signIn: (api?: string) => Promise<AuthState>;
  signOut: () => Promise<void>;
  serverStatus: () => Promise<"online" | "offline" | "error">;
  serverSettings: () => Promise<Options | undefined>;
  setServerSettings: (settings: Options) => Promise<boolean>;
  startServer: () => Promise<boolean>;
  stopServer: () => Promise<boolean>;
  promptForFolder: () => Promise<string | null>;

}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

