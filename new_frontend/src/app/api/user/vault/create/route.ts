import { NextRequest } from "next/server";
import { auth, database } from "@/lib/firebase/admin";
import { serverToken } from "@/app/types";
import { sign } from "jsonwebtoken";
export async function POST(req: NextRequest) {
    const token = req.headers.get('authorization');
    if (!token) {
        return new Response(JSON.stringify({status: "failed", error: "User token is required"}), { status: 401 });
    }
    console.log(`Authenticating user token...`);
    const claims = await auth.verifyIdToken(token);
    console.log(`User ${claims.uid} authenticated!`);
    console.log(`Generating Vault ID`);
    const vault_id = `vault_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Assigning Vault ID ${vault_id} and minting token...`);
    const user = await auth.getUser(claims.uid);
    const vault_token: serverToken = {
        id: vault_id,
        user
    };
    console.log(`Registering vault in database...`);
    const vaultRef = database.ref(`/vaults/${vault_id}`);
    await vaultRef.set({
        id: vault_id,
    });
    const privateKey = process.env.PRIVATE_SERVER_KEY!.replace(/\\n/g, '\n');
    const custom_token = sign(vault_token, privateKey, { algorithm: 'RS256' });
    console.log(`Token minting successful`);
    return new Response(JSON.stringify({ status: "success", token: custom_token, user, vault_id}));   
}