import { Socket } from "socket.io";
import Server from "../classes/server";
import Room from "../classes/room";
import Song from "../classes/song";
import { SongStatus } from "../interfaces/types";
export async function handleUploadSong(t: Server, socket: Socket, room_id: string, buf: ArrayBuffer) {
    console.log(`Device ${socket.id} is attempting to upload a song to ${room_id}`)
    const room: Room | undefined = t.rooms.find((element) => element.id === room_id);
    if (room === undefined) {
        socket.emit("error","Song upload error: Room not found");
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
    const blob = new Blob([buf])
    const song = await Song.create(SongStatus.UPLOADED,blob,{path: path})

    console.log("Song successfully uploaded! Song id:", song.id)
    socket.emit("status","Song successfully uploaded")
    socket.emit("songs", room.exportSongs())
}