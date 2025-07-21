import { Socket } from "socket.io/dist";
import Server from "../classes/server";

export function handleGetPlaylists(t: Server, socket: Socket, room_id: string) {
    const room = t.rooms.find(room => room.id === room_id);
     if (room === undefined) {
        socket.emit("error","Room not found");
        return;
    }
    const playlists = [];
    for (const playlist of room.playlists) {
        playlists.push(playlist.exportPlaylist())
    }
    socket.emit("playlists", playlists)
    
}