import Server from "../../classes/server.ts";
import { ConnectedUser } from "../../../types/server_types.ts";
export default function handleSeekSong(server: Server, socket: ConnectedUser, position: number) {
    const sle = server.sles.get(socket.data.sle || "");
    if (sle) {
        if (!sle.users.get(socket.id)) {
            socket.emit("error", `You are not in SLE ${sle.id}.`);
            server.logger.warn(`User ${socket.id} attempted to seek in SLE ${sle.id} but is not a member.`);
            return;
        }
        if (sle.isPlaying && sle.currentSong) {
            sle.users.forEach(user => {
                if (user.id === socket.id) return;
                user.emit("sle seek", {
                    song: sle.currentSong,
                    position: position
                });
            });
            server.logger.info(`User ${socket.id} seeked to ${position}ms in SLE ${sle.id}`);
        } else {
            socket.emit("error", `No song is currently playing in SLE ${sle.id}.`);
            server.logger.warn(`User ${socket.id} attempted to seek in SLE ${sle.id} but no song is playing.`);
        }
    }
}