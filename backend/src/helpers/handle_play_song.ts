import { Socket } from "socket.io";
import Room from "../classes/room";
import Server from "../classes/server";
import Song from "../classes/song";

export function handlePlaySong(t: Server, socket: Socket, room_id: string, song_id: string) {
    
    console.log(`Device ${socket.id} is requesting song ${song_id} from room ${room_id}`)
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
    // add in compression
    const buf = song!.getBuffer();
    let offset = 0;
    const chunkSize = (buf.byteLength / song.metadata.format.duration) * 5
    socket.emit("status","playing song")
    socket.emit("song data start",song.exportSong())

    const sendSongData = () => {
        while(offset < buf.byteLength) {
            socket.emit("song data", buf.slice(offset, offset + chunkSize));
            offset += chunkSize
        }
        console.log("Finished sending song data")
        socket.emit("song data end")
        socket.off('song data ready',sendSongData)
    }
    socket.removeAllListeners('song data ready');
    socket.on('song data ready', sendSongData);
    
    
}


