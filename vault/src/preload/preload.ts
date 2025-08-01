import { contextBridge } from 'electron';
import { ipcRenderer } from 'electron';
import { Options } from "../src/types/types";

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => 'pong',
  getAuthState: () => ipcRenderer.invoke('get-auth-state'),
  signIn: (api?: string) => ipcRenderer.invoke('sign-in', api),
  signOut: () => ipcRenderer.invoke('sign-out'),
  getUsers: () => ipcRenderer.invoke('get-users'),
  getPendingRequests: () => ipcRenderer.invoke('get-pending-requests'),
  cancelRequest: (email: string) => ipcRenderer.invoke('cancel-request', email),
  inviteUser: (email: string) => ipcRenderer.invoke('invite-user', email),
  serverStatus: () => ipcRenderer.invoke('server-status'),
  serverSettings: () => ipcRenderer.invoke('get-server-settings'),
  setServerSettings: (settings: Options) => ipcRenderer.invoke('set-server-settings', settings),
  startServer: () => ipcRenderer.invoke('start-server'),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  promptForFolder: () => ipcRenderer.invoke('prompt-for-folder'),
  setNotificationCallback: (callback: (message: string, type: "success" | "error" | "warning") => void) => {
    console.log("Setting notification callback");
    ipcRenderer.on('notification', (event, message, type) => {
      callback(message, type);
    });
  }
});

