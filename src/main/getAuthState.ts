import keytar from 'keytar'
import { AuthState } from 'src/types/types';
export function getAuthState(): Promise<AuthState> {
    return new Promise((resolve, reject) => {
        keytar.findPassword('vaulttune').then((token) => {
            if (!token) {
                console.log("No VaultTune token found in keytar.");
                resolve({ authenticated: false });
                return;
            }
            console.log("Verifying existing VaultTune token...");
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
                    const data: { error?: string } = await response.json();
                    if (data.error === "Error: Vault token is required") {
                        console.error("There is an error with the existing VaultTune token. It is either invalid or expired.");
                        reject(false);
                        return;
                    }
                    if (response.status === 401) {
                        console.error("Failed to verify existing VaultTune token..obtaining a new one");
                    }
                    // Remove the invalid token file
                    
                } else {
                    const data: { content: object} = await response.json();
                    console.log("Existing VaultTune token verified successfully:", data);
                    resolve({ authenticated: true, ...data });
                    return;
                }
            }).catch((error) => {
                console.error("Error verifying existing VaultTune token:", error);
                reject(false);
            });
            
        });
    });
}