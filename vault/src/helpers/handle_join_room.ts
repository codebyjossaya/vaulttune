import Room from "../classes/room";
import Server from "../classes/server";
import { ConnectedUser } from "../interfaces/types";

export function handleJoinRoom(t: Server, socket: ConnectedUser, id: string, state?: true) {
    console.log(`Device ${socket.id} is attempting to join room ${id}`)
    const room: Room | undefined = t.rooms.find(room => room.id === id);
    if (room) {
        room.addMember(socket);
        t.io.to(room.id).emit("new device",`Device ${socket.id} is joining this room`);
        socket.emit("status", "Joined room " + room.id);
        if (state) {
            console.log(`Device ${socket.id} has a persistent state`);
            return;
        }
        setTimeout(() => {
            socket.emit("songs", room.songs.length, 0, (room.songs.length > 20 ? 20 : 0), room.exportSongs().slice(0, 20));
            console.log(`Emitted ${room.songs.length > 20 ? "first 20 songs" : "all songs"} to device ${socket.id}`);
        }, 1000);
        setTimeout(() => {
            socket.emit("playlists",room.playlists);
            console.log(`Emitted ${room.playlists.length} playlists to device ${socket.id}`);
        }, 2000);
    } else {
        console.error(`Room ${id} does not exist`)
        socket.emit("error", "Room not found");
    }
    return
}