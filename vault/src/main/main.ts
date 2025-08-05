import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { ipcMain } from 'electron';
import { getAuthState } from './getAuthState';
import Server from '../classes/server';
import { authHandler } from './authHandler';
import { getSettings } from './getSettings';
import { promptHandler } from './promptHandler';
import { existsSync, readFileSync } from 'fs';
import keytar from 'keytar'
import { User } from "../react/types/types";
import { PendingRequest } from "../react/types/types";
import { homedir } from 'os';
import isDev from "electron-is-dev"

const handleSquirrelEvent = () => {
    const squirrelCommand = process.argv[1];
    if (squirrelCommand === '--squirrel-install' || squirrelCommand === '--squirrel-updated') {
        // Handle installation or update
        const appFolder = path.resolve(process.execPath, '..');
        const rootAtomFolder = path.resolve(appFolder, '..');
        const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
        spawn(updateDotExe, ['--createShortcut', path.basename(process.execPath)]);
        return true;
    } else if (squirrelCommand === '--squirrel-uninstall') {
        keytar.deletePassword('vaulttune', 'token'); // Remove user credentials from keytar
        return true;
    } else if (squirrelCommand === '--squirrel-obsolete') {
        // Handle obsolete version
        return true;
    }
}

if (handleSquirrelEvent()) {
    app.quit();
}




let server: Server;


