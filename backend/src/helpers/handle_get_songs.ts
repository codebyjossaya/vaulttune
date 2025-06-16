import { Socket } from "socket.io";
import Server from "../classes/server";
import Room from "../classes/room";

export function handleGetSongs(t: Server, socket: Socket, room_id: string) {
    console.log(`Device ${socket.id} requested list of songs from room id ${room_id}`)
    const room: Room | undefined = t.rooms.find((room: Room) => room.id === room_id);
    if (room === undefined) {
        socket.emit("Room not found");
        return;
    }
    const members = room!.getMembers();
    if (members.find(member => member.id === socket.id) === undefined) {
        socket.emit("error","User has not joined this room")
        return
    }
    
    socket.emit("songs",room.songs);
    socket.emit("playlists",room.playlists);
}