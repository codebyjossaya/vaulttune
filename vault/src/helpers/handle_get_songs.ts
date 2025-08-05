import { Socket } from "socket.io";
import Server from "../classes/server";
import Room from "../classes/room";

export function handleGetSongs(t: Server, socket: Socket, room_id: string, offset: number, limit: number) {
    console.log(`Device ${socket.id} is requesting songs from room ${room_id} with offset ${offset} and limit ${limit}`);
    const room: Room | undefined = t.rooms.find((element) => element.id === room_id);
    if (room === undefined) {
        socket.emit("error","Room not found");
        console.error(`Room with ID ${room_id} not found for device ${socket.id}`);
        return;
    }
    const songs = room.exportSongs();
    if (offset < 0 || limit <= 0 || offset >= songs.length) {
        socket.emit("error", "Invalid offset or limit");
        console.error(`Invalid offset ${offset} or limit ${limit} for device ${socket.id}`);
        return;
    }
    if (offset + limit > songs.length) {
        limit = songs.length - offset; // Adjust limit if it exceeds the number of available songs
    }
    socket.emit("songs", songs.length, offset, limit, songs.slice(offset, offset + limit));
    console.log(`Emitted ${songs.length} songs to device ${socket.id} with offset ${offset} and limit ${limit}`);
    socket.emit("playlists",room.playlists);
}