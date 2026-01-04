import Server from "../../classes/server.ts";
import Song from "../../classes/song.ts";
import { ConnectedUser } from "../../../types/server_types.ts";

export default function handleSongDataReady(server: Server, socket: ConnectedUser, user_song: Song, iOSMode: boolean = false) {
    try {
        const song = server.database.getSong(user_song.id);
    if (!song) {
        server.logger.warn(`Song ${song.path} not found in server data.`);
        socket.emit("error", `Song not found in server.`);
        return;
    }
    
    song.getBuffer().then((buf) => {
        if (buf === null) {
            socket.emit("error", "server song is not available for playback");
            console.error(`Song with ID ${song.id} is not available for playback`);
            return;
        }
        let chunkSize = (buf.byteLength / song.duration) * 0.5;
        const total_chunks = Math.ceil(buf.byteLength / chunkSize);
        let offset = 0;
        let chunk_counter = 0;
        server.logger.info(`Device ${socket.id} is ready to receive song data for ${song.id}`);

        const sendChunk = () => {
            if (song.path.includes(".m4a") || iOSMode) {
                server.logger.info("iOS device or m4a file detected, adjusting chunk size for m4a playback");
                chunkSize = buf.byteLength; // minimum chunk size for m4a files to avoid playback issues
            }
            if (offset < buf.byteLength) {
                const remainingSize = buf.byteLength - offset;
                if (remainingSize < chunkSize) chunkSize = remainingSize
                const chunk = buf.slice(offset, Math.min(offset + chunkSize, buf.byteLength));
                socket.emit(`song data ${song.id}`, {buffer: chunk, chunk_counter});
                offset += chunkSize;
                chunk_counter += 1;
                console.log(`Sending chunk ${chunk_counter} out of ${total_chunks} of song ${song.id}`);
                server.stoppers.set(`${socket.id}-${song.id}`, setTimeout(sendChunk, 10)); // Use setTimeout to avoid blocking the event loop
            } else {
                console.log("Finished sending song data");
                socket.emit("song data end", song.id);
            }
        };

        sendChunk();
    });
    } catch (error) {
       server.logger.error(`Error in handleSongDataReady: ${error}`);
        socket.emit("error", "An error occurred while preparing song data."); 
    }
    
}