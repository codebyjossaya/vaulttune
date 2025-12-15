import Server from "../../classes/server.ts";
import Song from "../../classes/song.ts";
import { ConnectedUser } from "../../../types/server_types.ts";

export default async function handlePlaySong(server: Server, socket: ConnectedUser, received_song: Song) {
    const sle = server.sles.get(socket.data.sle || "");
    const song = server.data.songs.find(s => s.id === received_song.id);
    if (!song) {
        server.logger.warn(`Song with ID ${received_song.id} not found in server data.`);
        socket.emit("error", `Song not found in server.`);
        return;
    }
    const buf = await song!.getBuffer();
    if (buf === null) {
        socket.emit("error", "server song is not available for playback");
        console.error(`Song with ID ${song.id} is not available for playback`);
        return;
    }

    let chunkSize = (buf.byteLength / song.metadata.format.duration!) * 0.5;
    const total_chunks = Math.ceil(buf.byteLength / chunkSize);
    let timeoutId: NodeJS.Timeout | null = null;
    console.log(`Song: ${song.metadata.common.title} by ${song.metadata.common.artist} with a chunk size of ${chunkSize} and bytelength of ${buf.byteLength} making ${total_chunks} total chunks`);
    if (sle) {
        sle.currentSong = song;
        sle.isPlaying = true;
        sle.timestamp = 0;
        sle.users.forEach(user => {
            if (user.id === socket.id) return; // skip sender
            user.emit("song data start", 
                        song, 
                        total_chunks, 
                        { 
                        id: socket.id
                    });
        
        });
    }

    socket.emit("song data start", 
                        song, 
                        total_chunks, 
                        {
                            id: socket.id
                        });
        

}

