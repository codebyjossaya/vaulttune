import Playlist from "../../classes/playlist.ts";
import Server from "../../classes/server.ts";
import { ConnectedUser } from "../../../types/server_types.ts";

export default function handleCreatePlaylist(server: Server, socket: ConnectedUser, name: string, song_ids: string[]) {
    server.logger.info(`User ${socket.id} is creating a playlist named ${name} with songs: ${song_ids.join(", ")}`);
    const playlist = new Playlist(name);
    for (const song_id of song_ids) {
        const song = server.data.songs.find(s => s.id === song_id);
        if (song) {
            playlist.addSong(song);
        } else {
            server.logger.warn(`Song with ID ${song_id} not found while creating playlist ${name}`);
        }
    }
    server.data.playlists.push(playlist);
    socket.emit("playlists", server.data.playlists);
    server.logger.info(`Playlist ${name} created successfully with ${playlist.songs.length} songs.`);
}