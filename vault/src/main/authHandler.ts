import { server } from "./main";
import express from 'express';
import { shell } from 'electron';
import keytar from 'keytar';
import { AuthState } from "../react/types/types";
import { existsSync, readFileSync, write, writeFileSync } from "fs";
import { homedir } from "os";
export function authHandler(event: Electron.IpcMainInvokeEvent, frontend: string = 'https://vaulttune.jcamille.dev') {
    return new Promise<AuthState>((resolve, reject) => {
        try {
            // Implement your sign-in logic here

            console.log("Sign-in requested");
            
            let received = false;

            server.httpServer.listen(3000);
            server.app.use(express.json());
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            server.app.post('/auth', (req: any, res: any) => {
                
                if (received) {
                    res.status(429).send("Already received an authentication request");
                    return;
                }
                console.log("Received authentication request for VaultTune");
                received = true;
                console.log("Body received: ", req.body)
                const { token, api } = req.body;
                if (!token) {
                    console.log("No token presented")
                    res.status(400).send("Token is required");
                    reject(new Error("Token is required"));
                }
                if (frontend) {
                    server.options.api = api;
                    console.log("Server API set to:", server.options.api);
                    if (existsSync(`${homedir()}/VaultTune/settings/server.json`)) {
                        const data = JSON.parse(readFileSync(`${homedir()}/VaultTune/settings/server.json`, 'utf-8'));
                        data.options.api = api;
                        server.register();
                        writeFileSync(`${homedir()}/VaultTune/settings/server.json`, JSON.stringify(data, null, 2));

                    }
                }
                
                fetch(`${server.options.api}/vaulttune/auth/vault/getToken/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_token: token
                    })
                }).then(response => {
                    if (!response.ok) {
                        res.status(response.status).send("Failed to authenticate");
                        reject(new Error("Failed to authenticate"));
                    }
                    return response.json();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }).then((data: any) => {
                    server.options.token = data.token;
                    server.options.api = api;
                    server.user = data.user;
                    // Store the token in keytar
                    console.log("Successfully authenticated with VaultTune");
                    keytar.setPassword('vaulttune', 'token', server.options.token).then(() => {
                        console.log("Token stored in keytar successfully.");
                        res.status(200).send("Authentication successful");
                        console.log(data);
                        resolve({ authenticated: true, user: data.user, api, });
                    }).catch((error) => {
                        console.error("Failed to store token in keytar:", error);
                        reject(new Error("Failed to store token in keytar"));
                    });
                   
                }).catch(error => {
                    console.error("Error during authentication:", error);
                    res.status(500).send("Internal server error");
                    reject(error);
                });
                res.on('finish', () => {
                    console.log("Authentication request finished");
                    server.app.removeAllListeners('/auth');
                    server.httpServer.close(() => {
                        console.log("HTTP server closed after authentication");
                    });
                    received = false;
                    
                });

            });
            shell.openExternal(`${frontend}/?callback`)

        } catch (error) {
            console.error("Error during sign-in:", error);
            reject(error);
        }
    });
}