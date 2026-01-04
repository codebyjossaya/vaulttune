import type { serverToken } from "../types/backend.d.ts";
import { User } from "../types/server_types.ts";
export default function auth(token: string, backend: string): Promise<serverToken> {
    return new Promise((resolve, reject) => {
        fetch(`${backend}/api/auth/vault/verifyToken`, {
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
            id: string,
            user: User,
        }) => {
            console.log("Auth response data: ", data);
            resolve({id: data.id, user: data.user});
        }).catch(async (error: Error) => {
            reject(`Auth error: ${error.toString()}`);
        })
    });
}