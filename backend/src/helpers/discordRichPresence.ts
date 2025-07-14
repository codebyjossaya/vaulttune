import { Client } from "discord-rpc";

export function initializeRPC() {
    const clientId = "1384260705221611530";

    const rpc = new Client({ transport: 'ipc' });

    rpc.on("ready", () => {
        console.log("Discord RPC connected!");

        rpc.setActivity({
            // @ts-expect-error
            type: 2,
            details: "Using VaultTune",
            state: "Vault is actively open",
            startTimestamp: new Date(),
        });

    });

    rpc.login({ clientId }).catch(console.error);

    return rpc;
}
