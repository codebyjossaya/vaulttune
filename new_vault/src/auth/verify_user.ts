import type { Socket } from "socket.io";

export default async function verifyUser(socket: Socket, backend: string, token: string) {
    fetch(`${backend}/vaulttune/auth/vault/verifyUser`, {
        method: 'POST',
        body: JSON.stringify({
            user_token: socket.handshake.auth.token,
            vault_token: token
        })
    }).then(async (response) => {
        if (!response.ok) {
            return new Error(`Error in authenticating user: ${await response.text()}`)
        }
        else return response.json();
    }).then((data) => {
        if (data.status !== 'success') {
            return new Error(data.reason);
        }
        socket.data.auth = data.user;
    });
}