import { NextRequest } from "next/server";
import { auth, database } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { vault_id } = body;
    const user_token = req.headers.get('authorization');
    console.log(`Request to delete Vault ${vault_id} received`);
    if (!vault_id || !user_token) {
        return new Response(JSON.stringify({status: "failed", error: "Vault ID and user token are required"}), { status: 400 });
    }
    try {
        const user = await auth.verifyIdToken(user_token);
        console.log(`User authenticated, verifying vault ownership...`);
        // Remove vault from global vaults
        const vaultRef = database.ref(`/vaults/${vault_id}`);
        const vaultSnapshot = await vaultRef.once('value');
        if (!vaultSnapshot.exists()) {
            return new Response(JSON.stringify({status: "failed", error: "Vault not found"}), { status: 404 });
        }
        const vaultData = vaultSnapshot.val();
        if (!vaultData.users || !Array.isArray(vaultData.users) || !(vaultData.users[0] === user.uid)) {
            return new Response(JSON.stringify({status: "failed", error: "User not authorized to delete this vault"}), { status: 403 });
        }
        console.log(`Deleting vault from global records...`);
        await vaultRef.remove();
        // Remove vault from each user's vault list
        for (const uid of vaultData.users) {
            const userVaultRef = database.ref(`/users/${uid}/vaults/${vault_id}`);
            await userVaultRef.remove();
        }
        console.log(`Vault ${vault_id} deleted successfully.`);
        return new Response(JSON.stringify({status: "success", message: "Vault deleted successfully"}), { status: 200 });
    } catch (error) {
        console.error("Error deleting vault: ", error);
        return new Response(JSON.stringify({status: "failed", error: (error as Error).message}), { status: 500 });
    }
}