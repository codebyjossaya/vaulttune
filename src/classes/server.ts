import { Server as SocketServer, Socket } from "socket.io";
import Room from "./room";
import { handleUploadSong } from "../helpers/handle_upload_song";
import { handleJoinRoom } from "../helpers/handle_join_room";
import { handlePlaySong } from "../helpers/handle_play_song";
import { ServerOptions, Options } from "../interfaces/types";
import { handleGetSongs } from "../helpers/handle_get_songs";
import { createServer, Server as httpServer } from "http";
import { handleDisconnect } from "../helpers/handle_disconnect";
import { handleLeaveRoom } from "../helpers/handle_leave_room";
import { handleiOSPlaySong } from "../helpers/handle_play_song_ios";
import express, {Express} from 'express';
import { getTunnelAddr } from "../helpers/getTunnelAddr";
import { handleCreatePlaylist } from "../helpers/handleCreatePlaylist";
import { handleGetPlaylists } from "../helpers/handle_get_playlists";
import { handleExportRoom } from "../helpers/handle_export_room";
import { Client } from "discord-rpc";
import { initializeRPC } from "../helpers/discordRichPresence";
import { registerVault } from "../helpers/registerVault";
import cors from 'cors';
import type * as localtunnel from "localtunnel";
import updateVaultStatus from "../helpers/updateVaultStatus";
import type { UserRecord } from "firebase-admin/auth";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import type Song from "./song";
import type Playlist from "./playlist";
import keytar from "keytar";
import { ipcMain } from "electron";


export default class Server {
    public io: SocketServer;
    public app: Express;
    public user: UserRecord | undefined;
    public httpServer: httpServer;
    public rooms: Room[] = [];
    public tunnel: localtunnel.Tunnel | undefined;
    public options: ServerOptions | Options;
    public address: string;
    public rpc: Client | undefined;
    public state: "online" | "offline" | "error" = "offline";

