import { homedir } from "os";
import { Options } from "../src/types/types";
import { server } from "./main";
import { existsSync } from "fs";
export function getSettings(): Promise<Options> {
    return new Promise<Options | undefined>((resolve, reject) => {
        try {
            const settingsPath = `${homedir()}/VaultTune/settings/server.json`;
            console.log(server.rooms)
            if (existsSync(settingsPath)) {
                const settings: Options = {
                    rooms: server.rooms.map(room => ({
                        id: room.id,
                        name: room.name,
                        dirs: room.dirs
                    })),
                    network: server.options.network,
                    name: server.options.name || "Untitled Vault",
                    api: server.options.api,
                    token: server.options.token
                };
                resolve(settings);
            } else {
                resolve(undefined)
            }
        } catch (error) {
            console.error("Unexpected error in getSettings:", error);
            reject(error);
            server.notify("There was an error getting the settings. Please try again later.", "error");
        }
    });
}