import { NextRequest } from "next/server";
import { auth, database } from "@/lib/firebase/admin";
import { UserVaultData, userVault} from "@/app/types";



export async function GET(req: NextRequest) {
    const user_token = req.headers.get('authorization');
    if (!user_token) {
        return new Response(JSON.stringify({status: "failed", error: "User token is required"}), { status: 401 });
        return;
    }
    console.log(`Authenticating user...`)
    const user_token_data = await auth.verifyIdToken(user_token);
    console.log(`User ${user_token_data.uid} authenticated! Obtaining user Vault list...`);
    const ref = database.ref(`/users/${user_token_data.uid}/vaults`);
    const snapshot = await ref.once('value');
    if (!snapshot.exists()) {
        console.error(`User ${user_token_data.uid} does not have any vaults`)
        return new Response(JSON.stringify({status: "success", vaults: []}), { status: 200 });
    }
    const vaults: UserVaultData = snapshot.val();
    
    console.log(`User ${user_token_data.uid} has the following Vaults:`, vaults);
    console.log(`Updating Vaults...`)
    // Add status to each vault
    for (const vaultID of Object.keys(vaults)) {
        if (vaultID === 'requests') continue; // Skip requests
        const vault = vaults[vaultID] as userVault;
        const vaultRef = database.ref(`/vaults/${vaultID}`);
        const vaultSnapshot = await vaultRef.once('value');
        if (vaultSnapshot.exists()) {
            const vaultData = vaultSnapshot.val();
            console.log(vaultData)
            vault.status = vaultData.status || "offline"; // Default to "offline" if not set
            vault.vault_name = vaultData.vault_name || "Unnamed Vault"; // Default to "Unnamed Vault" if not set
            vault.owner = {uid: vaultData.users[0] || "Unknown", name: (await auth.getUser(vaultData.users[0]))?.displayName || "Unknown" }; // Default to "Unknown" if not set
        }
        else {
            vault.status = "offline"; // If vault not found, set status to "offline"
        }
    }
    
    console.log(`User Vault list request fulfilled!`)
    return new Response(JSON.stringify({status: "success", vaults: Object.values(vaults)}))
}