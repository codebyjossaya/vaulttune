import { Client } from "discord-rpc";

export async function initializeRPC() {
    const clientId = "1384260705221611530";

    try {
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

        })
        await rpc.login({ clientId });

        return rpc;
    } catch (error) {
        console.log("Failed to initialize Discord RPC:", error);
        return null;
    }

    
}
