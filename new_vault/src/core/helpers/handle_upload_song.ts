import { Socket } from "socket.io";
import type Server from "../classes/server.ts";
import Song from "../classes/song.ts";
import { SongStatus } from "../../types/server_types.ts";
export async function handleUploadSong(t: Server, socket: Socket, buf: Buffer, metadata?: any) {
    t.logger.info(`Device ${socket.id} is attempting to upload a song`)
    const path = t.options.song_dir
    if (!path) {
        t.logger.error("Song upload failed: No song directory configured");
        socket.emit("error","Song upload failed: Internal error");
        return;
    }
    if (!buf || buf.length === 0) {
        t.logger.error("Song upload failed: No data received");
        socket.emit("error","Song upload failed: No data received")
        return;
    }
    
    try {
        const song = await Song.create(SongStatus.UPLOADED,buf,{path, metadata})
        t.database.addSong(song);
        t.logger.info("Song successfully uploaded! Song id:" + song.id)
        socket.emit("status","Song successfully uploaded")
        t.io.emit("songs", t.database.getAllSongs());
    } catch (error) {
        t.logger.error("Song upload failed: " + ((error instanceof Error) ? error.stack : String(error)));
        socket.emit("error","Song upload failed: " + ((error instanceof Error) ? error.message : String(error)));
    }
    
}