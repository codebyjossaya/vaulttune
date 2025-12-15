import Server from "../../classes/server.ts";
import Song from "../../classes/song.ts";
import { ConnectedUser } from "../../../types/server_types.ts";
export default function handleStopSong(server: Server, socket: ConnectedUser, song: Song) {
    const sle = server.sles.get(socket.data.sle || "");
    if (sle) {
        sle.isPlaying = false;
        sle.currentSong = null;
        sle.timestamp = 0;
        sle.users.forEach(user => {
            if (user.id === socket.id) return; // skip sender
            server.stoppers.delete(`${user.id}-${song.id}`);
            user.emit("song data end");
        });
    }
    socket.emit("song data end");
    server.stoppers.delete(`${socket.id}-${song.id}`);
    server.logger.info(`User ${socket.id} stopped song ${song.id} ${sle ? `in SLE ${sle.id}` : ""}`);
}