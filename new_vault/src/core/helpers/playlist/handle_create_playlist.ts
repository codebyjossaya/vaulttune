import Playlist from "../../classes/playlist.ts";
import Server from "../../classes/server.ts";
import { ConnectedUser } from "../../../types/server_types.ts";

export default function handleCreatePlaylist(server: Server, socket: ConnectedUser, name: string, song_ids: string[], playlist_id?: string) {
    console.log(song_ids);
    if (!name || !song_ids || !(typeof song_ids === "object") ||song_ids.length === 0) {
        server.logger.warn(`User ${socket.id} attempted to create a playlist with invalid data.`);
        return;
    }
    server.logger.info(`User ${socket.id} is ${playlist_id ? "editing" : "creating"} a playlist named ${name} with songs: ${song_ids.join(", ")}`);
    const playlist = new Playlist(name);
    playlist.id = playlist_id || playlist.id;
    for (const song_id of song_ids) {
        const song = server.database.getSong(song_id);
        if (song) {
            playlist.addSong(song);
        } else {
            server.logger.warn(`Song with ID ${song_id} not found while creating playlist ${name}`);
        }
    }
    const exists = server.database.getPlaylist(playlist.id);
    if (exists) {
        server.database.removePlaylist(playlist.id);
    }
    server.database.addPlaylist(playlist);
    socket.emit("playlists", server.database.getAllPlaylists());
    server.logger.info(`Playlist ${name} created successfully with ${playlist.songs.length} songs.`);
}