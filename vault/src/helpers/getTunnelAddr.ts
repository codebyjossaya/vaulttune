import { spawn } from "child_process";
import localtunnel from "localtunnel";
import Server from "../classes/server"
import nodessh from "node-ssh"
import ssh2 from "ssh2"
import { Tunnel } from "cloudflared";
export function getTunnelAddr(t: Server, port: number): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            t.tunnel = Tunnel.quick("http://localhost:" + port);
            t.tunnel.on("error", (error: any) => {
                console.error("Tunnel error:", error);
            });
            t.tunnel.on("exit", () => {
                console.log("Tunnel exited");
                console.log("Attempting to reconnect...");
                t.tunnel = null;
                t.start(true);
            });
            t.tunnel.on("url", (url: string) => {
                console.log("Tunnel URL:", url);
                resolve(url);
                t.address = url;
            });
        } catch (error) {
            console.error("There was an error creating a tunnel: ", error);
            reject(error);
        }
        console.log("Connecting to localtunnel...");
    })
}