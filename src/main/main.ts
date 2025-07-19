import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { ipcMain } from 'electron';
import { getAuthState } from './getAuthState';
const createWindow = () => {
    
    console.log("Executing Vite dev server...");
    const vite = spawn('npm',['run','dev'], { stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true });
    vite.on('error', (error) => {
        console.error(`Error starting Vite dev server: ${error.message}`);
        throw new Error(`Failed to start Vite dev server: ${error.message}`);
    });
    vite.stdout.on('data', (data: Buffer) => {
        const message = data.toString();
        console.log(`Vite dev server message: ${message}`);
        if (message.includes("Local:")) {
            console.log("Vite dev server is running successfully.");
            const win = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    contextIsolation: true,
                    preload: path.join(__dirname, '../preload/preload.js'),
                },
            });
            win.loadURL('http://localhost:5173'); // Adjust the URL if your Vite server runs on a different port
        }
        
    });
    vite.on('close', (code) => {
        console.log(`Vite dev server exited with code ${code}`);
    });

   
};
    

app.whenReady().then(createWindow);

// ipc handlers
ipcMain.handle('get-auth-state', async () => {
    try {
        const authState = await getAuthState();
        return authState;
    } catch (error) {
        console.error("Error getting auth state:", error);
        return false;
    }
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});