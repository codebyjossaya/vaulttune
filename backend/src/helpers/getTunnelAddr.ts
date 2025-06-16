import { spawn } from "child_process";
import Server from "../classes/server"

export function getTunnelAddr(t: Server): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log("Spawning serveo..")
        t.serveo = spawn('ssh', ['-R', '80:localhost:3000', 'serveo.net'])
        t.serveo.stdout.on('data', (data: string) => {
            if(data.includes("Are you sure you want to continue connecting")) {
                t.serveo.stdin.write("yes", (error) => {
                    if (error) {
                        console.error("There was an error creating a tunnel: ", error);
                        reject(error)
                    }
                })
            }
            if(data.includes("Forwarding HTTP traffic from")) {
                const match = data.toString().match(/https:\/\/([a-zA-Z0-9-]+)\.serveo\.net/);
                if (match) {
                    const url = match[0];
                    resolve(url);
                }
            }
        });
        
        // t.serveo.stderr.on('data', (error) => {throw new Error(`Failed to connect to Serveo: ${error}`)})
    })
}