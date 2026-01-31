import { NextRequest } from "next/server";
import { auth, database } from "@/lib/firebase/admin";
export async function POST(req: NextRequest) {
    console.log(`Request to get Vault members received`);
    const body = await req.json();
    const { vault_id } = body;
    const user_token = req.headers.get('authorization');
    if (!vault_id || !user_token) {
        return new Response(JSON.stringify({status: "failed", error: "Vault ID and user token are required"}), { status: 400 });
    }
    try {
        const user = await auth.verifyIdToken(user_token);
        console.log(`User authenticated, getting vault members...`);
        const vaultRef = database.ref(`/vaults/${vault_id}`);
        const vaultSnapshot = await vaultRef.once('value');
        if (!vaultSnapshot.exists()) {
            return new Response(JSON.stringify({status: "failed", error: "Vault not found"}), { status: 404 });
        }
        const vaultData = vaultSnapshot.val();
        if (!vaultData.users || !Array.isArray(vaultData.users) || !vaultData.users.includes(user.uid)) {
            return new Response(JSON.stringify({status: "failed", error: "User not authorized to view this vault's members"}), { status: 403 });
        }
        console.log(`Vault members retrieved successfully.`);
        const members = vaultData.users;
        console.log(`Getting member details...`);
        const users = await Promise.all(members.map(async (uid: string) => {
            return await auth.getUser(uid);
        }));
        console.log(users);
        return new Response(JSON.stringify({status: "success", members: users}), { status: 200 });
    } catch (error) {
        console.error("Error getting vault members: ", error);
        return new Response(JSON.stringify({status: "failed", error: (error as Error).message}), { status: 500 });
    }
}