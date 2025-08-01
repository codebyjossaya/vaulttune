import { spawn } from "child_process";
import localtunnel from "localtunnel";
import Server from "../classes/server"

export function getTunnelAddr(t: Server, port: number): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            localtunnel({ port }).then((tunnel) => {
                console.log("Tunnel created successfully");
                t.tunnel = tunnel;
                t.address = t.tunnel.url;
                resolve(tunnel.url);
            }).catch((error) => {
                if (error.message.includes("connection refused")) {
                    console.error("Error creating tunnel, retrying in 5 seconds...");
                    setTimeout(() => {
                        getTunnelAddr(t, port).then(resolve).catch(reject);
                        return;
                    }, 5000); // Retry after 5 seconds
                } else throw error;
                
            });
        } catch (error) {
            console.error("There was an error creating a tunnel: ", error);
            reject(error);
        }
        console.log("Connecting to localtunnel...");
    })
}