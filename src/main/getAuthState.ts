import { existsSync, readFileSync, unlinkSync } from 'fs';
export function getAuthState(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if(!existsSync(`${__dirname}/../../settings/auth/vaulttune_token.txt`)) {
            console.log("No authentication token found. Please authenticate first.");
            resolve(false);
        } else {
            console.log("Verifying existing VaultTune token...");
            const token = readFileSync(`${__dirname}/../../settings/auth/vaulttune_token.txt`, 'utf-8');
            fetch(`https://api.jcamille.tech/vaulttune/auth/vault/verifyToken/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    vault_token: token
                })
            }).then(async (response: Response) => {
                if (!response.ok) {
                    const data: any = await response.json();
                    if (data.error === "Error: Vault token is required") {
                        console.error("There is an error with the existing VaultTune token. It is either invalid or expired.");
                        reject(false);
                        return;
                    }
                    if (response.status === 401) {
                        console.error("Failed to verify existing VaultTune token..obtaining a new one");
                    }
                    // Remove the invalid token file
                    try {
                        unlinkSync(`${__dirname}/../../settings/auth/vaulttune_token.txt`);
                        console.log("Invalid VaultTune token removed.");
                    } catch (err) {
                        console.error("Failed to remove invalid VaultTune token:", err);
                        reject(false);
                    }
                    
                } else {
                    const data = await response.json();
                    console.log("Existing VaultTune token verified successfully:", data);
                    resolve(true);
                }
            }).catch((error: any) => {
                console.error("Error verifying existing VaultTune token:", error);
                reject(false);
            });
        }
    });
}