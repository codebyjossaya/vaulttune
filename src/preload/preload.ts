import { contextBridge } from 'electron';
import { ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => 'pong',
  getAuthState: () => ipcRenderer.invoke('get-auth-state'),
});