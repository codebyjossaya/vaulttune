import Room from "../classes/room";
import Server from "../classes/server";
import { User } from "../interfaces/types";

export function handleJoinRoom(t: Server, socket: User, id: string) {
    console.log(`Device ${socket.id} is attempting to join room ${id}`)
    const room: Room | undefined = t.rooms.find(room => room.id === id);
    if (room) {
        room.addMember(socket);
        t.io.to(room.id).emit("new device",`Device ${socket.id} is joining this room`);
        socket.emit("status", "Joined room " + room.id);
        socket.emit("songs",room.songs.map(song => {
            return song.exportSong()
        }
        ));
        console.log("Emitted all songs to device " + socket.id);
        socket.emit("playlists",room.playlists);
        console.log("Emitted all playlists to device " + socket.id);
        console.log(room.playlists)
    } else {
        console.error(`Room ${id} does not exist`)
        socket.emit("error", "Room not found");
    }
    return
}