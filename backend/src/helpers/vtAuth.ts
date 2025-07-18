import { Server } from "http";
import * as VaultTuneServer from "../classes/server";
import open from "open";
import { Express, json } from "express";
import { error } from "console";
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from "fs";
export function auth(t: VaultTuneServer.default): Promise<string | Error> {
    if(!existsSync(`${__dirname}/../../settings/auth/vaulttune_token.txt`)) {
        return new Promise((resolve, reject) => {
            console.log("Listening for authentication requests on port 3000");
            const jsonParser = json();

            let received = false;
            t.app.options("/auth", (req, res) => {
                res.sendStatus(200); // respond to preflight
            });
            t.app.post("/auth", jsonParser, (req, res) => {
                if (received) {
                    res.status(429).send("Already received an authentication request");
                    return;
                }
                console.log("Received authentication request for VaultTune");
                received = true;
                console.log("Body received: ", req.body)
                const { token } = req.body;
                if (!token) {
                    console.log("No token presented")
                    res.status(400).send("Token is required");
                    reject(new Error("Token is required"));
                    return;
                }
                fetch(`${t.options.api}/vaulttune/auth/vault/getToken/`, {
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
                        return;
                    }
                    return response.json();
                }).then(data => {
                    t.options.token = data.token;
                    if (!existsSync(`${__dirname}/../../settings/auth`)) {
                        mkdirSync(`${__dirname}/../../settings/auth`, { recursive: true });
                    }
                    writeFileSync(`${__dirname}/../../settings/auth/vaulttune_token.txt`, t.options.token);
                    console.log("Sucessfully authenticated with VaultTune");
                    res.status(200).send("Authentication successful");
                    resolve("success");
                    return;
                }).catch(error => {
                    console.error("Error during authentication:", error);
                    res.status(500).send("Internal server error");
                    reject(error);
                    return;
                });
                res.on('finish', () => {
                    // Remove all listeners at the "/auth" path
                    const stack = t.app._router.stack;
                    for (let i = stack.length - 1; i >= 0; i--) {
                        if (stack[i].route && stack[i].route.path === "/auth") {
                            stack.splice(i, 1);
                        }
                    }
                });
            });
            open("http://vaulttune.jcamille.tech/?callback")
        });
    } else {
        return new Promise((resolve, reject) => {
            console.log("Verifying existing VaultTune token...");
            t.options.token = readFileSync(`${__dirname}/../../settings/auth/vaulttune_token.txt`, "utf-8");

            fetch(`${t.options.api}/vaulttune/auth/vault/verifyToken/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    vault_token: t.options.token
                })
            }).then(async (response) => {
                if (!response.ok) {
                    const data = await response.json();
                    if (data.error === "Error: Vault token is required") {
                        console.error("There is an error with the existing VaultTune token. It is either invalid or expired.");
                        reject(new Error("Vault token is required"));
                        return;
                    }
                    if (response.status === 401) {
                        console.error("Failed to verify existing VaultTune token..obtaining a new one");
                    }
                    // Remove the invalid token file
                    try {
                        unlinkSync(`${__dirname}/../../settings/auth/vaulttune_token.txt`);
                        console.log("Invalid VaultTune token removed.");
                    } catch (err) {
                        console.error("Failed to remove invalid VaultTune token:", err);
                        reject(new Error("Failed to remove invalid VaultTune token"));
                    }
                    const status = await auth(t); // Re-authenticate
                    if (status instanceof Error) {
                        reject(status);
                    } else {
                        console.log("New VaultTune token verified successfully");
                        resolve(status);
                    }
                    return;
                } else {
                    const data = await response.json();
                    console.log("Existing VaultTune token verified successfully:", data);
                    resolve("success");
                }
            }).catch(error => {
                console.error("Error verifying existing VaultTune token:", error);
                reject(error);
            });
        });

    }
}