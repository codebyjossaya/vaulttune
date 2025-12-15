import type CLIConfig from "../types/config.d.ts";

export function registerVault(config: CLIConfig, status: "online" | "offline"): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            console.log(`Registering vault with status: ${status}`);
            const vault_name = config.options.name;
            fetch(`${config.backend}/vaulttune/user/vault/register`, {
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
        
    });
}