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
    private io: SocketServer;
    private httpServer: httpServer;
    public rooms: Room[] = [];
    public options: Options;
    constructor() {
        this.httpServer = createServer()
        this.io = new SocketServer(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
              }
        });

        this.io.on('connection', (socket: Socket) => {
            console.log(`Device ${socket.id} has connected to the server`)
            socket.emit("status","Connection recieved");
            socket.emit("available rooms",this.rooms);
            // handlers
            socket.on('join room',(id: string) => (handleJoinRoom(this,socket, id)));
            socket.on('play song', (room_id: string, song_id: string) => { handlePlaySong(this, socket, room_id, song_id)})
            socket.on('upload song', (room_id: string, blob: Blob) => {handleUploadSong(this,socket,room_id, blob)})
            socket.on('get songs', (room_id: string) => {handleGetSongs(this,socket,room_id)})
            socket.on('disconnect', () => {handleDisconnect(this,socket)})
        });
    }
    createRoom(name: string, song_dir: string) {
        const room = new Room(name)
        room.addSongDir(song_dir)
        this.rooms.push(room)
    }
    start() {
        this.httpServer.listen(3000)
        console.log("VaultTune server running on port 3000")
    }

}


