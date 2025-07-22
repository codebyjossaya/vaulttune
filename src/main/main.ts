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
import { User } from 'interfaces/types';
import { PendingRequest } from 'interfaces/types';

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
        width: 535,
        height: 894,
        minWidth: 535,
        minHeight: 894,
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
        
        console.log("Updating server settings in ", server.options.api);
        server.register();
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
                console.error("Failed to invite user:", await response.json());
                throw new Error("Failed to invite user");
            }
            return response.json();
        }).then((data: {status: string, message: string}) => {
            resolve(data);
        }).catch((error) => {
            console.error("Error inviting user:", error);
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
        return Promise.reject(error);
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        server.stop().then(() => {
            console.log("Server stopped successfully.");
        })
    };
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

export { server };