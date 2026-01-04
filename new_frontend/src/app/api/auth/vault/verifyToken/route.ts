import { NextRequest } from "next/server";
import verifyServer from "@/lib/tokens/verify"
export async function POST(req: NextRequest) {
    console.log(`Request to authenticate Vault token received`)
    try {
        const body = await req.json();
        const { vault_token } = body;
        if (!vault_token) {
            throw new Error("Vault token is required");
        }
        console.log(`Verifying token..`)
        const vault_token_data = verifyServer(vault_token);
        // Verify the vault token
        console.log(`Verification of Vault ${vault_token_data.id}'s token was successful!`);
        return new Response(JSON.stringify({status: "success", id: vault_token_data.id, user: vault_token_data.user}), { status: 200 });
        
    } catch (error: unknown) {
        console.log(error)
        return new Response(JSON.stringify({status: "failed", error: (error as Error).message}), { status: 400 });
        
    }
}