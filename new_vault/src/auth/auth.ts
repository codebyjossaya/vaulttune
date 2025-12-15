import type { serverToken, User } from "../types/backend.d.ts";
export default function auth(token: string, backend: string): Promise<serverToken> {
    return new Promise((resolve, reject) => {
        fetch(`${backend}/vaulttune/auth/vault/verifyToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vault_token: token
            })
        }).then(async (response) => {
            if (!response.ok) {
                reject(`Auth error: ${await response.text()}`);
            }
            else return response.json();
        }).then((data: {
            status: string,
            vault: serverToken
        }) => {
            resolve(data.vault)
        }).catch(async (error: Error) => {
            reject(`Auth error: ${error.toString()}`);
        })
    });
}