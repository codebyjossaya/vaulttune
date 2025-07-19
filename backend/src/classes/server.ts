import { Server as SocketServer, Socket } from "socket.io";
import Room from "./room";
import { handleUploadSong } from "../helpers/handle_upload_song";
import { handleJoinRoom } from "../helpers/handle_join_room";
import { handlePlaySong } from "../helpers/handle_play_song";
import { Options, ServerOptions } from "../interfaces/types";
import { handleGetSongs } from "../helpers/handle_get_songs";
import { createServer, Server as httpServer } from "http";
import { handleDisconnect } from "../helpers/handle_disconnect";
import { handleLeaveRoom } from "../helpers/handle_leave_room";
import { handleiOSPlaySong } from "../helpers/handle_play_song_ios";
import express, {Express} from 'express';
import { getTunnelAddr } from "../helpers/getTunnelAddr";
import { ChildProcessWithoutNullStreams } from "child_process";
import { handleCreatePlaylist } from "../helpers/handleCreatePlaylist";
import { handleGetPlaylists } from "../helpers/handle_get_playlists";
import { handleExportRoom } from "../helpers/handle_export_room";
import { Client } from "discord-rpc";
import { initializeRPC } from "../helpers/discordRichPresence";
import { auth } from "../helpers/vtAuth";
import { registerVault } from "../helpers/registerVault";
import cors from 'cors';
import type * as localtunnel from "localtunnel";
import updateVaultStatus from "../helpers/updateVaultStatus";

export default class Server {
    public io: SocketServer;
    public app: Express;
    public httpServer: httpServer;
    public rooms: Room[] = [];
    public tunnel: localtunnel.Tunnel | undefined;
    public options: ServerOptions;
    public address: string;
    public rpc: Client | undefined;

    constructor(options: ServerOptions = {network: true, name: 'Untitled Vault', api: 'https://api.jcamille.tech/vaulttune'}) {
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
    async createRoom(name: string, song_dir: string): Promise<Room> {
        console.log(`Creating room ${name}`);
        const room = new Room(name);
        const status = await room.addSongDir(song_dir);
        if(!status.success) console.error(`Error adding song directory to room. Room will still be created.\nError:${status.error}`);
        this.rooms.push(room);  
        return room;
    }
    attachRoom (room: Room): void {
        console.log(`Attaching room ${room.name} to the server`);
        this.rooms.push(room);
    }

    async start() {

        console.log("Starting Vault...");
        console.log("Vault server running on port 3000");
        this.httpServer.listen(3000);
        console.log("Authenticating with Vault servers...");
        await auth(this);
        console.log("Obtaining tunnel address...");
        if(this.options.network) {
            this.address = await getTunnelAddr(this)
            console.log("This Vault's address: ", this.address);
        }
        console.log("Registering this Vault with VaultTune servers...");
        await registerVault(this);
        console.log("Appearing online on VaultTune servers...");
        await updateVaultStatus(this,"online");

        console.log("Initializing Discord Rich Presence");
        this.rpc = initializeRPC();
        
        
    }
    
    stop(error: boolean = false) {
        return new Promise<void>(async (resolve, reject) => {
            console.log("Stopping Vault...");
            this.options.token ? updateVaultStatus(this, error ? "error" : "offline").catch(reject).finally(() => {
                if (this.tunnel) {
                    console.log("Closing localtunnel...");
                    this.tunnel.close();
                }
                if (this.rpc) {
                    console.log("Closing Discord Rich Presence...");
                    this.rpc.destroy();
                }
                this.httpServer.close(() => {
                    console.log("VaultTune server stopped successfully");
                });
                resolve();
            }): null;
            this.io.close();
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

}


