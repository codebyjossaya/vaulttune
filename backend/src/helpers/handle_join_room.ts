import { Socket } from "socket.io";
import { Room } from "../classes/room";
import { Server } from "../classes/server";

export function handleJoinRoom(t: Server, socket: Socket, id: string) {
    const room: Room | undefined = t.rooms.find(room => room.id === id);
    if (room) {
        room.addMember(socket);
        this.io.to(room.id).emit("new device",`Device ${socket.id} is joining this room`);
        socket.emit("status", "Joined room " + room.name);
        socket.emit("songs",room.songs);
        socket.emit("playlists",room.playlists);
    } else {
        socket.emit("error", "Room not found");
    }
    return
}