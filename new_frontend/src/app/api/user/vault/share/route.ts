import { NextRequest } from "next/server";
import { auth, database } from "@/lib/firebase/admin";
export async function POST(req: NextRequest) {
    const {userIds, vaultId} = await req.json();
    const user_token = req.headers.get('authorization');
    if (!user_token) {
        return new Response(JSON.stringify({status: "failed", error: "User token is required"}), { status: 401 });
    }
    try {
        // Verify user token
        const user_token_data = await auth.verifyIdToken(user_token);
        // Get vault data
        const vaultRef = database.ref(`/vaults/${vaultId}`);
        const vaultSnapshot = await vaultRef.once('value');
        if (!vaultSnapshot.exists()) {
            return new Response(JSON.stringify({status: "failed", error: "Vault not found"}), { status: 404 });
        }
        const vaultData = vaultSnapshot.val();
        // Check if requesting user is authorized to share the vault
        if (!vaultData.users || !Array.isArray(vaultData.users) || !(vaultData.users[0] === user_token_data.uid)) {
            return new Response(JSON.stringify({status: "failed", error: "User not authorized to share this vault"}), { status: 403 });
        }
        // Update vault's user list
        const updatedUsers = Array.from(new Set([...vaultData.users, ...userIds]));
        await vaultRef.update({ users: updatedUsers });
        // update each user's vault list
        for (const uid of userIds) {
            const userVaultsRef = database.ref(`/users/${uid}/vaults`);
            const userVaultsSnapshot = await userVaultsRef.once('value');
            let userVaults: { [vaultId: string]: {id: string, vault_name: string} }  = {}
            if (userVaultsSnapshot.exists()) {
                userVaults = userVaultsSnapshot.val();
            }
            userVaults[vaultId] = {id: vaultId, vault_name: vaultData.vault_name};
            // Remove duplicates
            await userVaultsRef.set(userVaults);
        }
            
        return new Response(JSON.stringify({status: "success"}), { status: 200 });
    } catch (error) {
        console.error("Error sharing vault: ", error);
        return new Response(JSON.stringify({status: "failed", error: (error as Error).message}), { status: 500 });
    }
}