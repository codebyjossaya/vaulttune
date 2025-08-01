import { Socket } from "socket.io/dist";
import Room from "../classes/room";
import Server from "../classes/server";
export function handleExportRoom(t: Server, socket: Socket, room_id: string) {
    const room: Room | undefined = t.rooms.find((element) => element.id === room_id);
    if (room === undefined) {
        socket.emit("error", "Export error: Room not found");
        return;
    }
    const members: Socket[] = room.getMembers();
    if (members.find(member => member.id === socket.id) === undefined) {
        socket.emit("error", "User has not joined this room");
        return;
    }
    room.export();
    socket.emit("status", "Room settings exported successfully");
}