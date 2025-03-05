import { Socket } from "socket.io";
import { Room } from "../classes/room";
import { Server } from "../classes/server";

export function handleJoinRoom(t: Server, socket: Socket, id: string) {
    console.log(`Device ${socket.id} is attempting to join room ${id}`)
    const room: Room | undefined = t.rooms.find(room => room.id === id);
    if (room) {
        room.addMember(socket);
        t.io.to(room.id).emit("new device",`Device ${socket.id} is joining this room`);
        socket.emit("status", "Joined room " + room.name);
        socket.emit("songs",room.songs.map(song => {
            return song.exportSong()
        }
        ));
        socket.emit("playlists",room.playlists);
    } else {
        console.error(`Room ${id} does not exist`)
        socket.emit("error", "Room not found");
    }
    return
}