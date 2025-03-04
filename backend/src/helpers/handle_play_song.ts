import { Socket } from "socket.io";
import { Room } from "../classes/room";
import { Server } from "../classes/server";
import { Song } from "../classes/song";

export function handlePlaySong(t: Server, socket: Socket, room_id: string, song_id: string) {
    const room: Room | undefined = t.rooms.find((element) => element.id === room_id);
    if (room === undefined) {
        socket.emit("error","Room not found");
        return;
    }
    const members = room!.getMembers();
    if (members.find(member => member.id === socket.id) === undefined) {
        socket.emit("error","User has not joined this room");
        return;
    }
    const song = room.songs.find((element: Song) => element.id === song_id);
    if (song === undefined) {
        socket.emit("error","This song does not exist");
    }
    socket.emit("song info", song);
    socket.emit("song data", song!.getBuffer());
}


