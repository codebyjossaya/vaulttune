import Server from "../../classes/server.ts";
import { ConnectedUser } from "../../../types/server_types.ts";
export default function handleLeaveSLE(server: Server, socket: ConnectedUser) {
    const sle = server.sles.get(socket.data.sle || "");
    if (sle) {
        sle.users.delete(socket.id);
        server.logger.info(`User ${socket.id} left SLE ${sle.id}`);
        if (sle.users.size === 0) {
            server.sles.delete(sle.id);
            server.logger.info(`SLE ${sle.id} deleted due to no users remaining.`);
        }
        socket.data.sle = null;
        server.io.emit("sle changed", sle.export());
        socket.emit("sles", Array.from(server.sles.values()).map(sle => sle.export()));
    } else {
        socket.emit("error", `You are not in a SLE.`);
        server.logger.warn(`User ${socket.id} attempted to leave a SLE but was not in one.`);
    }
}