const start = async () => {
    const serverSettingsPath = path.join(app.getPath('home'), 'VaultTune', 'settings', 'server.json');
    console.log("Server settings path:", serverSettingsPath);
    const exists = existsSync(serverSettingsPath);
    if (exists) {
        server = await Server.fromJSON(JSON.parse(readFileSync(`${homedir()}/VaultTune/settings/server.json`, 'utf-8')));
        console.log("Server settings loaded from file:", server.options);
        const token = await keytar.getPassword('vaulttune', 'token');
        if (token !== null) {
            console.log("Token found in keytar, setting server token.");
            server.options.token = token;
            server.register().catch(error => {
                console.error("Error registering server:", error);
                server.notify("Error registering server: " + error.message, "error");
            });
            
        }
    }
    else {
        server = new Server();
        console.log("No server settings found, using default settings.");
    }
    
    const win = new BrowserWindow({
        width: exists ? 535 : 800,
        height: 894,
        minWidth: 535,
        minHeight: 894,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/preload.js'),
        },
        autoHideMenuBar: true
    });
    isDev ? win.loadURL('http://localhost:5173') : win.loadFile(path.join(__dirname, '../dist/index.html'));
    
    server.notify = (message: string, type: "success" | "error" | "warning") => {
        win.webContents.send('notification', message, type);
    }

    ipcMain.handle('get-auth-state', () => {
        return new Promise((resolve, reject) => {
            try {
                getAuthState().then(authState => {
                    if (!authState.authenticated) {
                        win.webContents.send('notification', 'You are not authenticated. Please sign in.', 'error');
                        resolve({ authenticated: false });
                    }
                    server.user = authState.user;
                    resolve(authState);
                    win.webContents.send('notification', 'Authenticated successfully', 'success');
                }).catch(error => {
                    win.webContents.send('notification', 'Error getting auth state: ' + error.message, 'error');
                    console.error("Error getting auth state:", error);
                    resolve({ authenticated: false });
                });
            } catch (error) {
                win.webContents.send('notification', 'Error getting auth state: ' + error.message, 'error');
                console.error("Error getting auth state:", error);
                reject();
            }
        });
        
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
            win.webContents.send('notification', 'Error signing out: ' + error.message, 'error');
            return false;
        }
    });

    ipcMain.handle('get-server-settings', getSettings);

    ipcMain.handle('prompt-for-folder', promptHandler);

    ipcMain.handle('owner', () => server.user);

    ipcMain.handle('set-server-settings', async (event, settings) => {
        try {
            console.log("Setting server settings..");
            await server.setOptions({...settings, api: server.options.api || 'https://api.vaulttune.jcamille.dev', token: settings.token || null});
            console.log(path.join(__dirname, '../config.json'))
            await server.export();
            console.log("Server settings updated:", server.options);
            
            console.log("Updating server settings in ", server.options.api);
            server.state == 'offline' ? await server.register() : await server.register("online");
            return true;
        } catch (error) {
            console.error("Error setting server settings:", error);
            win.webContents.send('notification', 'Error setting server settings: ' + error.message, 'error');
            return false;
        }
    });

    ipcMain.handle('start-server', async () => {
        try {
            await server.start();
            console.log("emitting notification...")
            console.log(win.webContents.send('notification', 'Server started successfully', 'success'));
            return true;
        } catch (error) {
            console.error("Error starting server:", error);
            win.webContents.send('notification', 'Error starting server: ' + error.message, 'error');
            return false;
        }
    });

    ipcMain.handle('stop-server', async () => {
        try {
            await server.stop();
            win.webContents.send('notification', 'Server stopped successfully', 'success');
            return true;
        } catch (error) {
            console.error("Error stopping server:", error);
            win.webContents.send('notification', 'Error stopping server: ' + error.message, 'error');
            return false;
        }
    });

    ipcMain.handle('get-users', () => {
        return new Promise((resolve, reject) => {
            console.log("Options", server.options)
            fetch(`${server.options.api}/vaulttune/vault/getUsers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }, body: JSON.stringify({
                    vault_token: server.options.token,
                })
            }).then(async (response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch users" + await response.text());
                }
                return response.json();
            }).then((data: User[]) => {
                if (data) {
                    resolve(data);
                }
            }).catch((error) => {
                win.webContents.send('notification', 'Error fetching users: ' + error.message, 'error');
                console.error("Error fetching users:", error);
                reject(error);
            });
        });
        
    });

    ipcMain.handle('get-pending-requests', () => {
        return new Promise((resolve, reject) => {
            console.log("Fetching pending requests...");
            fetch(`${server.options.api}/vaulttune/vault/requests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    vault_token: server.options.token,
                })
            }).then(async response => {
                if (!response.ok) {
                    throw new Error("Failed to fetch pending requests" + await response.text());
                }
                return response.json();
            }).then((data: PendingRequest[]) => {
                if (data) {
                    resolve(data);
                }
            }).catch((error) => {
                console.error("Error fetching pending requests:", error);
                win.webContents.send('notification', 'Error fetching pending requests: ' + error.message, 'error');
                reject(error);
            });
        });
    });

    ipcMain.handle('invite-user', (event, email) => {
        return new Promise((resolve, reject) => {
            console.log("Inviting user:", email);
            console.log("Vault token exists?", server.options.token ? true : false);
            fetch(`${server.options.api}/vaulttune/vault/addUser`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    vault_token: server.options.token,
                    user_email: email,
                })
            }).then(async (response) => {
                if (!response.ok) {
                    const data = await response.json() as { status: string; error: string; [key: string]: any };
                    console.error("Failed to invite user:", data);
                    throw new Error("Failed to invite user: " + data.error);
                }
                return response.json();
            }).then((data: {status: string, message: string}) => {
                resolve(data);
            }).catch((error) => {
                console.error("Error inviting user:", error);
                if (error.message.includes("User is already in the vault")) {
                    win.webContents.send('notification', 'User is already in the vault', 'warning');
                    reject(new Error("User is already in the vault"));
                }
                win.webContents.send('notification', 'Error inviting user: ' + error.message, 'error');
                reject(error);
            });
        });
    });

    ipcMain.handle('cancel-request', async (event, email) => {
        try {
            const response = await fetch(`${server.options.api}/vaulttune/vault/cancelRequest`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    vault_token: server.options.token,
                    user_email: email,
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Failed to cancel request:", errorData);
                return Promise.reject(errorData);
            }
            const data = await response.json();
            console.log("Request cancelled successfully:", data);
            return data;
        } catch (error) {
            console.error("Error cancelling request:", error);
            win.webContents.send('notification', 'Error cancelling request: ' + error.message, 'error');
            return Promise.reject(error);
        }
    });
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            server.stop().then(() => {
                console.log("Server stopped successfully.");
                app.quit();
            }).catch((error) => {
                console.error("Error stopping server on app close:", error);
                app.quit();
            });
        }
    });

};

app.whenReady().then(start);

export { server };


// ipc handlers
