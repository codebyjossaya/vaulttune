import { Server as SocketServer, Socket } from "socket.io";
import Room from "./room";
import { handleUploadSong } from "../helpers/handle_upload_song";
import { handleJoinRoom } from "../helpers/handle_join_room";
import { handlePlaySong } from "../helpers/handle_play_song";
import { Options } from "../interfaces/types";
import { handleGetSongs } from "../helpers/handle_get_songs";
import { createServer, Server as httpServer } from "http";
import { handleDisconnect } from "../helpers/handle_disconnect";
import { handleLeaveRoom } from "../helpers/handle_leave_room";
import { handleiOSPlaySong } from "../helpers/handle_play_song_ios";
import express, {Express} from 'express';
import { getTunnelAddr } from "../helpers/getTunnelAddr";
import { ChildProcessWithoutNullStreams } from "child_process";

export default class Server {
    public io: SocketServer;
    public app: Express;
    public httpServer: httpServer;
    public rooms: Room[] = [];
    public serveo: ChildProcessWithoutNullStreams;
    public options: Options;
    public address: string;
    public network: boolean | undefined;
    constructor({ network = true }: { network?: boolean } = {}) {
        this.network = network
        this.app = express()
        this.httpServer = createServer(this.app)

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
            socket.on('get rooms', () => socket.emit("available rooms",this.getRooms()));
            socket.on('leave room', (room_id) => {handleLeaveRoom(this,socket,room_id)})
            // handlers
            socket.on('join room',(id: string) => (handleJoinRoom(this,socket, id)));
            socket.on('play song', (room_id: string, song_id: string) => { handlePlaySong(this, socket, room_id, song_id)})
            // add a cancel play song listener
            socket.on('play song - iOS', (room_id: string, song_id: string) => handleiOSPlaySong(this, socket, room_id, song_id))
            socket.on('upload song', (room_id: string, buf: ArrayBuffer) => {handleUploadSong(this,socket,room_id,buf)})
            socket.on('get songs', (room_id: string) => {handleGetSongs(this,socket,room_id)})
            socket.on('disconnect', () => {handleDisconnect(this,socket)})
        });
    }
    async createRoom(name: string, song_dir: string): Promise<Room> {
        console.log(`Creating room ${name}`)
        const room = new Room(name)
        const status = await room.addSongDir(song_dir)
        if(!status.success) console.error(`Error adding song directory to room. Room will still be created.\nError:${status.error}`)
        this.rooms.push(room)
        return room;
    }
    async start() {
        
        console.log("VaultTune server running on port 3000");
        this.httpServer.listen(3000)
        if(this.network) {
            this.address = await getTunnelAddr(this)
            console.log("This Vault's address: ", this.address);
        }
        
        
    }
    
    stop() {
        this.io.close();
        this.httpServer.close();
        this.serveo.kill();
        console.log("VaultTune server has stopped running")
    }
    getRooms() {
        return this.rooms.map(room => {
            return {
                name: room.name,
                id: room.id,
            }
        })
    }

}


