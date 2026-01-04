import { NextRequest } from "next/server";
import verifyServer from "@/lib/tokens/verify";
import { auth, database } from "@/lib/firebase/admin";
export async function POST(req: NextRequest) {
    console.log(`Request to verify user from Vault received`)
    try {
        const body = await req.json();
        const { user_token, vault_token } = body;
        console.log(`Verifying Vault token..`)
        const vault_token_data = verifyServer(vault_token)
        console.log(`Vault ${vault_token_data.id} authenticated, verifying user token`)
        const user_token_data = await auth.verifyIdToken(user_token);
        console.log(`User ${user_token_data.uid} authenticated, checking Firebase for vault authorization`)
        const ref = database.ref(`/vaults/${vault_token_data.id}`);
        const snapshot = await ref.once('value');
        if (!snapshot.exists()) {
            throw new Error("Vault not found");
        } else {
            const vaultData = snapshot.val();
            if (!vaultData.users || !Array.isArray(vaultData.users) || !vaultData.users.includes(user_token_data.uid)) {
                return new Response(JSON.stringify({status: 'error', reason: 'User not authorized'}), { status: 403 });
            }
        }
        console.log("Verification of client membership in Vault was successful!");
        const user = await auth.getUser(user_token_data.uid);
        return new Response(JSON.stringify({status: "success", user: {
            uid: user_token_data.uid,
            email: user_token_data.email,
            displayName: user.displayName,
            avatar: user.photoURL
        }}));
        
    } catch (error) {
        return new Response(JSON.stringify({status: "failed", error: (error as Error).message}), { status: 400 });
    }
}