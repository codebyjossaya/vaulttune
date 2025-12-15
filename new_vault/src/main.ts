import Server from "./core/classes/server.ts"
import { readFileSync } from "fs"
import type CLIConfig from "./types/config.d.ts";
import { env } from "process";
import auth from "./auth/auth.ts";
import type { Socket } from "socket.io";
import verifyUser from "./auth/verify_user.ts";
import { registerVault } from "./auth/register_vault.ts";

const logger = {
    info: (str: string) => {
        const date = new Date();
        console.log(`[INFO] ${date.toISOString()} - ${str}`);
    },
    warn: (str: string) => {
        const date = new Date();
        console.warn(`[WARN] ${date.toISOString()} - ${str}`);
    },
    error: (str: string) => {
        const date = new Date();
        console.error(`[ERROR] ${date.toISOString()} - ${str}`);
    }
}

const data = env.CONTAINER ? readFileSync(env.CONFIG_PATH, 'utf-8') : readFileSync('./config.json', 'utf-8');
const config: CLIConfig = JSON.parse(data);

if (!config.options.name) config.options.name = "Untitled Vault";
if (!config.backend) config.backend = "https://api.jcamille.dev/vaulttune";
if (!config.token) throw new Error("No authentication token found");

auth(config.token,config.backend).then((data) => {

    const server = new Server(
        config.options,
        undefined,
        logger
    );


    server.authHandshake = (socket) => {
        return verifyUser(socket,config.backend,config.token)
    };

    try {
        server.start();
        registerVault(config, 'online');
    } catch (error) {
        logger.error(`Failed to initialize server: ${(error instanceof Error) ? error.message : String(error)}`);
    }
    

    

})



