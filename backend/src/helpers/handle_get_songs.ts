import { Socket } from "socket.io";
import { Server } from "../classes/server";
import { Room } from "../classes/room";

export function handleGetSongs(t: Server, socket: Socket, room_id: string) {
    const room: Room | undefined = this.rooms.find(room => room.id === room_id);
    const members = room!.getMembers();
    if (members.find(member => member.id === socket.id) === undefined) {
        socket.emit("error","User has not joined this room")
        return
    }
    if (room === undefined) {
        socket.emit("Room not found");
        return;
    }
    socket.emit("songs",room.songs);
    socket.emit("playlists",room.playlists);
}