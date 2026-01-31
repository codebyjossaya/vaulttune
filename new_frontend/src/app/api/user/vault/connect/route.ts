import { NextRequest } from "next/server";
import { auth, database } from "@/lib/firebase/admin";
export async function POST(req: NextRequest) {
    try {
        const user_token = req.headers.get('authorization');
        const { vault_id } = await req.json();
        if (!user_token || !vault_id) throw new Error("Vault ID and user token are required");

        console.log(`Authenticating user..`)
        const user_token_data = await auth.verifyIdToken(user_token);
        console.log(`User ${user_token_data.uid} authenticated! Getting Vault ${vault_id} data`)
        
        const ref = database.ref(`/vaults/${vault_id}`);
        const snapshot = await ref.once('value');
        if (!snapshot.exists()) {
            throw new Error("Vault not found");
        }
        
        const vaultData = snapshot.val();
        console.log(`Verifying user ${user_token_data.uid} is authorized to get Vault data..`)
        if (!vaultData.users || !Array.isArray(vaultData.users) || !vaultData.users.includes(user_token_data.uid)) {
            throw new Error("User not authorized for this vault");
        }

        console.log(`User request for Vault data fulfilled!`)
        return new Response(JSON.stringify({status: "success", vault: vaultData}), { status: 200 });
    } catch (error) {
        console.error("Error connecting to vault: ", error);
        return new Response(JSON.stringify({status: "failed", error: (error as Error).message}), { status: 500 });
    }
   
    
}