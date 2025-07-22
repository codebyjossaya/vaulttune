import keytar from 'keytar'
import { AuthState } from 'src/types/types';
import { server } from './main';
export function getAuthState(): Promise<AuthState> {
    return new Promise( async (resolve, reject) => {
        const token = await keytar.findPassword('vaulttune');
        if (!token) {
            console.log("No VaultTune token found in keytar.");
            resolve({ authenticated: false });
            return;
        }
        console.log("Verifying existing VaultTune token...");
        const api = server.options.api || 'https://api.jcamille.tech';
        server.options.token = token;
        try {
            const response = await fetch(`${api}/vaulttune/auth/vault/verifyToken/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    vault_token: token
                })
            });
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
                await server.register();
                resolve({ authenticated: true, ...data });
                return;
            }
        } catch (error) {
            console.error("Error setting server options:", error);
            reject(false);
            return;
        }
            

    });
}