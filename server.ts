import * as express from 'express';
import admin from "firebase-admin";
import {getAuth, Auth} from "firebase-admin/auth";
import {Database, getDatabase} from "firebase-admin/database";
import pkg from 'jsonwebtoken';
import { readFileSync } from "node:fs";
import { serverToken, userVault, Vault } from "./types";
import cors from 'cors';
const { sign, verify } = pkg;

const verifyServer = (token: string): serverToken => {
    const publicKey = process.env.PUBLIC_SERVER_KEY!.replace(/\\n/g, '\n');
    const verified = verify(token, publicKey, { algorithms: ["RS256"] });
    if (typeof verified === 'string') {
        return JSON.parse(verified) as serverToken;
    } else if (typeof verified === 'object') {
        return verified as serverToken;
    }
    throw new Error('Invalid token');
}

export class Server {
    private app: express.Application = express.default();
    private port = 3200;
    public firebase;
    public auth: Auth;
    public database: Database;
    public server: any;
        constructor() {
            this.firebase = admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY!)),
                databaseURL: "https://vaulttunemusic-default-rtdb.firebaseio.com"
            });
            this.auth = getAuth(this.firebase);
            this.database = getDatabase(this.firebase);
            // generate permanent vault JWT
            this.app.use(cors({
                origin: '*', // NOTE: Use specific origins in production!
                methods: ['GET', 'POST'],
                allowedHeaders: ['Content-Type']
            }))
            this.app.use(express.json());
            // # Authentication routes
            this.app.post('/vaulttune/auth/vault/getToken', async (req: express.Request ,res: express.Response) => {
                console.log(`Token mint request received`)
                try {
                    const { user_token } = req.body;
                    if (!user_token) {
                        throw new Error("Vault token is required");
                    }
                    console.log(`Authenticating user token...`);
                    let token = await this.auth.verifyIdToken(user_token);
                    console.log(`User ${token.uid} authenticated!`);
                    console.log(`Generating Vault ID`)
                    const vault_id = `vault_${Math.random().toString(36).substr(2, 9)}`;
                    console.log(`Assigning Vault ID ${vault_id} and minting token...`);
                    const user = await this.auth.getUser(token.uid);
                    const vault_token: serverToken = {
                        id: vault_id,
                        user
                    };
                    const privateKey = process.env.PRIVATE_SERVER_KEY!.replace(/\\n/g, '\n');
                    const custom_token = sign(vault_token, privateKey, { algorithm: 'RS256' });
                    res.json({ status: "success", token: custom_token, user});
                    console.log(`Token minting successful`)
                } catch(error: any) {
                    console.log(error)
                    res.status(400).json({status: "failed", error: error.message});
                    ;
                }
            });
            this.app.post('/vaulttune/auth/vault/verifyToken', async (req: express.Request, res: express.Response) => {
                console.log(`Request to authenticate Vault token received`)
                try {
                    const { vault_token } = req.body;
                    if (!vault_token) {
                        throw new Error("Vault token is required");
                    }
                    console.log(`Verifying token..`)
                    const vault_token_data = verifyServer(vault_token);
                    // Verify the vault token
                    res.status(200).json({status: "success", ...vault_token_data});
                    console.log(`Verification of Vault ${vault_token_data.id}'s token was successful!`);
                } catch (error: any) {
                    console.log(error)
                    res.status(400).json({status: "failed", error: error.message});
                    
                }
            });
            // enable vaults to verify user is in vault before accepting connection
            this.app.post('/vaulttune/auth/vault/verifyUser', async (req: express.Request,res:express.Response) => {
                console.log(`Request to verify user from Vault received`)
                try {
                    const { user_token, vault_token } = req.body;
                    console.log(`Verifying Vault token..`)
                    const vault_token_data = verifyServer(vault_token)
                    console.log(`Vault ${vault_token_data.id} authenticated, verifying user token`)
                    let user_token_data = await this.auth.verifyIdToken(user_token);
                    console.log(`User ${user_token_data.uid} authenticated, checking Firebase for vault authorization`)
                    const ref = this.database.ref(`/vaults/${vault_token_data.id}`);
                    const snapshot = await ref.once('value');
                    if (!snapshot.exists()) {
                        throw new Error("Vault not found");
                    } else {
                        const vaultData = snapshot.val();
                        if (!vaultData.users || !Array.isArray(vaultData.users) || !vaultData.users.includes(user_token_data.uid)) {
                            throw new Error("User not authorized for this vault");
                        }
                    }

                    res.json({status: "success",uid:user_token_data.uid});
                    console.log("Verification of client membership in Vault was successful!")
                    ;
                } catch (error: any) {
                    res.status(400).json({status: "failed", error: error.message});
                    ;
                }
            });
            // # Vault routes
            // update vault status
            this.app.post('/vaulttune/vault/status', async (req: express.Request, res: express.Response) => {
                console.log(`Request to update Vault status received`)
                try {
                    const { vault_token, status } = req.body;
                    if (!vault_token || !status) {
                        throw new Error("Vault token and status are required");
                    }
                    console.log(`Authenticating Vault...`)
                    const server_token = verifyServer(vault_token);
                    console.log(`Vault ${server_token.id} authenticated! Updating status to ${status}`)
                    // Get reference to the vault in the database
                    const vaultRef = this.database.ref(`/vaults/${server_token.id}`);
                    // Update the vault's status
                    await vaultRef.update({ status });
                    res.json({status: "success", message: "Vault status updated successfully"});
                    console.log("Vault status update was successful!")
                } catch (error: any) {
                    console.log(error)
                    res.status(400).json({status: "failed", error: error.message});
                }
            });
            this.app.post('/vaulttune/vault/getUsers', async (req: express.Request, res: express.Response) => {
                try {
                    console.log(`Request to get Vault users received`)
                    const { vault_token } = req.body;
                    if (!vault_token) {
                        throw new Error("Vault token is required");
                    }
                    console.log(`Authenticating Vault...`)
                    const server_token = verifyServer(vault_token);
                    console.log(`Vault ${server_token.id} authenticated! Getting users...`)
                    // Get reference to the vault in the database
                    const vaultRef = this.database.ref(`/vaults/${server_token.id}/users`);
                    // Get the vault data
                    const snapshot = await vaultRef.once('value');
                    if (!snapshot.exists()) {
                        throw new Error("Vault not found");
                    }
                    // Get user records for each user ID
                    const userPromises = snapshot.val().map((uid: string) => this.auth.getUser(uid));
                    const users = await Promise.all(userPromises);
                    res.json({  status: "success", 
                                users: users.map((user: any) => ({
                                    uid: user.uid,
                                    email: user.email,
                                    name: user.displayName,
                                    avatar: user.photoURL
                                }))
                            });

                } catch (error: any) {
                    console.log(error);
                    res.status(400).json({status: "failed", error: error.message});
                }
            });
            // register a vault's name with its appropriate tunnel URL
            this.app.post('/vaulttune/user/vault/register', async (req: express.Request, res: express.Response) => {
                console.log(`Request to register Vault received`)
                try {
                    console.log(req.body);
                    for (const item of Object.values(req.body)) if (item === undefined || !item) throw new Error("Vault token, user token, vault name, and tunnel URL are required");

                    const { vault_name, tunnel_url, token } = req.body;
                    console.log(`Authenticating Vault...`)
                    const server_token = verifyServer(token);
                    console.log(`Vault ${server_token.id} authenticated, registering Vault for User ${server_token.user.uid}`)
                    if (!vault_name || !tunnel_url) {
                        throw new Error("Vault name and tunnel URL are required");
                    }
                    if (typeof vault_name !== 'string' || typeof tunnel_url !== 'string') {
                        throw new Error("Vault name and tunnel URL must be strings");
                    }

                    

                    // Get references to the vault and user vaults in the database
                    const vaultRef = this.database.ref(`/vaults/${server_token.id}`);
                    const userVaultRef = this.database.ref(`/users/${server_token.user.uid}/vaults/${server_token.id}`);
                    // Register the vault with the user's vaults
                    console.log(`Adding Vault to User ${server_token.user.uid}'s profile`)
                    userVaultRef.set({ vault_name, id: server_token.id });
                    // Get global vault data
                    const vaultSnapshot = await vaultRef.once('value');
                    
                        
                        // check if vault is already registered globally
                        if (!vaultSnapshot.exists()) {
                            // if not, create a new vault entry
                            console.log(`Performing first-time Vault registration`)
                            const users: string[] = [server_token.user.uid];
                            vaultRef.set({ vault_name, tunnel_url, users, id: server_token.id });
                        } else {
                            console.log(`Vault is already registered...updating Vault accordingly`)
                            // if it exists, update the vault entry with the new tunnel URL and add the user if not already present
                            const existingData = vaultSnapshot.val();
                            const usersList: string[] = Array.isArray(existingData.users) ? existingData.users : [];
                            if (!usersList.includes(server_token.user.uid)) {
                                usersList.push(server_token.user.uid);
                        }
                        vaultRef.update({ tunnel_url, users: usersList });
                    }
                    // Respond with success
                    res.json({status: "success",message: "Vault registered successfully"});
                    console.log("Vault registration was successful!")
                } catch (error: any) {
                    console.log(error)
                    res.status(400).json({status: "failed", error: error.message});
                }
            });
            this.app.post('/vaulttune/user/vault/unregister', async (req: express.Request, res: express.Response) => {
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
                    const updatedUsersList = usersList.filter((user: any) => user !== user_token_data.uid);
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
                catch (error: any) {
                    console.log(error);
                    res.status(400).json({ status: "failed", error: error.message });
                }
            });
            this.app.post('/vaulttune/user/vaults/get', async (req: express.Request, res: express.Response) => {
                console.log(`Request to retrieve a list of user Vaults received`)
                try {
                    const { user_token } = req.body;
                    console.log()
                    if (!user_token) {
                        res.json({status: "failed", error: "User token is required"});
                        return;
                    }
                    console.log(`Authenticating user...`)
                    const user_token_data = await this.auth.verifyIdToken(user_token);
                    console.log(`User ${user_token_data.uid} authenticated! Obtaining user Vault list...`);
                    const ref = this.database.ref(`/users/${user_token_data.uid}/vaults`);
                    const snapshot = await ref.once('value');
                    if (!snapshot.exists()) {
                        console.error(`User ${user_token_data.uid} does not have any vaults`)
                        res.json({status: "success", vaults: []});
                        ;
                        return;
                    }
                    const vaults: Vault[] = Object.values(snapshot.val());
                    console.log(`User ${user_token_data.uid} has the following Vaults:`, vaults);
                    console.log(`Adding status to vaults...`)
                    // Add status to each vault
                    for (const vault of vaults) {
                        const vaultRef = this.database.ref(`/vaults/${vault.id}`);
                        const vaultSnapshot = await vaultRef.once('value');
                        if (vaultSnapshot.exists()) {
                            const vaultData = vaultSnapshot.val();
                            vault.status = vaultData.status || "unknown"; // Default to "unknown" if status is not set
                        } else {
                            vault.status = "not found"; // If the vault does not exist
                        }
                    }
                    console.log(`User Vault list request fulfilled!`)
                    res.json({status: "success", vaults});
                    ;
                } catch (error: any) {
                    console.log(error)
                    res.status(400).json({status: "failed", error: error.message});
                    ;
                }
            });
            this.app.post('/vaulttune/user/vault/connect', async (req: express.Request, res: express.Response) => {
                console.log(`Request received to retrieve a Vault's data`)
                try {
                    const { user_token, vault_id } = req.body;
                    if (!user_token || !vault_id) throw new Error("Vault ID and user token are required");

                    console.log(`Authenticating user..`)
                    const user_token_data = await this.auth.verifyIdToken(user_token);
                    console.log(`User ${user_token_data.uid} authenticated! Getting Vault ${vault_id} data`)
                    
                    const ref = this.database.ref(`/vaults/${vault_id}`);
                    const snapshot = await ref.once('value');
                    if (!snapshot.exists()) {
                        throw new Error("Vault not found");
                    }
                    
                    const vaultData = snapshot.val();
                    console.log(`Verifying user ${user_token_data.uid} is authorized to get Vault data..`)
                    if (!vaultData.users || !Array.isArray(vaultData.users) || !vaultData.users.includes(user_token_data.uid)) {
                        throw new Error("User not authorized for this vault");
                    }

                    res.json({status: "success", vault: vaultData});
                    ;
                    console.log(`User request for Vault data fulfilled!`)
                } catch (error: any) {
                    console.log(error)
                    res.json({status: "failed", error: error.message});
                    ;
                }
            });
            // add user to vault
            this.app.post('/vaulttune/user/vault/addUser', async (req: express.Request, res: express.Response) => {
                console.log(`Request to add user to Vault received`)
                try {
                    const { vault_token, user_email } = req.body;
                    if (!vault_token || !user_email) {
                        throw new Error("Vault token and user email are required");
                    }
                    console.log(`Authenticating Vault...`)
                    const server_token = verifyServer(vault_token);
                    console.log(`Vault ${server_token.id} authenticated! Adding user ${user_email} to Vault`)
                    // Get the user by email
                    const userRecord = await this.auth.getUserByEmail(user_email);
                    // Get reference to the vault in the database
                    const userVaultRef = this.database.ref(`/users/${userRecord.uid}/vaults/requests/${server_token.id}`);
                    const requestRef = this.database.ref(`/vaults/${server_token.id}/requests/${userRecord.uid}`);
                    // Get vault name
                    const vaultRef = this.database.ref(`/vaults/${server_token.id}`);
                    const vaultSnapshot = await vaultRef.once('value');
                    if (!vaultSnapshot.exists()) {
                        throw new Error("Vault not found");
                    }
                    const vaultData = vaultSnapshot.val();
                    // Check if the user is already in the vault
                    if (vaultData.users && Array.isArray(vaultData.users) && vaultData.users.includes(userRecord.uid)) {
                        throw new Error("User is already in the vault");
                    }
                    // Create a user vault request
                    console.log(`Creating user Vault request for ${user_email}`)

                    const request = {
                        vault_id: server_token.id,
                        owner: server_token.user,
                        vault_name: vaultData.vault_name,
                        status: "pending"
                    }
                   

                    await userVaultRef.set(request);
                    await requestRef.set(request);

                    res.json({status: "success", message: `Succesfully sent a request to user ${user_email} to join Vault ${vaultData.vault_id}`});
                    console.log(`Succesfully sent a request to user ${user_email} to join Vault ${vaultData.vault_id}`);
                } catch (error: any) {
                    console.log(error)
                    res.status(400).json({status: "failed", error: error.message});
                }
            });
            this.app.post('/vaulttune/user/vault/requests', async (req: express.Request, res: express.Response) => {
                console.log(`Request to retrieve Vault requests received`)
                try {
                    const { user_token } = req.body;
                    if (!user_token) {
                        throw new Error("User token is required");
                    }
                    console.log(`Authenticating user...`)
                    const user_token_data = await this.auth.verifyIdToken(user_token);
                    console.log(`User ${user_token_data.uid} authenticated! Getting Vault requests...`)
                    const ref = this.database.ref(`/users/${user_token_data.uid}/vaults/requests`);
                    const snapshot = await ref.once('value');
                    if (!snapshot.exists()) {
                        console.error(`User ${user_token_data.uid} has no vault requests`)
                        res.json({status: "success", requests: []});
                        return;
                    }
                    const requests: any[] = Object.values(snapshot.val());
                    console.log(`User ${user_token_data.uid} has the following Vault requests:`, requests);
                    res.json({status: "success", requests});
                } catch (error: any) {
                    console.log(error)
                    res.status(400).json({status: "failed", error: error.message});
                }
            });
            this.app.post('/vaulttune/user/vault/handleRequest', async (req: express.Request, res: express.Response) => {
                console.log(`Request to handle Vault request received`)
                try {
                    const { user_token, vault_id, action } = req.body;
                    if (!user_token || !vault_id || !action) {
                        throw new Error("User token, vault ID, and action are required");
                    }
                    console.log(`Authenticating user...`)
                    const user_token_data = await this.auth.verifyIdToken(user_token);
                    console.log(`User ${user_token_data.uid} authenticated! Getting Vault requests...`)
                    const ref = this.database.ref(`/users/${user_token_data.uid}/vaults/requests`);
                    const snapshot = await ref.once('value');
                    if (!snapshot.exists()) {
                        console.error(`User ${user_token_data.uid} has no vault requests`)
                        res.json({status: "success", requests: []});
                        return;
                    }
                    const requests: any[] = Object.values(snapshot.val());
                    console.log(`User ${user_token_data.uid} has the following Vault requests:`, requests);
                    // Find the request for the specified vault ID
                    const request = requests.find((req: any) => req.id === vault_id);
                    if (!request) {
                        throw new Error("Vault request not found");
                    }
                    if (action !== 'accept' && action !== 'reject') {
                        throw new Error("Action must be either 'accept' or 'reject'");
                    }
                    // Get the vault reference
                    const vaultRef = this.database.ref(`/vaults/${vault_id}`);
                    const vaultSnapshot = await vaultRef.once('value');
                    if (!vaultSnapshot.exists()) {
                        throw new Error("Vault not found");
                    }
                    const vaultData = vaultSnapshot.val();
                    // Check if the user is already in the vault
                    if (vaultData.users && Array.isArray(vaultData.users) && vaultData.users.includes(user_token_data.uid)) {
                        throw new Error("User is already in the vault");
                    }
                    if (action === 'accept') {
                        // Add the user to the vault
                        console.log(`Accepting request for user ${user_token_data.uid} to join Vault ${vault_id}`)
                        const usersList: string[] = Array.isArray(vaultData.users) ? vaultData.users : [];
                        if (!usersList.includes(user_token_data.uid)) {
                            usersList.push(user_token_data.uid);
                        }
                        await vaultRef.update({ users: usersList });
                        // Remove the request from the user's requests
                        const userVaultRef = this.database.ref(`/users/${user_token_data.uid}/vaults/${vault_id}`);
                        await userVaultRef.set({
                            id: vault_id,
                            vault_name: vaultData.vault_name,
                        });
                        const userRequestRef = this.database.ref(`/users/${user_token_data.uid}/vaults/requests/${vault_id}`);
                        const requestRef = this.database.ref(`/vaults/${vault_id}/requests/${user_token_data.uid}`);
                        await requestRef.child('status').set('accepted');
                        await userRequestRef.remove();
                        res.json({status: "success", message: `User ${user_token_data.uid} added to Vault ${vault_id}`});
                    }
                    else if (action === 'reject') {
                        // Remove the request from the user's requests
                        console.log(`Rejecting request for user ${user_token_data.uid} to join Vault ${vault_id}`)
                        const userRequestRef = this.database.ref(`/users/${user_token_data.uid}/vaults/requests/${vault_id}`);
                        const requestRef = this.database.ref(`/vaults/${vault_id}/requests/${user_token_data.uid}`);
                        await requestRef.child('status').set('rejected');
                        await userRequestRef.remove();
                        res.json({status: "success", message: `Request for user ${user_token_data.uid} to join Vault ${vault_id} rejected`});
                    }
                } catch (error: any) {
                    console.log(error)
                    res.status(400).json({status: "failed", error: error.message});
                }
            });

        }
    start(): void {
        this.server = this.app.listen(this.port, () => {
            console.log(`Listening on port ${this.port}`)
        });
    }
    close(): void {
        this.server.close()
    }
}
