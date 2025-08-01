import { Server as SocketServer, Socket } from "socket.io";
import Room from "./room";
import { handleUploadSong } from "../helpers/handle_upload_song";
import { handleJoinRoom } from "../helpers/handle_join_room";
import { ServerOptions, Options, User } from "../interfaces/types";
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
import type { UserRecord } from "firebase-admin/auth";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import type Song from "./song";
import type Playlist from "./playlist";
import keytar from "keytar";
import { ipcMain, app } from "electron";
import { homedir } from "os";


export default class Server {
    public io: SocketServer;
    public app: Express;
    public user: UserRecord | undefined;
    public httpServer: httpServer;
    public rooms: Room[] = [];
    public tunnel: localtunnel.Tunnel | undefined;
    public options: ServerOptions | Options;
    public address: string | null = null;
    public rpc: Client | null = null;
    public state: "online" | "offline" | "error" = "offline";
    public users: User[] = [];
    public stoppers: Map<string, NodeJS.Timeout> = new Map();
    public notify?: (message: string, type: "success" | "error" | "warning") => void;

    constructor(options: ServerOptions = {network: true, name: 'Untitled Vault', api: null, token: null}) {
        this.options = options;
        if (!this.options.api) {
            this.options.api = 'https://api.vaulttune.jcamille.dev'; //
            if (this.notify) this.notify("No API endpoint set. Using default: https://api.vaulttune.jcamille.dev", "warning");
            console.warn("No API endpoint set. Using default: https://api.vaulttune.jcamille.dev");
        }
        this.app = express();
        this.app.use(cors({
            origin: '*', // NOTE: Use specific origins in production!
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'bypass-tunnel-reminder'],
        }))
        this.httpServer = createServer(this.app);

        this.io = new SocketServer(this.httpServer, {
            transports: ['websocket', 'polling'],
            cors: {
                origin: "*",
                methods: ["GET", "POST","OPTIONS"],
                credentials: true,
                exposedHeaders: ["Access-Control-Allow-Origin", "Access-Control-Request-Headers"]
            },
            maxHttpBufferSize: 1e8
        });

