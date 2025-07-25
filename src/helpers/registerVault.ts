import Server from "../classes/server";
import { readFileSync } from "fs";
export function registerVault(t: Server, status: "online" | "offline"): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const vault_name = t.options.name;
            fetch("https://api.jcamille.tech/vaulttune/user/vault/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: t.options.token,
                    vault_name,
                    tunnel_url: t.address || null,
                    status,
                })
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to register vault: ${response.statusText}`);
                }
                return response.json();
            }).then(data => {
                console.log("Vault registered successfully:", data);
                t.state = status;
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