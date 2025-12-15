import { Vault } from "@/app/types"

export default function connectVault(vaultId: string, token: string): Promise<Vault> {
    return new Promise((resolve, reject) => {
        fetch(`/api/user/vault/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}`
            },
            body: JSON.stringify({
                vault_id: vaultId
            })
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                resolve(data.vault);
            } else {
                reject(`Failed to connect to vault: ${await res.text()}`);
            }
        }).catch((error) => {
            reject(error);
        })
    })
}