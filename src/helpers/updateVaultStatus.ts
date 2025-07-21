import * as VaultTuneServer from "../classes/server";

export default function updateVaultStatus(t: VaultTuneServer.default, status: string): Promise<string | Error> {
    return new Promise((resolve, reject) => {
        console.log("Updating VaultTune status to", status);
        fetch("https://api.jcamille.tech/vaulttune/vault/status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status,
                vault_token: t.options.token
            })
        }).then(response => {
            if (!response.ok) {
                console.error("Failed to update VaultTune status:", response.statusText);
                reject(new Error(`Failed to update VaultTune status: ${response.statusText}`));
                return;
            } else {
                console.log("VaultTune status updated to ", status);
                t.state = status === "online" ? "online" : status === "offline" ? "offline" : "error";
                resolve("success");
            }
        }).catch(error => {
            console.error("Error updating VaultTune status:", error);
            reject(error);
        })
    })
}