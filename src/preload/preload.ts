import { contextBridge } from 'electron';
import { ipcRenderer } from 'electron';
import { Options } from 'src/types/types';


contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => 'pong',
  getAuthState: () => ipcRenderer.invoke('get-auth-state'),
  signIn: (api?: string) => ipcRenderer.invoke('sign-in', api),
  signOut: () => ipcRenderer.invoke('sign-out'),
  getUsers: () => ipcRenderer.invoke('get-users'),
  serverStatus: () => ipcRenderer.invoke('server-status'),
  serverSettings: () => ipcRenderer.invoke('get-server-settings'),
  setServerSettings: (settings: Options) => ipcRenderer.invoke('set-server-settings', settings),
  startServer: () => ipcRenderer.invoke('start-server'),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  promptForFolder: () => ipcRenderer.invoke('prompt-for-folder'),
});

ipcRenderer.on('error', (event, ...args) => {
  console.log('Received error event:', event, args);
});