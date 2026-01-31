import { SLE, ConnectedUser } from "../../../types/server_types.ts";
import Server from "../../classes/server.ts";
export default function handleCreateSLE(server: Server, socket: ConnectedUser) {
    const sle_id = `sle_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newSLE = new SLE(sle_id);
    server.sles.set(sle_id, newSLE);
    newSLE.users.set(socket.id, socket);
    socket.data.sle = sle_id;
    const val = Array.from(server.sles.values()).map(sle => sle.export());
    server.io.emit("sles", val);
    socket.emit("sle created", newSLE.export());

    server.logger.info(`SLE ${sle_id} created by ${socket.id}`);
}