import verifyServer from "@/lib/tokens/verify";
import { NextRequest } from "next/server";
import { database } from "@/lib/firebase/admin";
export async function POST(req: NextRequest) {
    console.log(`Request to register Vault received`)
    try {
        const body = await req.json();
        const { vault_name, tunnel_url, token, status = "offline" } = body;
        if (!vault_name || !token) {
            throw new Error("Vault name and token are required");
        }
        
        console.log(`Authenticating Vault...`)
        const server_token = verifyServer(token);
        console.log(`Vault ${server_token.id} authenticated, registering Vault for User ${server_token.user.uid}`)
        
        if (typeof vault_name !== 'string' || typeof token !== 'string') {
            throw new Error("Vault name and token must be strings");
        }

        // Get references to the vault and user vaults in the database
        const vaultRef = database.ref(`/vaults/${server_token.id}`);
        const userVaultRef = database.ref(`/users/${server_token.user.uid}/vaults/${server_token.id}`);
        // Register the vault with the user's vaults
        console.log(`Adding Vault to User ${server_token.user.uid}'s profile`)
        userVaultRef.set({ vault_name, id: server_token.id, status });
        // Get global vault data
        const vaultSnapshot = await vaultRef.once('value');
        
            
            // check if vault is already registered globally
            if (!vaultSnapshot.exists()) {
                // if not, create a new vault entry
                console.log(`Performing first-time Vault registration`)
                const users: string[] = [server_token.user.uid];
                vaultRef.set({ vault_name, tunnel_url, users, id: server_token.id, status });
            } else {
                console.log(`Vault is already registered...updating Vault accordingly`)
                // if it exists, update the vault entry with the new tunnel URL and add the user if not already present
                const existingData = vaultSnapshot.val();
                const usersList: string[] = Array.isArray(existingData.users) ? existingData.users : [];
                if (!usersList.includes(server_token.user.uid)) {
                    usersList.push(server_token.user.uid);
            }
            vaultRef.update({ tunnel_url, users: usersList, vault_name, status });
        }
        // Respond with success
        console.log("Vault registration was successful!")
        return new Response(JSON.stringify({status: "success",message: "Vault registered successfully"}));
        
    } catch (error) {
        console.log(error)
        return new Response(JSON.stringify({status: "failed", error: (error as Error).message}), { status: 400 });
    }
}