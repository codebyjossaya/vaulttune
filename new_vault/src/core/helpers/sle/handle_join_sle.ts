import Server from "../../classes/server.ts";
import { ConnectedUser } from "../../../types/server_types.ts";
export default function handleJoinSLE(server: Server, socket: ConnectedUser, sle_id: string) {
    const sle = server.sles.get(sle_id);
    if (sle) {
        sle.users.set(socket.id, socket);
        socket.data.sle = sle_id;
        server.io.emit("sle changed", sle.export());
        server.logger.info(`User ${socket.id} joined SLE ${sle_id}`);
    } else {
        socket.emit("error", `SLE ${sle_id} not found.`);
        server.logger.warn(`User ${socket.id} attempted to join non-existent SLE ${sle_id}`);
    }
}