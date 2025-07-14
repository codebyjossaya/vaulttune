import { spawn } from "child_process";
import localtunnel from "localtunnel";
import Server from "../classes/server"

export function getTunnelAddr(t: Server): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            t.tunnel = await localtunnel({ port: 3000})
            t.address = t.tunnel.url;
            resolve(t.address);
        } catch (error) {
            console.error("There was an error creating a tunnel: ", error);
            reject(error);
        }
        console.log("Connecting to localtunnel...");
    })
}