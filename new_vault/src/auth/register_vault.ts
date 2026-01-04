import type VaultOptions from "../types/config.d.ts";

export function registerVault(config: VaultOptions, status: "online" | "offline"): Promise<void> {
    const timeout = new Promise<void>((_, reject) => {
        setTimeout(() => {
            reject(new Error("Request timed out while registering vault."));
        }, 10000); // 10 seconds timeout
    });
    return Promise.race([timeout, new Promise<void>((resolve, reject) => {
        try {
            console.log(`Registering vault with status: ${status}`);
            const vault_name = config.name;
            fetch(`${config.backend}/api/user/vault/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: config.token,
                    vault_name,
                    tunnel_url: config.address || null,
                    status,
                })
            }).then(async response => {
                if (!response.ok) {
                    if (response.status === 502) throw new Error("Bad Gateway: The server is currently unavailable. Please try again later.");
                    throw new Error(`Failed to register vault: ${response.statusText}: ${await response.text()}`);
                }
                return response.json();
            }).then(data => {
                console.log("Vault registered successfully:", data);
                resolve();
            }).catch(error => {
                console.error( error);
                reject(error);
            })
        } catch (error) {
            console.error("Error registering vault:", error);
            reject(error);
        }
        
    })]);
}