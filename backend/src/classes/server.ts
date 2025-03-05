import { Server as SocketServer, Socket } from "socket.io";
import { Room } from "./room";
import { handleUploadSong } from "../helpers/handle_upload_song";
import { handleJoinRoom } from "../helpers/handle_join_room";
import { handlePlaySong } from "../helpers/handle_play_song";
import { Options } from "../types";
import { handleGetSongs } from "../helpers/handle_get_songs";
import { createServer, Server as httpServer } from "http";
import { handleDisconnect } from "../helpers/handle_disconnect";

export class Server {
    public io: SocketServer;
    private httpServer: httpServer;
    public rooms: Room[] = [];
    public options: Options;
    constructor() {
        this.httpServer = createServer()
        this.io = new SocketServer(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            maxHttpBufferSize: 1e8
        });

        this.io.on('connection', (socket: Socket) => {
            console.log(`Device ${socket.id} has connected to the server`)
            socket.emit("status","Connection recieved");
            socket.emit("available rooms",this.getRooms());
            // handlers
            socket.on('join room',(id: string) => (handleJoinRoom(this,socket, id)));
            socket.on('play song', (room_id: string, song_id: string) => { handlePlaySong(this, socket, room_id, song_id)})
            socket.on('upload song', (room_id: string, buf: ArrayBuffer) => {handleUploadSong(this,socket,room_id,buf)})
            socket.on('get songs', (room_id: string) => {handleGetSongs(this,socket,room_id)})
            socket.on('disconnect', () => {handleDisconnect(this,socket)})
        });
    }
    async createRoom(name: string, song_dir: string) {
        console.log(`Creating room ${name}`)
        const room = new Room(name)
        const status = await room.addSongDir(song_dir)
        if(!status.success) console.error(`Error adding song directory to room. Room will still be created.\nError:${status.error}`)
        this.rooms.push(room)
    }
    start() {
        this.httpServer.listen(3000)
        console.log("VaultTune server running on port 3000")
    }
    stop() {
        this.io.close()
        this.httpServer.close()
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


