import { NextRequest } from "next/server";
import { auth, database } from "@/lib/firebase/admin";
import { Vault } from "@/app/types";
export async function POST(req: NextRequest) {
    console.log(`Request to unregister Vault received`);
    try {
        const body = await req.json();
        const { vault_id, user_token } = body;
        if (!vault_id || !user_token) {
            throw new Error("Vault ID and user token are required");
        }
        console.log(`Authenticating user...`);
        const user_token_data = await auth.verifyIdToken(user_token);
        console.log(`User ${user_token_data.uid} authenticated! Unregistering Vault ${vault_id}`);
        // Get references to the vault and user vaults in the database
        const vaultRef = database.ref(`/vaults/${vault_id}`);
        const userVaultRef = database.ref(`/users/${user_token_data.uid}/vaults/${vault_id}`);
        // Check if the vault exists
        const vaultSnapshot = await vaultRef.once('value');
        if (!vaultSnapshot.exists()) {
            throw new Error("Vault not found");
        }
        // Remove the vault from the user's vaults
        await userVaultRef.remove();
        // Remove the user from the vault's users list
        const existingData: Vault = vaultSnapshot.val();
        const usersList = Array.isArray(existingData.users) ? existingData.users : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedUsersList = usersList.filter((user: any) => user !== user_token_data.uid);
        if (updatedUsersList.length === 0) {
            // If no users left, delete the vault entirely
            await vaultRef.remove();
            console.log(`Vault ${vault_id} unregistered successfully!`);
            return new Response(JSON.stringify({ status: "success", message: "Vault unregistered successfully" }));
        }
        else {
            // Otherwise, update the vault with the new users list
            await vaultRef.update({ users: updatedUsersList });
            console.log(`User ${user_token_data.uid} removed from Vault ${vault_id}`);
            return new Response(JSON.stringify({ status: "success", message: "User removed from Vault successfully" }));
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (error: any) {
        console.log(error);
        return new Response(JSON.stringify({ status: "failed", error: error.message }), { status: 400 });
    }
}