    constructor(options: ServerOptions = {network: true, name: 'Untitled Vault', api: 'https://api.jcamille.tech'}) {
        this.options = options;
        this.app = express();
        this.app.use(cors({
            origin: '*', // NOTE: Use specific origins in production!
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type']
        }))
        this.httpServer = createServer(this.app);

        this.io = new SocketServer(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true,
                exposedHeaders: ["Access-Control-Allow-Origin"]
            },
            maxHttpBufferSize: 1e8
        });

        this.io.on('connection', (socket: Socket) => {
            console.log(`Device ${socket.id} has connected to the server`)
            ipcMain.emit('device-connected', socket.id);
            socket.emit("status","Connection recieved");
            socket.on('get rooms', () => {
                console.log(`Device ${socket.id} requested available rooms`);
                socket.emit("available rooms",this.getRooms());
            });
            socket.on('leave room', (room_id) => {handleLeaveRoom(this,socket,room_id)});
            // handlers
            socket.on('join room',(id: string) => (handleJoinRoom(this,socket, id)));
            socket.on('play song', (room_id: string, song_id: string) => { handlePlaySong(this, socket, room_id, song_id)});
            // add a cancel play song listener1
            socket.on('play song - iOS', (room_id: string, song_id: string) => handleiOSPlaySong(this, socket, room_id, song_id));
            socket.on('upload song', (room_id: string, buf: ArrayBuffer) => {handleUploadSong(this,socket,room_id,buf)});
            socket.on('get songs', (room_id: string) => {handleGetSongs(this,socket,room_id)});
            socket.on('get playlists', (room_id: string) => {handleGetPlaylists(this,socket,room_id)});
            socket.on('create playlist', (room_id: string, name: string, song_ids: string[]) => handleCreatePlaylist(this,socket,room_id,name,song_ids));
            socket.on('disconnect', () => {handleDisconnect(this,socket)});
            socket.on('export room', (room_id: string) => {handleExportRoom(this, socket, room_id)});
        });

        process.on('SIGINT', () => {
            console.log("SIGINT received.");
            this.stop().then(() => {
                console.log("VaultTune server stopped successfully");
                process.exit(0);
            }).catch((err) => {
                console.error("Error during shutdown:", err);
                process.exit(1);
            });
        });
        process.on('SIGTERM', () => {
            console.log("SIGTERM received.");
            this.stop().then(() => {
                console.log("VaultTune server stopped successfully");
                process.exit(0);
            }).catch((err) => {
                console.error("Error during shutdown:", err);
                process.exit(1);
            });
        });
        process.on('uncaughtException', (error) => {
            console.error("Uncaught Exception: ", error);
            this.stop(true).then(() => {
                console.log("VaultTune server stopped successfully");
                process.exit(1);
            }).catch((err) => {
                console.error("Error during shutdown after uncaught exception:", err);
                process.exit(1);
            });
        });
    }
    async createRoom(name: string, song_dirs: string[]): Promise<Room> {
        console.log(`Creating room ${name}`);
        const room = new Room(name);
        for (const dir of song_dirs) {
            const status = await room.addSongDir(dir);
            if (!status.success) {
                console.error(`Error adding song directory to room. Room will still be created.\nError:${status.error}`);
            }
        }
        this.rooms.push(room);
        return room;
    }
    attachRoom (room: Room): void {
        console.log(`Attaching room ${room.name} to the server`);
        this.rooms.push(room);
    }

    error() {
        ipcMain.emit('server-error', 'An error occurred in the server');
    }

    async start() {
        this.options.token = await keytar.getPassword("vaulttune", "token");
        console.log("Starting Vault...");
        console.log("Generating a random port...");
        const port = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
        try {
            console.log("Vault server running on port ", port);
            this.httpServer.listen(port);
        } catch (error) {
            if (error instanceof Error && error.message.includes("EADDRINUSE")) {
                console.log("port already in use, trying to find another port...");
                this.start(); // Retry starting the server
                return;
            }
        }

        console.log("Obtaining tunnel address...");
        if(this.options.network) {
            this.address = await getTunnelAddr(this, port)
            this.tunnel.on('error', (error) => {
                console.error("Tunnel error:", error);
                this.state = "error";
                this.error();
            });
            console.log("This Vault's address: ", this.address);
        } else {
            await new Promise((resolve, reject) => {
                fetch("https://api.ipify.org?format=json").then(response => {
                    if (!response.ok) {
                        reject(new Error("Failed to fetch public IP address"));
                    }
                    return response.json();
                }).then(data => {
                    this.address = `http://${data.ip}:3000`;
                    console.log("This Vault's address: ", this.address);
                    resolve(true);
                }).catch(error => {
                    console.error("Error fetching public IP address:", error);
                    reject(error);
                });
            });
        }
        console.log("Registering this Vault with VaultTune servers...");
        await registerVault(this);
        console.log("Appearing online on VaultTune servers...");
        await updateVaultStatus(this,"online");

        console.log("Initializing Discord Rich Presence");
        this.rpc = await initializeRPC();
        
        
    }
    
    stop(error: boolean = false) {
        return new Promise<void>( (resolve, reject) => {
            try {
                console.log("Stopping Vault...");
                console.log(this.options.token ? "Vault token is set. Proceeding to update VaultTune status..." : "Vault token is not set. Skipping status update.");
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                if (this.options.token) {
                    updateVaultStatus(this, error ? "error" : "offline").then(() => {
                        console.log("VaultTune status updated successfully.");
                    }).catch((err) => {
                        console.error("Error updating VaultTune status:", err);
                    });
                }
                this.io.close();
                if (this.httpServer.listening) {
                    console.log("Closing HTTP server...");
                    this.httpServer.close((err) => {
                        if (err) {
                            console.error("Error closing HTTP server:", err);
                            reject(err);
                            return;
                        }
                        console.log("HTTP server closed.");
                    });
                }
                console.log("Closed server.");
                resolve();
            } catch (err) {
                console.error("Error stopping Vault:", err);
                reject(err);
            }
           
        });
       
    }
    getRooms() {
        return this.rooms.map(room => {
            return {
                name: room.name,
                id: room.id,
            }
        });
    }
    async setOptions(options: Options) {
        console.log("Setting server options:", options);
        options.rooms.forEach(room => {
            if (this.rooms.find(r => r.id === room.id)) {
                console.warn(`Room with ID ${room.id} already exists. Skipping.`);
                return;
            }
            const newRoom = new Room(room.name, room.id);
            room.dirs.forEach(dir => {
                newRoom.addSongDir(dir).catch(err => {
                    console.error(`Error adding song directory ${dir} to room ${newRoom.name}:`, err);
                });
            });
            this.rooms.push(newRoom);
            
         });
            

        options.rooms = null;
        const token = await keytar.getPassword("vaulttune", "token");
        this.options.token = token; // Ensure the token is set in options

        if (options.users) {
            for (const user of options.users) {
                if (user === this.user.email) {
                    console.log(`User ${user} is already registered in this Vault`);
                    continue;
                } else if (this.user.email === undefined) {
                    console.error("No user is authenticated in this Vault. Cannot add user to Vault.");
                    throw new Error("No user is authenticated in this Vault. Cannot add user to Vault.");
                } else if (user === "" || user === null) {
                    console.error("Invalid user email provided. Cannot add user to Vault.");
                    throw new Error("Invalid user email provided. Cannot add user to Vault.");
                } 

                
                await new Promise<void>((resolve, reject) => {
                    console.log({
                            user_email: user,
                            vault_token: token
                        })
                    fetch(`${this.options.api}/vaulttune/auth/vault/addUser/`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            user_email: user,
                            vault_token: token
                        })
                    }).then(response => {
                        if (!response.ok) {
                            reject(new Error("Failed to add user to Vault"));
                        }
                        return response.json();
                    }).then(() => {
                        console.log(`Request to add user ${user} successfully submitted`);
                        resolve();
                    }).catch(error => {
                        console.error(`Error submitting request to add user ${user} to Vault:`, error);
                        reject(error);
                    })
                });
            }   
            
        }

        options.users = null;
        options.token = this.options.token;
        console.log("current server api: ", options.api);
        this.options = {name: options.name || "Untitled Vault", network: options.network, api: options.api, token: options.token};
        console.log("Server options updated successfully:", this.options);
        
        return true;
    }
    async export() {
        const options = this.options;
        const optionsCopy = JSON.parse(JSON.stringify(options));
        delete optionsCopy.token; // Remove token from options copy before exporting
        const object = {
            user: this.user,
            options: optionsCopy,
            rooms: this.rooms.map(room => room.export())
        }
        const json = JSON.stringify(object, null, 2);
        if (!existsSync(`${process.env.HOME}/VaultTune/settings`)) {
            mkdirSync(`${process.env.HOME}/VaultTune/settings`, { recursive: true });
        }
        writeFileSync(`${process.env.HOME}/VaultTune/settings/server.json`, json);
        console.log("Server exported successfully to settings/server.json");
    }
    static async fromJSON(data: { user: UserRecord; options: ServerOptions; rooms: { songs: Song[]; playlists: Playlist[]; dirs: string[]; name: string; id: string; }[] }): Promise<Server> {
        console.log(data);
        const server = new Server(data.options);
        server.user = data.user;
        server.rooms = await Promise.all(data.rooms.map(room => Room.fromJSON(room)));
        console.log("Server loaded successfully from JSON");
        return server;
    }

}


