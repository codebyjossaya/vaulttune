import * as express from 'express';
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import pkg from 'jsonwebtoken';
import { readFileSync } from "node:fs";
import cors from 'cors';
const { sign, verify } = pkg;
const verifyServer = (token) => {
    const verified = verify(token, readFileSync("./public.key", "utf-8"), { algorithms: ["RS256"] });
    if (typeof verified === 'string') {
        return JSON.parse(verified);
    }
    else if (typeof verified === 'object') {
        return verified;
    }
    throw new Error('Invalid token');
};
export class Server {
    constructor() {
        this.app = express.default();
        this.port = 3200;
        this.firebase = admin.initializeApp({
            credential: admin.credential.cert(process.env.FIREBASE_KEY),
            databaseURL: "https://vaulttunemusic-default-rtdb.firebaseio.com"
        });
        this.auth = getAuth(this.firebase);
        this.database = getDatabase(this.firebase);
        // generate permanent vault JWT
        this.app.use(cors({
            origin: '*', // NOTE: Use specific origins in production!
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type']
        }));
        this.app.use(express.json());
        // # Authentication routes
        this.app.post('/vaulttune/auth/vault/getToken', async (req, res) => {
            console.log(`Token mint request received`);
            try {
                const { user_token } = req.body;
                if (!user_token) {
                    throw new Error("Vault token is required");
                }
                console.log(`Authenticating user token...`);
                let token = await this.auth.verifyIdToken(user_token);
                console.log(`User ${token.uid} authenticated!`);
                console.log(`Generating Vault ID`);
                const vault_id = `vault_${Math.random().toString(36).substr(2, 9)}`;
                console.log(`Assigning Vault ID ${vault_id} and minting token...`);
                const vault_token = {
                    id: vault_id,
                    owner: token.uid,
                };
                const custom_token = sign(vault_token, readFileSync("./private.key", "utf-8"), { algorithm: 'RS256' });
                res.json({ status: "success", token: custom_token });
                console.log(`Token minting successful`);
            }
            catch (error) {
                console.log(error);
                res.status(400).json({ status: "failed", error: error.message });
                ;
            }
        });
        this.app.post('/vaulttune/auth/vault/verifyToken', async (req, res) => {
            console.log(`Request to authenticate Vault token received`);
            try {
                const { vault_token } = req.body;
                if (!vault_token) {
                    throw new Error("Vault token is required");
                }
                console.log(`Verifying token..`);
                const vault_token_data = verifyServer(vault_token);
                // Verify the vault token
                res.status(200).json({ status: "success", vault: vault_token_data });
                console.log(`Verification of Vault ${vault_token_data.id}'s token was successful!`);
            }
            catch (error) {
                console.log(error);
                res.status(400).json({ status: "failed", error: error.message });
            }
        });
        // enable vaults to verify user is in vault before accepting connection
        this.app.post('/vaulttune/auth/vault/verifyUser', async (req, res) => {
            console.log(`Request to verify user from Vault received`);
            try {
                const { user_token, vault_token } = req.body;
                console.log(`Verifying Vault token..`);
                const vault_token_data = verifyServer(vault_token);
                console.log(`Vault ${vault_token_data.id} authenticated, verifying user token`);
                let user_token_data = await this.auth.verifyIdToken(user_token);
                console.log(`User ${user_token_data.uid} authenticated, checking Firebase for vault authorization`);
                const ref = this.database.ref(`/vaults/${vault_token_data.id}`);
                const snapshot = await ref.once('value');
                if (!snapshot.exists()) {
                    throw new Error("Vault not found");
                }
                else {
                    const vaultData = snapshot.val();
                    if (!vaultData.users || !Array.isArray(vaultData.users) || !vaultData.users.includes(user_token_data.uid)) {
                        throw new Error("User not authorized for this vault");
                    }
                }
                res.json({ status: "success", uid: user_token_data.uid });
                console.log("Verification of client membership in Vault was successful!");
            }
            catch (error) {
                res.status(400).json({ status: "failed", error: error.message });
                ;
            }
        });
        // # Vault routes
        // update vault status
        this.app.post('/vaulttune/vault/status', async (req, res) => {
            console.log(`Request to update Vault status received`);
            try {
                const { vault_token, status } = req.body;
                if (!vault_token || !status) {
                    throw new Error("Vault token and status are required");
                }
                console.log(`Authenticating Vault...`);
                const server_token = verifyServer(vault_token);
                console.log(`Vault ${server_token.id} authenticated! Updating status to ${status}`);
                // Get reference to the vault in the database
                const vaultRef = this.database.ref(`/vaults/${server_token.id}`);
                // Update the vault's status
                await vaultRef.update({ status });
                res.json({ status: "success", message: "Vault status updated successfully" });
                console.log("Vault status update was successful!");
            }
            catch (error) {
                console.log(error);
                res.status(400).json({ status: "failed", error: error.message });
            }
        });
        // register a vault's name with its appropriate tunnel URL
        this.app.post('/vaulttune/user/vault/register', async (req, res) => {
            console.log(`Request to register Vault received`);
            try {
                console.log(req.body);
                for (const item of Object.values(req.body))
                    if (item === undefined || !item)
                        throw new Error("Vault token, user token, vault name, and tunnel URL are required");
                const { vault_name, tunnel_url, token } = req.body;
                console.log(`Authenticating Vault...`);
                const server_token = verifyServer(token);
                console.log(`Vault ${server_token.id} authenticated, registering Vault for User ${server_token.owner}`);
                if (!vault_name || !tunnel_url) {
                    throw new Error("Vault name and tunnel URL are required");
                }
                if (typeof vault_name !== 'string' || typeof tunnel_url !== 'string') {
                    throw new Error("Vault name and tunnel URL must be strings");
                }
                // Get references to the vault and user vaults in the database
                const vaultRef = this.database.ref(`/vaults/${server_token.id}`);
                const userVaultRef = this.database.ref(`/users/${server_token.owner}/vaults/${server_token.id}`);
                // Register the vault with the user's vaults
                console.log(`Adding Vault to User ${server_token.owner}'s profile`);
                userVaultRef.set({ vault_name, id: server_token.id });
                // Get global vault data
                const vaultSnapshot = await vaultRef.once('value');
                // check if vault is already registered globally
                if (!vaultSnapshot.exists()) {
                    // if not, create a new vault entry
                    console.log(`Performing first-time Vault registration`);
                    const users = [server_token.owner];
                    vaultRef.set({ vault_name, tunnel_url, users, id: server_token.id });
                }
                else {
                    console.log(`Vault is already registered...updating Vault accordingly`);
                    // if it exists, update the vault entry with the new tunnel URL and add the user if not already present
                    const existingData = vaultSnapshot.val();
                    const usersList = Array.isArray(existingData.users) ? existingData.users : [];
                    if (!usersList.includes(server_token.owner)) {
                        usersList.push(server_token.owner);
                    }
                    vaultRef.update({ tunnel_url, users: usersList });
                }
                // Respond with success
                res.json({ status: "success", message: "Vault registered successfully" });
                console.log("Vault registration was successful!");
            }
            catch (error) {
                console.log(error);
                res.status(400).json({ status: "failed", error: error.message });
            }
        });
        this.app.post('/vaulttune/user/vault/unregister', async (req, res) => {
            console.log(`Request to unregister Vault received`);
            try {
                const { vault_id, user_token } = req.body;
                if (!vault_id || !user_token) {
                    throw new Error("Vault ID and user token are required");
                }
                console.log(`Authenticating user...`);
                const user_token_data = await this.auth.verifyIdToken(user_token);
                console.log(`User ${user_token_data.uid} authenticated! Unregistering Vault ${vault_id}`);
                // Get references to the vault and user vaults in the database
                const vaultRef = this.database.ref(`/vaults/${vault_id}`);
                const userVaultRef = this.database.ref(`/users/${user_token_data.uid}/vaults/${vault_id}`);
                // Check if the vault exists
                const vaultSnapshot = await vaultRef.once('value');
                if (!vaultSnapshot.exists()) {
                    throw new Error("Vault not found");
                }
                // Remove the vault from the user's vaults
                await userVaultRef.remove();
                // Remove the user from the vault's users list
                const existingData = vaultSnapshot.val();
                const usersList = Array.isArray(existingData.users) ? existingData.users : [];
                const updatedUsersList = usersList.filter((user) => user !== user_token_data.uid);
                if (updatedUsersList.length === 0) {
                    // If no users left, delete the vault entirely
                    await vaultRef.remove();
                    console.log(`Vault ${vault_id} unregistered successfully!`);
                    res.json({ status: "success", message: "Vault unregistered successfully" });
                    return;
                }
                else {
                    // Otherwise, update the vault with the new users list
                    await vaultRef.update({ users: updatedUsersList });
                    console.log(`User ${user_token_data.uid} removed from Vault ${vault_id}`);
                    res.json({ status: "success", message: "User removed from Vault successfully" });
                    return;
                }
            }
            catch (error) {
                console.log(error);
                res.status(400).json({ status: "failed", error: error.message });
            }
        });
        this.app.post('/vaulttune/user/vaults/get', async (req, res) => {
            console.log(`Request to retrieve a list of user Vaults received`);
            try {
                const { user_token } = req.body;
                console.log();
                if (!user_token) {
                    res.json({ status: "failed", error: "User token is required" });
                    return;
                }
                console.log(`Authenticating user...`);
                const user_token_data = await this.auth.verifyIdToken(user_token);
                console.log(`User ${user_token_data.uid} authenticated! Obtaining user Vault list...`);
                const ref = this.database.ref(`/users/${user_token_data.uid}/vaults`);
                const snapshot = await ref.once('value');
                if (!snapshot.exists()) {
                    console.error(`User ${user_token_data.uid} does not have any vaults`);
                    res.json({ status: "success", vaults: [] });
                    ;
                    return;
                }
                const vaults = Object.values(snapshot.val());
                console.log(`User ${user_token_data.uid} has the following Vaults:`, vaults);
                console.log(`Adding status to vaults...`);
                // Add status to each vault
                for (const vault of vaults) {
                    const vaultRef = this.database.ref(`/vaults/${vault.id}`);
                    const vaultSnapshot = await vaultRef.once('value');
                    if (vaultSnapshot.exists()) {
                        const vaultData = vaultSnapshot.val();
                        vault.status = vaultData.status || "unknown"; // Default to "unknown" if status is not set
                    }
                    else {
                        vault.status = "not found"; // If the vault does not exist
                    }
                }
                console.log(`User Vault list request fulfilled!`);
                res.json({ status: "success", vaults });
                ;
            }
            catch (error) {
                console.log(error);
                res.status(400).json({ status: "failed", error: error.message });
                ;
            }
        });
        this.app.post('/vaulttune/user/vault/connect', async (req, res) => {
            console.log(`Request received to retrieve a Vault's data`);
            try {
                const { user_token, vault_id } = req.body;
                if (!user_token || !vault_id)
                    throw new Error("Vault ID and user token are required");
                console.log(`Authenticating user..`);
                const user_token_data = await this.auth.verifyIdToken(user_token);
                console.log(`User ${user_token_data.uid} authenticated! Getting Vault ${vault_id} data`);
                const ref = this.database.ref(`/vaults/${vault_id}`);
                const snapshot = await ref.once('value');
                if (!snapshot.exists()) {
                    throw new Error("Vault not found");
                }
                const vaultData = snapshot.val();
                console.log(`Verifying user ${user_token_data.uid} is authorized to get Vault data..`);
                if (!vaultData.users || !Array.isArray(vaultData.users) || !vaultData.users.includes(user_token_data.uid)) {
                    throw new Error("User not authorized for this vault");
                }
                res.json({ status: "success", vault: vaultData });
                ;
                console.log(`User request for Vault data fulfilled!`);
            }
            catch (error) {
                console.log(error);
                res.json({ status: "failed", error: error.message });
                ;
            }
        });
    }
    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`Listening on port ${this.port}`);
        });
    }
    close() {
        this.server.close();
    }
}
