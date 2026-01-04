import type { Socket } from "socket.io";

export default function verifyUser(socket: Socket, user_token: string, backend: string, token: string): Promise<void | Error> {
    return new Promise((resolve, reject) => {
        console.log("Token: ", socket.handshake.auth.token)
        fetch(`${backend}/api/auth/vault/verifyUser`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_token: socket.handshake.auth.token,
                vault_token: token
            })
        }).then(async (response) => {
            if (!response.ok) {
                reject(new Error(`Error in authenticating user: ${await response.text()}`));
                return;
            }
            else return response.json();
        }).then((data) => {
            if (data === undefined || data && data.status && data.status !== 'success') {
                reject(new Error(data ? data.error || data.reason : 'Unknown error during user verification'));
                return;
            }
            console.log("Verified user data: ", data);
            socket.data.auth = data.user;
            resolve();
        })});
 }
