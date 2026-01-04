import verifyServer from "@/lib/tokens/verify";
import { NextRequest } from "next/server";
import { database } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
    console.log("Recieved share creation request");
    const body = await req.json();
    const { token, songId } = body;
    if (!token || !songId) {
        console.log("Token or songId missing in share creation request");
        return new Response(
            JSON.stringify({
                status: "failed", 
                error: "Token and songId are required"
            }), 
            { status: 400 }
        );
    }
    console.log("Authenticating vault...");
    try {
        const server_token = verifyServer(token);
        console.log(`Vault ${server_token.id} authenticated for share creation`);
        console.log(`Generating share ID for ${songId}`);
        let shareId = `${Math.random().toString(36).substr(2, 9)}`;
        const shareRef = database.ref(`/shares/${shareId}`);
        if ((await shareRef.once('value')).exists()) {
            shareId = `${Math.random().toString(36).substr(2, 9)}`;
        }
        console.log("Getting vault info..")
        const vaultRef = database.ref(`/vaults/${server_token.id}`);
        const vaultSnapshot = await vaultRef.once('value');
        if (!vaultSnapshot.exists()) {
            console.log(`Vault ${server_token.id} not found during share creation`);
            return new Response(
                JSON.stringify({
                    status: "failed", 
                    error: "Vault not found"
                }), 
                { status: 404 }
            );
        }
        console.log(`Storing share ${shareId} for song ${songId}`);
        await shareRef.set({
            vaultName: vaultSnapshot.val().vault_name,
            vaultURL: vaultSnapshot.val().tunnel_url,
            songId: songId,
            shareId,
            createdAt: Date.now()
        });
        console.log(`Share creation successful: ${shareId}`);
        return new Response(
            JSON.stringify({
                status: "success",
                shareId: shareId
            })
        );

    } catch (err) {
        console.log("Share creation failed:", (err instanceof Error) ? err.message : String(err));
        return new Response(
            JSON.stringify({
                status: "failed", 
                error: (err instanceof Error) ? err.message : String(err)
            }), 
            { status: 500 }
        );
    }
}