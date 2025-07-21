import { app, BrowserWindow } from 'electron';
import path from 'path';
// import { spawn } from 'child_process';
import { ipcMain } from 'electron';
import { getAuthState } from './getAuthState';
import Server from '../classes/server';
import { authHandler } from './authHandler';
import { getSettings } from './getSettings';
import { promptHandler } from './promptHandler';
import { existsSync, readFileSync } from 'fs';
import keytar from 'keytar'

let server: Server;


const start = async () => {
    if (existsSync(`${process.env.HOME}/VaultTune/settings/server.json`)) {
        server = await Server.fromJSON(JSON.parse(readFileSync(`${process.env.HOME}/VaultTune/settings/server.json`, 'utf-8')));
    }
    else {
        server = new Server();
        console.log("No server settings found, using default settings.");
    }
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/preload.js'),
        },
        autoHideMenuBar: true
    });
    win.loadURL('http://localhost:5173');

};

app.whenReady().then(start);

// ipc handlers
ipcMain.handle('get-auth-state', async () => {
    try {
        const authState = await getAuthState();
        server.user = authState.user; // Store the auth state in the server instance
        return authState;
    } catch (error) {
        console.error("Error getting auth state:", error);
        return { authenticated: false };
    }
});
ipcMain.handle('server-status', () => {
    return server.state;
});

ipcMain.handle('sign-in', authHandler);

ipcMain.handle('sign-out', async () => {
    try {
        server.user = null; // Clear the user from the server instance
        await server.export(); // Save the updated server state
        if (server.state === 'online') {
            await server.stop(); // Stop the server if it's running
        }
        await keytar.deletePassword('vaulttune', 'token'); // Remove user credentials from keytar
        console.log("User signed out successfully.");
    } catch (error) {
        console.error("Error signing out:", error);
        return false;
    }
});

ipcMain.handle('get-server-settings', getSettings);

ipcMain.handle('prompt-for-folder', promptHandler);

ipcMain.handle('owner', () => server.user);

ipcMain.handle('set-server-settings', async (event, settings) => {
    try {
        console.log("Setting server settings..");
        await server.setOptions(settings);
        console.log(path.join(__dirname, '../config.json'))
        await server.export();
        console.log("Server settings updated:", server.options);
        return true;
    } catch (error) {
        console.error("Error setting server settings:", error);
        return false;
    }
});

ipcMain.handle('start-server', async () => {
    try {
        await server.start();
        return true;
    } catch (error) {
        console.error("Error starting server:", error);
        return false;
    }
});

ipcMain.handle('stop-server', async () => {
    try {
        await server.stop();
        return true;
    } catch (error) {
        console.error("Error stopping server:", error);
        return false;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

export { server };