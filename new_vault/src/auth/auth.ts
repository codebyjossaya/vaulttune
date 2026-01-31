import type { serverToken } from "../types/backend.d.ts";
import { User } from "../types/server_types.ts";
export default async function auth(
    token: string,
    backend: string
): Promise<serverToken> {

    const response = await fetch(`${backend}/api/auth/vault/verifyToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_token: token })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();

    return {
        id: data.id,
        user: data.user
    };
}