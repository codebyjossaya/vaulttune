import { spawn } from "child_process";
import Server from "../classes/server"

export function getTunnelAddr(t: Server): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log("Spawning serveo..")
        t.serveo = spawn('ssh', ['-o', 'StrictHostKeyChecking=accept-new','-tt', '-R', '80:localhost:3000', 'serveo.net'],) // add -tt for pseudo-tty
        t.serveo.stdout.on('data', (data: Buffer) => {
            const output = data.toString();
            if(output.includes("Are you sure you want to continue connecting")) {
                t.serveo.stdin.write("yes\n", (error) => {
                    if (error) {
                        console.error("There was an error creating a tunnel: ", error);
                        reject(error)
                    }
                })
            }
            if(output.includes("Forwarding HTTP traffic from")) {
                const match = output.match(/https:\/\/([a-zA-Z0-9-]+)\.serveo\.net/);
                if (match) {
                    const url = match[0];
                    resolve(url);
                }
            }
        });

        t.serveo.stderr.on('data', (error) => {
            console.error(`Serveo error: ${error}`);
        });

        t.serveo.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Serveo process exited with code ${code}`));
            }
        });
    })
}