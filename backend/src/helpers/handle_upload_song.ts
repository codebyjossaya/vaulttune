import { Socket } from "socket.io";
import { Server } from "../classes/server";
import { Room } from "../classes/room";
import { Song } from "../classes/song";
import { SongStatus } from "../types";
export async function handleUploadSong(t: Server, socket: Socket, room_id: string, blob: Blob) {
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
    let path: string;
    if (room.dirs.length < 1) path = `${__dirname}/../../songs/`;
    else path = room.dirs[0]
    const song = await Song.create(SongStatus.UPLOADED,blob,{path: path})
    room.songs.push(song)
    socket.emit("status","Song successfully uploaded")
}