        this.io.use((socket, next) => {
            console.log(`Device ${socket.id} is attempting to connect...`);
            if (this.notify) this.notify(`Device ${socket.id} is attempting to connect...`, "warning");
            fetch(`${this.options.api}/vaulttune/auth/vault/verifyUser`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({  user_token: socket.handshake.auth.token, 
                                        vault_token: this.options.token })
            }).then(response => {
                if (!response.ok) {
                    console.error(`Failed to verify user for device ${socket.id}: ${response.statusText}`);
                    socket.emit("error", "Failed to verify user");
                    return next(new Error("Failed to verify user"));
                }
                return response.json();
            }).then((data: { user: { uid: string, email: string, displayName: string, avatar: string } }) => {
                console.log(`Device ${socket.id} verified successfully. User: ${data.user}`);
                socket.data.firebase = data.user;
                next();
            }).catch(error => {
                console.error(`Error verifying user for device ${socket.id}:`, error);
                socket.emit("error", "Failed to verify user");
                next(new Error("Failed to verify user"));
            });
        });

        this.io.on('connection', (socket: User) => {
            console.log(`Device ${socket.id} has connected to the server`)
            this.notify(`${socket.data.firebase.displayName} has connected to the server (${socket.id})`, "success");
            socket.emit("status","Connection recieved");
            socket.on('get rooms', () => {
                console.log(`Device ${socket.id} requested available rooms`);
                socket.emit("available rooms",this.getRooms());
                console.log(`Sent available rooms to device ${socket.id}`);
            });
            socket.on('leave room', (room_id) => {handleLeaveRoom(this,socket,room_id)});
            // handlers
            socket.on('join room',(id: string) => (handleJoinRoom(this,socket, id)));

            socket.on('play song', (room_id: string, song_id: string) => {
                console.log(`Device ${socket.id} is requesting song ${song_id} from room ${room_id}`)

                const room: Room | undefined = this.rooms.find((element) => element.id === room_id);
                if (room === undefined) {
                    socket.emit("error","Room not found");
                    console.error(`Room with ID ${room_id} not found for device ${socket.id}`);
                    return;
                }
                console.log(`Room found: ${room.name}`);
                const members = room!.getMembers();
                if (members.find(member => member.id === socket.id) === undefined) {
                    socket.emit("error","User has not joined this room");
                    console.error(`Device ${socket.id} is not a member of room ${room_id}`);
                    return;
                }
                const song = room.songs.find((element: Song) => element.id === song_id);
                if (song === undefined) {
                    socket.emit("error","This song does not exist");
                    console.error(`Song with ID ${song_id} not found in room ${room_id} for device ${socket.id}`);
                }

                // add in compression
                const buf = song!.getBuffer();
                if (buf === null) {
                    socket.emit("error", "This song is not available for playback");
                    console.error(`Song with ID ${song_id} is not available for playback in room ${room_id} for device ${socket.id}`);
                    return;
                }
                if (this.rpc) {
                    this.rpc.setActivity({
                        details: `Playing ${song.metadata.common.title}`,
                        state: `by ${song.metadata.common.artist}`,
                        startTimestamp: new Date(),
                        instance: false,
                    })
                }

                let chunkSize = (buf.byteLength / song.metadata.format.duration) * 0.5;
                const total_chunks = Math.ceil(buf.byteLength / chunkSize);
                let timeoutId: NodeJS.Timeout | null = null;
                console.log(`Song: ${song.metadata.common.title} by ${song.metadata.common.artist} with a chunk size of ${chunkSize} and bytelength of ${buf.byteLength} making ${total_chunks} total chunks`);

                console.log("Exporting song data");
                const data = song.exportSong();
                data.path = null;

                console.log(`Sending song data start event for song ${song_id} to room ${room_id}`);
                this.io.to(room_id).emit("song data start",
                                        data,
                                        total_chunks, 
                                        {   name: socket.data.firebase?.displayName || "Unknown Device", 
                                            id: socket.id
                                        });
                
            });

            socket.on('song data ready', (room_id: string, song_id: string) => {
                console.log(`Device ${socket.id} is ready to receive song data for ${song_id}`);
                const room: Room | undefined = this.rooms.find((element) => element.id === room_id);
                
                if (room === undefined) {
                    socket.emit("error","Room not found");
                    console.error(`Room with ID ${room_id} not found for device ${socket.id}`);
                    return;
                }
                console.log(`Room found: ${room ? room.name : "not found"}`);
                const song = room.songs.find((element: Song) => element.id === song_id);
                if (song === undefined) {
                    socket.emit("error","This song does not exist");
                    return;
                }
                console.log(`Song found: ${song.metadata.common.title} by ${song.metadata.common.artist}`);
                const buf = song.getBuffer();
                let chunkSize = (buf.byteLength / song.metadata.format.duration) * 0.5;
                const total_chunks = Math.ceil(buf.byteLength / chunkSize);
                let offset = 0;
                let chunk_counter = 0;
                console.log(`Device ${socket.id} is ready to receive song data for ${song_id}`);

                const sendChunk = () => {
                    if (offset < buf.byteLength) {
                        const remainingSize = buf.byteLength - offset;
                        if (remainingSize < chunkSize) chunkSize = remainingSize
                        const chunk = buf.slice(offset, Math.min(offset + chunkSize, buf.byteLength));
                        socket.emit(`song data ${song_id}`, {buffer: chunk, chunk_counter});
                        offset += chunkSize;
                        chunk_counter += 1;
                        console.log(`Sending chunk ${chunk_counter} out of ${total_chunks} of song ${song_id}`);
                        this.stoppers.set(`${socket.id}-${song_id}`, setTimeout(sendChunk, 10)); // Use setTimeout to avoid blocking the event loop
                    } else {
                        console.log("Finished sending song data");
                        socket.emit("song data end");
                    }
                };

                sendChunk();
            });

            socket.on('stop song', (id: string) => {
                console.log(`Device ${socket.id} has requested to stop song ${id}`);
                const timeoutId = this.stoppers.get(`${socket.id}-${id}`);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    this.stoppers.delete(`${socket.id}-${id}`);
                } else {
                    socket.emit("error", "No song is currently playing on this device");
                    return;
                }
            });

            // add a cancel play song listener
            socket.on('song seeked', (room_id: string, time: number) => {
                console.log(`Device ${socket.id} has requested to seek song in room ${room_id} to ${time}`);
                const room: Room | undefined = this.rooms.find((element) => element.id === room_id);
                if (room === undefined) {
                    socket.emit("error","Room not found");
                    return;
                }
                socket.to(room_id).emit("song seeked", socket.id, time);
            });
            socket.on('song play', (room_id: string) => {
                console.log(`Device ${socket.id} has requested to play song in room ${room_id}`);
                const room: Room | undefined = this.rooms.find((element) => element.id === room_id);
                if (room === undefined) {
                    socket.emit("error","Room not found");
                    return;
                }
                socket.to(room_id).emit("song played", socket.id);
            });
            socket.on('song pause', (room_id: string) => {
                console.log(`Device ${socket.id} has requested to pause song in room ${room_id}`);
                const room: Room | undefined = this.rooms.find((element) => element.id === room_id);
                if (room === undefined) {
                    socket.emit("error","Room not found");
                    return;
                }
                socket.to(room_id).emit("song paused", socket.id);
            });
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
                app.quit();
                process.exit(0);
            }).catch((err) => {
                console.error("Error during shutdown:", err);
                app.quit();
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



    async start(retry: boolean = true) {
        this.options.token = await keytar.getPassword("vaulttune", "token");
        console.log("Starting Vault...");
        console.log("Generating a random port...");
        const port = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
        try {
            console.log("Vault server running on port ", port);
            this.httpServer.listen(port);
        } catch (error) {
            if (error.message.includes("EADDRINUSE")) {
                console.log("port already in use, trying to find another port...");
                this.start(); // Retry starting the server
                return;
            }
        }

        
        if(this.options.network) {
            console.log("Obtaining tunnel address...");
            this.address = await getTunnelAddr(this, port)
            if (this.tunnel) {
                this.tunnel.once('error', async (error: Error) => {
                    if (error.message.includes("connection refused")) {
                        try {
                            this.tunnel = null;
                            console.log("Tunnel connection refused. Retrying...");
                            this.notify?.("Tunnel connection refused. Retrying...", "warning");
                            
                            retry ? setTimeout(async () => await this.start(false), 5000) : null; // Retry starting the server
                            retry ? null : (() => {
                                throw new Error("Tunnel connection refused after retrying");
                            })();
                        } catch (err) {
                            console.error("Tunnel error:", error.message);
                            this.notify(`Tunnel error: ${error.message}`, "error");
                            this.state = "error";
                            console.error("Error restarting tunnel:", err);
                        }
                    }
                    
                });
            }
            console.log("This Vault's address: ", this.address);
        } else {
            await new Promise((resolve, reject) => {
                fetch("https://api.ipify.org?format=json").then(response => {
                    if (!response.ok) {
                        reject(new Error("Failed to fetch public IP address"));
                    }
                    return response.json();
                }).then((data: {ip: string}) => {
                    this.address = `http://${data.ip}:${port}`;
                    console.log("This Vault's address: ", this.address);
                    resolve(true);
                }).catch(error => {
                    console.error("Error fetching public IP address:", error);
                    reject(error);
                });
            });
        }
        console.log("Registering this Vault with VaultTune servers...");
        await this.register("online");
        console.log("VaultTune server started successfully");

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
                    this.address = null;
                    registerVault(this, "offline").then(() => {
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
                console.log("Saving server settings...");
                this.export().then(() => {
                    console.log("Server settings saved successfully.");
                    resolve();
                }).catch((err) => {
                    console.error("Error saving server settings:", err);
                });
                
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
            room.dirs.forEach((dir: string) => {
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
                    fetch(`${options.api}/vaulttune/auth/vault/addUser/`, {
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

    async register(status: "online" | "offline" = "offline") {
        try {
            return await registerVault(this, status);
        } catch (error) {
            console.error("Error registering vault:", error);
            throw error;
        }
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
        if (!existsSync(`${homedir()}/VaultTune/settings`)) {
            mkdirSync(`${homedir()}/VaultTune/settings`, { recursive: true });
        }
        writeFileSync(`${homedir()}/VaultTune/settings/server.json`, json);
        console.log("Server exported successfully to settings/server.json");
    }
    static async fromJSON(data: { user: UserRecord; options: ServerOptions; rooms: { songs: Song[]; playlists: Playlist[]; dirs: string[]; name: string; id: string; }[] }): Promise<Server> {
        console.log(data);
        const server = new Server(data.options);
        server.user = data.user;
        console.log("Loading rooms ...")
        server.rooms = await Promise.all(data.rooms.map(room => Room.fromJSON(room)));
        console.log("Server loaded successfully from JSON");
        return server;
    }

}


